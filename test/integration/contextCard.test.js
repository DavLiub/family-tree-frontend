import {describe, expect, it, vi} from 'vitest'
import {GrampsjsViewPerson} from '../../src/views/GrampsjsViewPerson.js'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'

describe('simple card sections', () => {
  it('keeps basic creation sections visible but leaves empty advanced sections collapsed', () => {
    const card = new GrampsjsPerson()
    card.appState = {permissions: {canEdit: true}, dbInfo: {}}
    card.data = {
      handle: 'synthetic-person',
      primary_name: {first_name: 'Synthetic'},
      alternate_names: [],
      family_list: [],
      parent_family_list: [],
      event_ref_list: [],
      media_list: [],
      note_list: [],
      citation_list: [],
      attribute_list: [],
      address_list: [],
      urls: [{path: 'https://example.org/synthetic-record'}],
    }
    expect(card._getTabs(true)).toEqual([
      'relationships',
      'events',
      'gallery',
      'names',
      'notes',
      'links',
    ])
    card._addedSections = ['notes']
    expect(card._getTabs(false)).toContain('notes')
    expect(card._getTabs(true)).toContain('notes')
    expect(card._getTabs(true)).not.toContain('metadata')
  })
})

describe('explicit card choices', () => {
  function view(canEdit = true) {
    const result = new GrampsjsViewPerson()
    result.appState = {
      permissions: {canEdit},
      i18n: {strings: {}},
      apiPut: vi.fn(async () => ({data: []})),
    }
    result._data = {
      handle: 'synthetic-person',
      primary_name: {first_name: 'Synthetic Original', citation_list: ['n1']},
      alternate_names: [
        {first_name: 'Synthetic Other', note_list: ['n2']},
        {first_name: 'Synthetic Third', type: 'Synthetic custom type'},
      ],
      media_list: [{ref: 'photo1', rect: [1, 2, 3, 4]}, {ref: 'photo2'}],
      note_list: ['person-note'],
    }
    result._updateData = vi.fn()
    return result
  }

  it('selects the displayed name without deleting alternatives or hidden name fields', async () => {
    const person = view()
    const original = structuredClone(person._data)
    await person.handleEditAction({
      detail: {action: 'makePrimaryName', index: 2},
    })
    const payload = person.appState.apiPut.mock.calls[0][1]
    expect(payload.primary_name).toEqual(original.alternate_names[1])
    expect(payload.alternate_names).toEqual([
      original.primary_name,
      original.alternate_names[0],
    ])
    expect(payload.note_list).toEqual(original.note_list)
    expect(person._data).toEqual(original)
  })

  it('selects the main photo without changing its crop or removing other media', async () => {
    const person = view()
    await person.handleEditAction({
      detail: {action: 'makePrimaryMedia', index: 1},
    })
    expect(person.appState.apiPut.mock.calls[0][1].media_list).toEqual([
      {ref: 'photo2'},
      {ref: 'photo1', rect: [1, 2, 3, 4]},
    ])
  })

  it('returns the write failure to the form and blocks read-only mutations', async () => {
    const person = view()
    person.appState.apiPut.mockResolvedValue({error: 'Synthetic failure'})
    const complete = vi.fn()
    await person.handleEditAction({
      detail: {action: 'updateProp', data: {gender: 2}, complete},
    })
    expect(complete).toHaveBeenCalledWith({error: 'Synthetic failure'})
    person.appState.permissions.canEdit = false
    await person.handleEditAction({
      detail: {action: 'updateProp', data: {gender: 1}, complete},
    })
    expect(person.appState.apiPut).toHaveBeenCalledTimes(1)
    expect(complete).toHaveBeenLastCalledWith({error: 'Editing is not allowed'})
  })

  it('retries attachment after a successful creation without creating another note', async () => {
    const person = view()
    person.appState.apiPost = vi.fn(async () => ({data: []}))
    person.appState.apiGet = vi.fn(async () => ({
      data: structuredClone(person._data),
    }))
    person.appState.apiPut
      .mockResolvedValueOnce({error: 'Synthetic attachment failure'})
      .mockResolvedValueOnce({data: []})
    const detail = {
      action: 'newNote',
      data: {handle: 'synthetic-new-note', text: {string: 'Synthetic note'}},
    }
    expect(await person.handleEditAction({detail})).toEqual({
      error:
        'The record was created but could not be attached. Save again to retry.',
    })
    expect(await person.handleEditAction({detail})).toEqual({data: []})
    expect(person.appState.apiPost).toHaveBeenCalledTimes(1)
    expect(person.appState.apiPut).toHaveBeenCalledTimes(2)
    expect(person.appState.apiPut.mock.calls[1][1].note_list).toEqual([
      'person-note',
      'synthetic-new-note',
    ])
  })
})
