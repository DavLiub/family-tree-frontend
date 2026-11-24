import {describe, expect, it, vi} from 'vitest'
import {GrampsjsFormContextEvent} from '../../src/components/GrampsjsFormContextEvent.js'
import {GrampsjsFormContextNote} from '../../src/components/GrampsjsFormContextNote.js'
import {GrampsjsEvents} from '../../src/components/GrampsjsEvents.js'
import {GrampsjsEditor} from '../../src/components/GrampsjsEditor.js'

function state(record, apiPut) {
  return {
    permissions: {canEdit: true},
    i18n: {strings: {}, lang: 'en'},
    path: {page: 'person', pageId: 'TEST-I1'},
    apiGet: vi.fn(async () => ({data: structuredClone(record)})),
    apiPut,
  }
}

describe('context event and note updates', () => {
  it('never routes an embedded note save to the enclosing person', () => {
    const editor = new GrampsjsEditor()
    editor.localSave = true
    editor.data = {string: 'Synthetic note draft'}
    const actions = vi.fn()
    editor.addEventListener('edit:action', actions)
    editor._handleSaveButton()
    expect(actions).not.toHaveBeenCalled()
    expect(editor.data.string).toBe('Synthetic note draft')
  })
  it('presets a common event and reuses its identity when attachment is retried', () => {
    const events = new GrampsjsEvents()
    events.appState = {permissions: {canEdit: true}, i18n: {strings: {}}}
    events._handleAdd('Death')
    expect(events.dialogContent.values).toContain('Death')
    expect(events.dialogContent.values).toContainEqual({
      _class: 'Event',
      type: 'Death',
      role: 'Primary',
    })
    const actions = vi.fn()
    events.addEventListener('edit:action', actions)
    const complete = vi.fn()
    const input = () =>
      new CustomEvent('object:save', {
        detail: {data: {type: 'Death', role: 'Primary'}, complete},
      })
    events._handleNewEventSave(input())
    events._handleNewEventSave(input())
    expect(actions.mock.calls[0][0].detail.data.handle).toBe(
      actions.mock.calls[1][0].detail.data.handle
    )
    expect(actions.mock.calls[1][0].detail.complete).toBe(complete)
    expect(events.dialogContent).not.toBe('')
  })

  it('loads a timeline event before editing its structured date and place', async () => {
    const fresh = {
      handle: 'synthetic-timeline-event',
      date: {year: 1920},
      place: 'synthetic-place',
      description: 'Full record',
    }
    const events = new GrampsjsEvents()
    events.appState = state(fresh, vi.fn())
    await events._editEvent({
      handle: fresh.handle,
      description: 'Timeline label',
    })
    expect(events.appState.apiGet).toHaveBeenCalledWith(
      '/api/events/synthetic-timeline-event'
    )
    expect(events.dialogContent.values).toContainEqual({
      date: fresh.date,
      place: fresh.place,
      description: fresh.description,
    })
  })

  it('keeps event identity and unseen sources while retrying failed input', async () => {
    const original = {
      _class: 'Event',
      handle: 'synthetic-event',
      date: {year: 1900},
      place: 'old-place',
      description: 'old',
      citation_list: ['synthetic-citation'],
      note_list: ['synthetic-note'],
      profile: {date: '1900'},
    }
    const apiPut = vi
      .fn()
      .mockResolvedValueOnce({error: 'Synthetic write failure'})
      .mockResolvedValueOnce({data: {}})
    const form = new GrampsjsFormContextEvent()
    form.appState = state(original, apiPut)
    form.handle = original.handle
    const edited = {date: {year: 1901}, place: '', description: 'Revised'}
    form.data = edited
    const saved = vi.fn()
    form.addEventListener('object:saved', saved)
    await form._handleDialogSave()
    expect(form.errorMessage).toBe('Synthetic write failure')
    expect(form.data).toBe(edited)
    expect(saved).not.toHaveBeenCalled()
    await form._handleDialogSave()
    expect(saved).toHaveBeenCalledTimes(1)
    expect(apiPut).toHaveBeenLastCalledWith('/api/events/synthetic-event', {
      _class: 'Event',
      handle: original.handle,
      ...edited,
      citation_list: original.citation_list,
      note_list: original.note_list,
    })
  })

  it('saves styled note content from the editor without replacing the note', async () => {
    const original = {
      _class: 'Note',
      handle: 'synthetic-note',
      type: 'Person Note',
      private: true,
      tag_list: ['synthetic-tag'],
      text: {string: 'Original'},
    }
    const text = {string: 'Revised', tags: [{name: 'bold', ranges: [[0, 7]]}]}
    const apiPut = vi.fn(async () => ({data: {}}))
    const form = new GrampsjsFormContextNote()
    form.appState = state(original, apiPut)
    form.handle = original.handle
    form.data = {text: original.text}
    Object.defineProperty(form, 'renderRoot', {
      value: {querySelector: () => ({data: text})},
    })
    const saved = vi.fn()
    form.addEventListener('context:saved', saved)
    await form._handleDialogSave()
    expect(apiPut).toHaveBeenCalledWith('/api/notes/synthetic-note', {
      ...original,
      text,
    })
    expect(saved).toHaveBeenCalledTimes(1)
  })
})
