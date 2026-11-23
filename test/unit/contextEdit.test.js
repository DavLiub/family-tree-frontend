import {describe, expect, it, vi} from 'vitest'
import {
  loadContextObject,
  saveContextObject,
} from '../../src/components/contextEdit.js'

function state(record) {
  return {
    permissions: {canEdit: true},
    apiGet: vi.fn(async () => ({data: structuredClone(record)})),
    apiPut: vi.fn(async () => ({data: []})),
  }
}

describe('editing an existing linked record', () => {
  it('preserves fresh hidden fields and excludes derived fields', async () => {
    const record = {
      _class: 'Event',
      handle: 'fictional-event',
      description: 'Old description',
      citation_list: ['fictional-citation'],
      note_list: ['fictional-note'],
      private: true,
      profile: {date: 'display only'},
      backlinks: {},
      extended: {},
      formatted: {},
    }
    const appState = state(record)
    await saveContextObject(appState, 'events', record.handle, {
      description: 'Corrected description',
    })
    expect(appState.apiPut).toHaveBeenCalledWith(
      '/api/events/fictional-event',
      {
        _class: 'Event',
        handle: record.handle,
        description: 'Corrected description',
        citation_list: record.citation_list,
        note_list: record.note_list,
        private: true,
      }
    )
    expect(record.description).toBe('Old description')
  })

  it('applies a relationship change to the freshly read list', async () => {
    const appState = state({
      handle: 'fictional-family',
      child_ref_list: [
        {ref: 'fictional-child', frel: 'Birth', note_list: ['n']},
      ],
    })
    await saveContextObject(
      appState,
      'families',
      'fictional-family',
      fresh => ({
        child_ref_list: fresh.child_ref_list.map(ref => ({
          ...ref,
          frel: 'Adopted',
        })),
      })
    )
    expect(appState.apiPut.mock.calls[0][1].child_ref_list).toEqual([
      {ref: 'fictional-child', frel: 'Adopted', note_list: ['n']},
    ])
  })

  it('does not write after a failed read, mismatched identity, or denied permission', async () => {
    const appState = state({handle: 'different-record'})
    await expect(
      saveContextObject(appState, 'notes', 'fictional-note', {
        text: {string: 'x'},
      })
    ).rejects.toThrow('Record not found')
    appState.apiGet.mockResolvedValue({error: 'Synthetic read failure'})
    await expect(
      loadContextObject(appState, 'notes', 'fictional-note')
    ).rejects.toThrow('Synthetic read failure')
    appState.permissions.canEdit = false
    await expect(
      loadContextObject(appState, 'notes', 'fictional-note')
    ).rejects.toThrow('Editing is not allowed')
    expect(appState.apiPut).not.toHaveBeenCalled()
  })
})
