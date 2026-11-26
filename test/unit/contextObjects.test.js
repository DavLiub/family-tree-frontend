import {describe, expect, it, vi} from 'vitest'
import {render} from 'lit'
import {GrampsjsFormContextEvent} from '../../src/components/GrampsjsFormContextEvent.js'
import {GrampsjsRepository} from '../../src/components/GrampsjsRepository.js'
import {GrampsjsNames} from '../../src/components/GrampsjsNames.js'
import {GrampsjsName} from '../../src/components/GrampsjsName.js'
import {GrampsjsAddresses} from '../../src/components/GrampsjsAddresses.js'
import {GrampsjsEditGender} from '../../src/components/GrampsjsEditGender.js'
import {GrampsjsFormContextObject} from '../../src/components/GrampsjsFormContextObject.js'

if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = () => ({})
}

const state = canEdit => ({
  permissions: {canEdit},
  i18n: {strings: {}},
})

const renderComponent = element => {
  const root = element.createRenderRoot()
  render(element.render(), root, {host: element})
  return root
}

describe('direct context actions', () => {
  it('opens the exact address in view mode without changing the original draft', () => {
    const addresses = new GrampsjsAddresses()
    addresses.appState = state(true)
    addresses.data = [
      {street: 'Synthetic First Street'},
      {street: 'Synthetic Second Street', date: {text: 'synthetic date'}},
    ]
    const root = renderComponent(addresses)
    root.querySelectorAll('[aria-label="Edit address"]')[1].click()
    render(addresses.render(), root, {host: addresses})
    const form = root.querySelector('grampsjs-form-edit-address')
    expect(addresses.edit).toBe(false)
    expect(form.data.street).toBe('Synthetic Second Street')
    form.data.date.text = 'changed draft'
    expect(addresses.data[1].date.text).toBe('synthetic date')
    expect(form.awaitSave).toBe(true)
  })

  it('hides direct mutation controls without edit permission', () => {
    const addresses = new GrampsjsAddresses()
    addresses.appState = state(false)
    addresses.data = [{street: 'Synthetic Street'}]
    expect(
      renderComponent(addresses).querySelector('[aria-label="Edit address"]')
    ).toBeNull()
  })

  it('opening gender selection writes nothing and forwards only the chosen value', () => {
    const gender = new GrampsjsEditGender()
    gender.appState = state(true)
    gender.gender = 1
    const actions = vi.fn()
    gender.addEventListener('edit:action', actions)
    const root = renderComponent(gender)
    root.querySelector('[aria-label="Edit gender"]').click()
    expect(actions).not.toHaveBeenCalled()
    render(gender.render(), root, {host: gender})
    const form = root.querySelector('grampsjs-form-gender')
    expect(form.data.gender).toBe(1)
    const complete = vi.fn()
    form.dispatchEvent(
      new CustomEvent('object:save', {detail: {data: {gender: 2}, complete}})
    )
    expect(actions.mock.calls[0][0].detail).toEqual({
      action: 'updateProp',
      data: {gender: 2},
      complete,
    })
  })
})

describe('existing media and citation updates', () => {
  it('retains a failed citation draft and saves only displayed fields into the fresh record', async () => {
    const form = new GrampsjsFormContextObject()
    const fresh = {
      handle: 'synthetic-citation',
      source_handle: 'synthetic-source',
      note_list: ['synthetic-note'],
      media_list: [{ref: 'synthetic-document'}],
      private: true,
      page: 'old page',
      profile: {date: 'derived'},
    }
    const apiPut = vi
      .fn()
      .mockResolvedValueOnce({error: 'Synthetic failure'})
      .mockResolvedValueOnce({data: []})
    form.appState = {
      ...state(true),
      apiGet: vi.fn().mockResolvedValue({data: fresh}),
      apiPut,
    }
    form.endpoint = 'citations'
    form.handle = fresh.handle
    form.data = {
      source_handle: fresh.source_handle,
      page: 'revised page',
      confidence: 3,
      date: {text: 'about 1900'},
    }
    const saved = vi.fn()
    const changed = vi.fn()
    form.addEventListener('object:saved', saved)
    form.addEventListener('context:saved', changed)
    await form._handleDialogSave()
    expect(form.errorMessage).toBe('Synthetic failure')
    expect(form.data.page).toBe('revised page')
    expect(saved).not.toHaveBeenCalled()
    await form._handleDialogSave()
    expect(saved).toHaveBeenCalledTimes(1)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(apiPut.mock.calls[1]).toEqual([
      '/api/citations/synthetic-citation',
      {
        handle: fresh.handle,
        source_handle: fresh.source_handle,
        note_list: fresh.note_list,
        media_list: fresh.media_list,
        private: true,
        page: 'revised page',
        confidence: 3,
        date: {text: 'about 1900'},
      },
    ])
  })

  it('does not send a duplicate while media save is pending', async () => {
    const form = new GrampsjsFormContextObject()
    let finishSave
    const apiPut = vi.fn(
      () =>
        new Promise(resolve => {
          finishSave = resolve
        })
    )
    form.appState = {
      ...state(true),
      apiGet: vi.fn().mockResolvedValue({data: {handle: 'synthetic-media'}}),
      apiPut,
    }
    form.endpoint = 'media'
    form.handle = 'synthetic-media'
    form.data = {desc: 'Synthetic photograph'}
    const first = form._handleDialogSave()
    await vi.waitFor(() => expect(apiPut).toHaveBeenCalledTimes(1))
    await form._handleDialogSave()
    expect(apiPut).toHaveBeenCalledTimes(1)
    finishSave({data: []})
    await first
    expect(form.saving).toBe(false)
  })
})

