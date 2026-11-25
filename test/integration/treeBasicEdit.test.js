import {describe, expect, it, vi} from 'vitest'
import {GrampsjsFormEditPerson} from '../../src/components/GrampsjsFormEditPerson.js'
import {savePersonBasicEvent} from '../../src/components/personBasicEvent.js'

const person = {
  handle: 'p',
  gramps_id: 'TEST-I1',
  change: 1,
  primary_name: {first_name: 'Original'},
  alternate_names: [{first_name: 'Birth', type: 'Birth Name'}],
  event_ref_list: [],
  birth_ref_index: -1,
  death_ref_index: -1,
}
const state = () => ({
  permissions: {canEdit: true, canAdd: true},
  i18n: {strings: {}},
  apiGet: vi.fn(async () => ({data: structuredClone(person)})),
  apiPost: vi.fn(async () => ({data: []})),
  apiPut: vi.fn(async () => ({data: []})),
})

describe('tree basic editor', () => {
  it('refreshes dates without losing an unsaved name or accepting a concurrent name change', async () => {
    const form = new GrampsjsFormEditPerson()
    form.personHandle = 'p'
    form.appState = state()
    await form._loadPerson()
    form._fields.firstName = 'Unsaved'
    form.appState.apiGet.mockResolvedValue({
      data: {
        ...person,
        primary_name: {first_name: 'Concurrent'},
        change: 2,
        event_ref_list: [{ref: 'birth'}],
        birth_ref_index: 0,
      },
    })
    await form._refreshSummary()
    expect(form._fields.firstName).toBe('Unsaved')
    expect(form._originalPerson.primary_name.first_name).toBe('Original')
    expect(form._originalPerson.event_ref_list).toEqual([{ref: 'birth'}])
    await form._handleSave()
    expect(form._conflict).toBe(true)
    expect(form.appState.apiPut).not.toHaveBeenCalled()
  })

  it('does not silently discard unsaved names when opening the person card', async () => {
    const form = new GrampsjsFormEditPerson()
    form.appState = state()
    await form._loadPerson()
    const nav = vi.fn()
    form.addEventListener('nav', nav)
    form._fields.firstName = 'Unsaved'
    form._openPerson()
    expect(nav).not.toHaveBeenCalled()
    expect(form._nested).not.toBe('')
  })

  it('retries linking a birth without creating another event', async () => {
    const appState = state()
    const draft = {}
    appState.apiPut
      .mockResolvedValueOnce({error: 'Synthetic link failure'})
      .mockResolvedValueOnce({data: []})
    const data = {date: {text: '1900'}, role: 'Primary'}
    await savePersonBasicEvent(appState, 'p', 'birth', data, draft)
    await savePersonBasicEvent(appState, 'p', 'birth', data, draft)
    expect(appState.apiPost).toHaveBeenCalledTimes(1)
    const saved = appState.apiPut.mock.calls[1][1]
    expect(saved.birth_ref_index).toBe(0)
    expect(saved.event_ref_list[0].ref).toBe(draft.handle)
    expect(saved.alternate_names).toEqual(person.alternate_names)
  })

  it('does not replace an event attached by another editor while this form was open', async () => {
    const appState = state()
    appState.apiGet.mockResolvedValue({
      data: {
        ...person,
        birth_ref_index: 0,
        event_ref_list: [{ref: 'concurrent'}],
      },
    })
    await expect(
      savePersonBasicEvent(appState, 'p', 'birth', {}, {})
    ).rejects.toThrow('has changed')
    expect(appState.apiPut).not.toHaveBeenCalled()
  })
})
