import {describe, it, expect, vi} from 'vitest'
import {
  getPersonEditFields,
  buildPersonEditPayload,
  savePersonEdit,
} from '../../src/components/personEdit.js'

function makePerson() {
  return {
    _class: 'Person',
    handle: 'fictional-person',
    change: 123,
    gender: 0,
    primary_name: {
      _class: 'Name',
      first_name: 'Alex',
      nick: 'Example',
      type: 'Married Name',
      citation_list: ['name-citation'],
      surname_list: [
        {_class: 'Surname', surname: 'Example', primary: true, prefix: 'van'},
        {_class: 'Surname', surname: 'Sample', origintype: 'Birth Name'},
      ],
    },
    alternate_names: [{first_name: 'Original'}],
    parent_family_list: ['parents'],
    family_list: ['family'],
    event_ref_list: [{ref: 'birth', role: 'Primary'}],
    birth_ref_index: 0,
    media_list: [{ref: 'photo'}],
    note_list: ['note'],
    private: true,
  }
}

describe('basic person fields', () => {
  it('loads all surnames and preserves female gender zero', () => {
    expect(getPersonEditFields(makePerson())).toEqual({
      firstName: 'Alex',
      surnames: ['Example', 'Sample'],
      gender: 0,
    })
  })

  it('supports missing name and gender', () => {
    expect(getPersonEditFields({})).toEqual({
      firstName: '',
      surnames: [''],
      gender: 2,
    })
  })

  it.each(['en', 'ru'])('retains hidden data when editing in %s', language => {
    const person = makePerson()
    const before = structuredClone(person)
    const fields = getPersonEditFields(person)
    fields.firstName = language === 'ru' ? 'Анна' : 'Anna'
    fields.surnames[0] =
      language === 'ru' ? 'Пример (Образец)' : 'Example (Sample)'
    const payload = buildPersonEditPayload(person, fields)
    expect(payload.primary_name.first_name).toBe(fields.firstName)
    expect(payload.primary_name.surname_list[0].surname).toBe(
      fields.surnames[0]
    )
    expect(payload.primary_name.surname_list[0].prefix).toBe('van')
    expect(payload.primary_name.surname_list[1]).toEqual(
      before.primary_name.surname_list[1]
    )
    expect(payload.primary_name.nick).toBe('Example')
    expect(payload.primary_name.citation_list).toEqual(['name-citation'])
    for (const key of [
      'alternate_names',
      'parent_family_list',
      'family_list',
      'event_ref_list',
      'media_list',
      'note_list',
      'private',
    ]) {
      expect(payload[key]).toEqual(before[key])
    }
    expect(person).toEqual(before)
  })

  it('removes display-only API fields', () => {
    const person = {
      ...makePerson(),
      profile: {},
      extended: {},
      backlinks: {},
      formatted: {},
    }
    const payload = buildPersonEditPayload(person, getPersonEditFields(person))
    for (const key of ['profile', 'extended', 'backlinks', 'formatted']) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('creates a missing primary name', () => {
    const payload = buildPersonEditPayload(
      {handle: 'test'},
      {
        firstName: 'Example',
        surnames: ['Sample'],
        gender: 2,
      }
    )
    expect(payload.primary_name.surname_list[0]).toEqual({
      _class: 'Surname',
      primary: true,
      surname: 'Sample',
    })
  })

  it('rejects removing surnames and invalid gender', () => {
    const person = makePerson()
    expect(() =>
      buildPersonEditPayload(person, {
        ...getPersonEditFields(person),
        surnames: [],
      })
    ).toThrow()
    expect(() =>
      buildPersonEditPayload(person, {
        ...getPersonEditFields(person),
        gender: 9,
      })
    ).toThrow()
  })
})

describe('save person using appState', () => {
  function setup() {
    const person = makePerson()
    const appState = {
      permissions: {canEdit: true},
      apiGet: vi.fn().mockResolvedValue({data: structuredClone(person)}),
      apiPut: vi.fn().mockResolvedValue({data: {}}),
    }
    return {person, appState}
  }

  it('reads the current card before writing the full preserved person', async () => {
    const {person, appState} = setup()
    const fields = {...getPersonEditFields(person), firstName: 'New name'}
    expect(await savePersonEdit(appState, person, fields)).toEqual({data: {}})
    expect(appState.apiGet).toHaveBeenCalledWith('/api/people/fictional-person')
    expect(appState.apiPut).toHaveBeenCalledExactlyOnceWith(
      '/api/people/fictional-person',
      buildPersonEditPayload(person, fields)
    )
  })

  it('refuses to overwrite another user edits', async () => {
    const {person, appState} = setup()
    appState.apiGet.mockResolvedValue({
      data: {...person, note_list: ['new-note']},
    })
    expect(
      await savePersonEdit(appState, person, getPersonEditFields(person))
    ).toEqual({conflict: true})
    expect(appState.apiPut).not.toHaveBeenCalled()
  })

  it('does not call the API without edit permission', async () => {
    const {person, appState} = setup()
    appState.permissions.canEdit = false
    expect(
      await savePersonEdit(appState, person, getPersonEditFields(person))
    ).toEqual({error: 'Not authorized'})
    expect(appState.apiGet).not.toHaveBeenCalled()
    expect(appState.apiPut).not.toHaveBeenCalled()
  })

  it('keeps a read error and does not write', async () => {
    const {person, appState} = setup()
    appState.apiGet.mockResolvedValue({error: 'Offline'})
    expect(
      await savePersonEdit(appState, person, getPersonEditFields(person))
    ).toEqual({error: 'Offline'})
    expect(appState.apiPut).not.toHaveBeenCalled()
  })

  it('reports a rejected save', async () => {
    const {person, appState} = setup()
    appState.apiPut.mockResolvedValue({error: 'Not authorized'})
    expect(
      await savePersonEdit(appState, person, getPersonEditFields(person))
    ).toEqual({error: 'Not authorized'})
  })
})