it('keeps a citation draft when its shared source is saved independently', async () => {
  const form = new GrampsjsFormContextObject()
  const source = {
    handle: 'synthetic-source',
    title: 'Original source',
    note_list: ['hidden-note'],
  }
  const apiPut = vi.fn().mockResolvedValue({data: []})
  form.appState = {
    ...state(true),
    apiGet: vi.fn().mockResolvedValue({data: source}),
    apiPut,
  }
  form.endpoint = 'citations'
  form.handle = 'synthetic-citation'
  form.data = {source_handle: source.handle, page: 'unsaved citation page'}
  await form._openSourceEditor()
  const root = form.createRenderRoot()
  render(form.nestedDialog, root, {host: form})
  const nested = root.querySelector('grampsjs-form-context-object')
  const changes = vi.fn()
  form.addEventListener('context:saved', changes)
  nested.data = {...nested.data, title: 'Revised source'}
  await nested._handleDialogSave()
  expect(apiPut).toHaveBeenCalledWith(
    '/api/sources/synthetic-source',
    expect.objectContaining({
      title: 'Revised source',
      note_list: ['hidden-note'],
      handle: source.handle,
    })
  )
  expect(form.data.page).toBe('unsaved citation page')
  expect(form.data.extended.source.title).toBe('Revised source')
  expect(changes).not.toHaveBeenCalled()
  form._handleDialogCancel()
  expect(changes).toHaveBeenCalledTimes(1)
})

describe('simple names in the person card', () => {
  it('keeps given name and every surname visible while uncommon fields remain available', () => {
    const name = new GrampsjsName()
    name.appState = state(false)
    name.compact = true
    name.data = {
      first_name: 'Synthetic Alex',
      type: 'Birth Name',
      title: 'Synthetic title',
      nick: 'Synthetic nickname',
      surname_list: [
        {
          prefix: 'van',
          surname: 'Example',
          connector: 'and',
          origintype: 'Inherited',
        },
        {surname: 'Sample'},
      ],
    }
    const root = renderComponent(name)
    expect(root.querySelector('p').textContent).toBe(
      'Synthetic Alex van Example and Sample'
    )
    const details = root.querySelector('details')
    expect(details.open).toBe(false)
    expect(details.querySelector('summary').textContent).toBe('More details')
    expect(details.textContent).toContain('Synthetic nickname')
    expect(details.textContent).toContain('Synthetic title')
    expect(details.textContent).toContain('Birth Name')
    expect(details.textContent).toContain('Inherited')
  })

  it('adds another name in view mode and explicitly chooses the name displayed on the card', () => {
    const names = new GrampsjsNames()
    names.appState = state(true)
    names.data = [
      {first_name: 'Synthetic Alex', surname_list: []},
      {first_name: 'Synthetic Alias', surname_list: []},
    ]
    const actions = vi.fn()
    names.addEventListener('edit:action', actions)
    const root = renderComponent(names)
    expect(names.edit).toBe(false)
    expect(root.textContent).toContain('Displayed name')
    expect(root.textContent).toContain('Other recorded name')
    const buttons = [...root.querySelectorAll('md-text-button')]
    buttons
      .find(button => button.textContent.includes('Show this name on the card'))
      .click()
    expect(actions.mock.calls[0][0].detail).toEqual({
      action: 'makePrimaryName',
      index: 1,
    })
    buttons
      .find(button => button.textContent.includes('Add another name'))
      .click()
    render(names.render(), root, {host: names})
    expect(root.querySelector('grampsjs-form-edit-name')).not.toBeNull()
    expect(names.data).toHaveLength(2)
  })

  it('preserves the full name display outside the compact card list', () => {
    const name = new GrampsjsName()
    name.appState = state(false)
    name.data = {
      type: 'Birth Name',
      first_name: 'Synthetic Alex',
      surname_list: [],
    }
    const root = renderComponent(name)
    expect(root.querySelector('details')).toBeNull()
    expect(root.querySelector('h4').textContent).toBe('Birth Name')
    expect(root.querySelector('dl').textContent).toContain('Given name')
  })
})

