import {afterEach, describe, expect, it, vi} from 'vitest'
import {render} from 'lit'
import {GrampsjsNames} from '../../src/components/GrampsjsNames.js'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'
import {GrampsjsEvents} from '../../src/components/GrampsjsEvents.js'
import {GrampsjsUrls} from '../../src/components/GrampsjsUrls.js'
import {GrampsjsGallery} from '../../src/components/GrampsjsGallery.js'
import {GrampsjsViewObjectNotes} from '../../src/views/GrampsjsViewObjectNotes.js'
import {GrampsjsViewSourceCitations} from '../../src/views/GrampsjsViewSourceCitations.js'
import {GrampsjsRelationships} from '../../src/components/GrampsjsRelationships.js'

afterEach(() => document.body.replaceChildren())

const state = (canEdit = true, canAdd = true) => ({
  permissions: {canEdit, canAdd},
  i18n: {strings: {}},
  dbInfo: {},
})

function mount(element, content = element.render()) {
  const root = element.createRenderRoot()
  render(content, root, {host: element})
  return root
}

const button = (root, label) =>
  [...root.querySelectorAll('md-text-button')].find(
    item => item.textContent.trim() === label
  )

describe('section creation in ordinary viewing mode', () => {
  it('opens event creation or attachment even when there are no events', async () => {
    const events = new GrampsjsEvents()
    events.appState = state()
    events.hasAdd = true
    events.hasShare = true
    events._handleAdd = vi.fn()
    events._handleShare = vi.fn()
    document.body.append(events)
    await events.updateComplete
    const root = events.renderRoot
    const select = root.querySelector('md-outlined-select')
    await select.updateComplete
    await Promise.all(
      [...select.querySelectorAll('md-select-option')].map(
        option => option.updateComplete
      )
    )
    // Material's server-side value setter is inert in this DOM environment.
    // Supply the control contract and exercise our change handler and reset.
    let selectedValue = 'Death'
    Object.defineProperty(select, 'value', {
      configurable: true,
      get: () => selectedValue,
      set: value => {
        selectedValue = value
      },
    })
    select.dispatchEvent(new Event('change'))
    button(root, 'Attach existing').click()
    expect(events.edit).toBe(false)
    expect(events._handleAdd).toHaveBeenCalledWith('Death')
    expect(selectedValue).toBe('')
    expect(events._handleShare).toHaveBeenCalledTimes(1)
  })

  it('distinguishes adding a URL from attaching an existing tree record', () => {
    const links = new GrampsjsUrls()
    links.appState = state()
    links._handleAdd = vi.fn()
    const root = mount(links)
    button(root, 'Add link').click()
    expect(links._handleAdd).toHaveBeenCalledTimes(1)
    expect(button(root, 'Attach existing')).toBeUndefined()
    expect(links.edit).toBe(false)
  })

  it('exposes note and media creation without enabling the card editor', () => {
    const notes = new GrampsjsViewObjectNotes()
    notes.appState = state()
    notes.loading = false
    notes._handleAddClick = vi.fn()
    const root = mount(notes, notes.renderContent())
    button(root, 'Add note').click()
    expect(notes._handleAddClick).toHaveBeenCalledTimes(1)
    expect(notes.edit).toBe(false)
    const gallery = new GrampsjsGallery()
    gallery.appState = state()
    gallery._handleShareClick = vi.fn()
    const mediaRoot = mount(gallery)
    button(mediaRoot, 'Attach existing').click()
    expect(gallery._handleShareClick).toHaveBeenCalledTimes(1)
    expect(button(mediaRoot, 'Add photo or document')).toBeDefined()
  })

  it('retains attachment for editors who cannot create objects and hides all mutations for readers', () => {
    const events = new GrampsjsEvents()
    events.appState = state(true, false)
    events.hasAdd = true
    events.hasShare = true
    const root = mount(events)
    expect(root.querySelector('md-outlined-select')).toBeNull()
    expect(button(root, 'Attach existing')).toBeDefined()
    const reader = new GrampsjsUrls()
    reader.appState = state(false)
    expect(mount(reader).querySelector('md-text-button')).toBeNull()
  })

  it('keeps relationship creation reachable directly while leaving advanced empty sections closed', () => {
    const relationships = new GrampsjsRelationships()
    relationships.appState = state()
    const root = mount(relationships)
    expect(root.textContent).toContain('Add a new set of parents')
    expect(root.textContent).toContain(
      'Add person as child to an existing family'
    )
    const card = new GrampsjsPerson()
    card.appState = state()
    card.data = {
      family_list: [],
      parent_family_list: [],
      event_ref_list: [],
      media_list: [],
      note_list: [],
      urls: [],
      attribute_list: [],
      address_list: [],
      primary_name: {},
      alternate_names: [],
    }
    expect(card._getTabs(false)).toContain('events')
    expect(card._getTabs(false)).toContain('notes')
    expect(card._getTabs(false)).not.toContain('metadata')
    card._addedSections = ['events']
    const management = mount(card, card._renderSectionManagement('events'))
    expect(management.querySelector('md-outlined-button')).toBeNull()
    const content = mount(card, card.renderSectionContent('events'))
    expect(content.querySelector('grampsjs-events').hasAttribute('edit')).toBe(
      false
    )
    expect(card._getTabs(false)).toContain('events')
  })
})

