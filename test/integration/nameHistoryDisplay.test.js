import {expect, it, vi} from 'vitest'
import {render} from 'lit'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'
import {GrampsjsViewPerson} from '../../src/views/GrampsjsViewPerson.js'

it('renders the selected full name and changed birth parts in the actual heading', () => {
  const card = new GrampsjsPerson()
  card.appState = {i18n: {strings: {'At birth': 'При рождении'}}}
  card.data = {
    primary_name: {
      first_name: 'Мария',
      type: 'Name change',
      surname_list: [
        {surname: 'Смирнова'},
        {surname: 'Исааковна', origintype: 'Patronymic'},
      ],
    },
    alternate_names: [
      {
        first_name: 'Анна',
        type: 'Birth Name',
        surname_list: [
          {surname: 'Левина'},
          {surname: 'Исааковна', origintype: 'Patronymic'},
        ],
      },
    ],
  }
  const root = card.createRenderRoot()
  render(card._displayName(), root, {host: card})
  expect(root.textContent.replace(/\s+/g, ' ').trim()).toBe(
    'Мария Исааковна Смирнова (При рождении: Анна Левина)'
  )
})

it('does not enter the global edit mode on a person card', () => {
  const view = new GrampsjsViewPerson()
  const activated = vi.fn()
  view.addEventListener('edit-mode:on', activated)
  view._activateEditMode()
  expect(view.edit).toBe(false)
  expect(activated).not.toHaveBeenCalled()
})

it('retains the explicit deletion confirmation and record when deletion fails', async () => {
  const view = new GrampsjsViewPerson()
  view.active = true
  view.appState = {
    permissions: {canEdit: true},
    i18n: {strings: {}},
    apiDelete: vi.fn(async () => ({error: 'Synthetic deletion failure'})),
  }
  view._data = {handle: 'synthetic-person', gramps_id: 'TEST-I034'}
  view._confirmingDelete = true
  await view._confirmPersonDelete()
  expect(view.appState.apiDelete).toHaveBeenCalledWith(
    '/api/people/synthetic-person',
    {dbChanged: false}
  )
  expect(view._confirmingDelete).toBe(true)
  expect(view._deleteError).toBe('Synthetic deletion failure')
  expect(view._data.handle).toBe('synthetic-person')
  expect(view._deletePending).toBe(false)
})