describe('place and repository context editing', () => {
  it('changes the place name value while keeping fresh language, period, hierarchy and other fields', async () => {
    const form = new GrampsjsFormContextObject()
    const fresh = {
      handle: 'synthetic-place',
      name: {value: 'Old value', lang: 'ru', date: {text: 'fresh period'}},
      alt_names: [{value: 'Synthetic historical name'}],
      placeref_list: [{ref: 'synthetic-country'}],
      lat: '12',
      long: '34',
      private: true,
    }
    const apiPut = vi.fn().mockResolvedValue({data: []})
    form.appState = {
      ...state(true),
      apiGet: vi.fn().mockResolvedValue({data: fresh}),
      apiPut,
    }
    form.endpoint = 'places'
    form.handle = fresh.handle
    form.data = {
      name: {
        value: 'Revised place',
        lang: 'stale',
        date: {text: 'stale period'},
      },
    }
    await form._handleDialogSave()
    expect(apiPut).toHaveBeenCalledWith('/api/places/synthetic-place', {
      ...fresh,
      name: {...fresh.name, value: 'Revised place'},
    })
  })

  it('saves a shared place independently without writing or losing the event draft', async () => {
    const event = new GrampsjsFormContextEvent()
    const place = {
      handle: 'synthetic-place',
      name: {value: 'Old place', lang: 'en'},
    }
    const apiPut = vi.fn().mockResolvedValue({data: []})
    event.appState = {
      ...state(true),
      apiGet: vi.fn().mockResolvedValue({data: place}),
      apiPut,
    }
    event.handle = 'synthetic-event'
    event.data = {
      place: place.handle,
      description: 'Unsaved event description',
      date: {text: 'about 1910'},
    }
    await event._openPlaceEditor()
    const root = event.createRenderRoot()
    render(event.nestedDialog, root, {host: event})
    const nested = root.querySelector('grampsjs-form-context-object')
    nested.data = {
      ...nested.data,
      name: {...nested.data.name, value: 'Revised place'},
    }
    const changed = vi.fn()
    event.addEventListener('context:saved', changed)
    await nested._handleDialogSave()
    expect(apiPut).toHaveBeenCalledTimes(1)
    expect(apiPut.mock.calls[0][0]).toBe('/api/places/synthetic-place')
    expect(event.data.description).toBe('Unsaved event description')
    expect(event.data.date).toEqual({text: 'about 1910'})
    expect(event.place.name.value).toBe('Revised place')
    expect(changed).not.toHaveBeenCalled()
    event._handleDialogCancel()
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('opens repository edits explicitly and keeps the repository data on cancellation', () => {
    const repository = new GrampsjsRepository()
    repository.appState = state(true)
    repository.data = {
      handle: 'synthetic-repository',
      name: 'Synthetic archive',
      type: 'Archive',
    }
    const root = repository.createRenderRoot()
    render(repository.renderProfile(), root, {host: repository})
    expect(root.querySelector('[contenteditable]')).toBeNull()
    const button = root.querySelector('md-text-button')
    expect(button.textContent).toContain('Edit repository details')
    button.click()
    render(repository.dialogContent, root, {host: repository})
    const form = root.querySelector('grampsjs-form-context-object')
    form.data.name = 'Unsaved archive name'
    form._handleDialogCancel()
    expect(repository.data.name).toBe('Synthetic archive')
    expect(repository.dialogContent).toBe('')
  })
})