it('places name creation above rows and confirms removal without a global mode', async () => {
  const names = new GrampsjsNames()
  names.appState = state()
  names.data = [
    {first_name: 'Alex', type: 'Married Name'},
    {first_name: 'Alex', type: 'Birth Name'},
  ]
  // Keep the dialog disconnected: happy-dom has no Web Animations API.
  const root = mount(names)
  expect(root.querySelector('.section-create-actions + md-list')).not.toBeNull()
  expect(
    button(root, 'Add another name').querySelector('[slot="icon"]')
  ).not.toBeNull()
  const remove = root.querySelectorAll('[aria-label="Delete name"]')
  expect(remove.length).toBe(1)
  const action = vi.fn()
  names.addEventListener('edit:action', action)
  remove[0].dispatchEvent(new MouseEvent('click', {bubbles: true}))
  render(names.render(), root, {host: names})
  expect(root.querySelector('md-dialog')).not.toBeNull()
  expect(action).not.toHaveBeenCalled()
  button(root, 'Cancel').click()
  render(names.render(), root, {host: names})
  expect(root.querySelector('md-dialog')).toBeNull()
  expect(names.edit).toBe(false)
})

it('never detaches another person or family event from the current person', () => {
  const events = new GrampsjsEvents()
  events.appState = state()
  events.data = [{handle: 'own'}, {handle: 'relative'}]
  events.eventRef = [{ref: 'own'}, undefined]
  expect(events._canRemoveIndex(0)).toBe(true)
  expect(events._canRemoveIndex(1)).toBe(false)
  const action = vi.fn()
  events.addEventListener('edit:action', action)
  events._requestRowRemove(1)
  expect(action).not.toHaveBeenCalled()
  expect(events.dialogContent).toBe('')
})

it('renders citation creation for an empty section without entering editing mode', () => {
  const citations = new GrampsjsViewSourceCitations()
  citations.appState = state()
  citations.loading = false
  const root = mount(citations, citations.renderContent())
  expect(root.querySelector('grampsjs-source-citations')).not.toBeNull()
  expect(citations.edit).toBe(false)
})

it('maps a combined timeline row back to the native event reference', () => {
  const events = new GrampsjsEvents()
  events.appState = state()
  events.data = [{handle: 'relative'}, {handle: 'own-second'}]
  events.eventRef = [undefined, {ref: 'own-second'}]
  events.referenceIndices = [-1, 3]
  events._selectedIndex = 1
  const action = vi.fn()
  events.addEventListener('edit:action', action)
  events._handleDelete()
  expect(action.mock.calls[0][0].detail).toMatchObject({
    action: 'delEvent',
    index: 3,
  })
})
