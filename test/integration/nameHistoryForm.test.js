import {describe, expect, it, vi} from 'vitest'
import {render} from 'lit'
import {GrampsjsNames} from '../../src/components/GrampsjsNames.js'
import {GrampsjsFormName} from '../../src/components/GrampsjsFormName.js'
import {GrampsjsFormEditName} from '../../src/components/GrampsjsFormEditName.js'

const appState = {
  permissions: {canEdit: true},
  i18n: {strings: {}},
}

const input = (id, data, idx) => {
  const event = new CustomEvent('formdata:changed', {detail: {data, idx}})
  event.composedPath = () => [{id}]
  return event
}

describe('complete historical name variants', () => {
  it('prefills a new variant without borrowing evidence, dates, or private metadata', () => {
    const names = new GrampsjsNames()
    names.appState = appState
    names.data = [
      {
        _class: 'Name',
        type: 'Married Name',
        first_name: 'Synthetic Anna',
        citation_list: ['synthetic-evidence'],
        note_list: ['synthetic-note'],
        date: {text: 'old date'},
        private: true,
        surname_list: [
          {
            surname: 'Synthetic Family',
            primary: true,
            citation_list: ['hidden'],
          },
          {
            surname: 'Synthetic Patronymic',
            origintype: 'Patronymic',
            primary: false,
          },
        ],
      },
    ]
    const original = structuredClone(names.data)
    names._handleAdd('change')
    const draft = names.dialogContent.values.find(
      value => value?._class === 'Name'
    )
    expect(draft.type).toBe('Name change')
    expect(draft.first_name).toBe('Synthetic Anna')
    expect(draft.surname_list.map(part => part.surname)).toEqual([
      'Synthetic Family',
      'Synthetic Patronymic',
    ])
    for (const key of ['citation_list', 'note_list', 'date', 'private']) {
      expect(draft).not.toHaveProperty(key)
    }
    expect(draft.surname_list[0]).not.toHaveProperty('citation_list')
    expect(names.data).toEqual(original)
    names._handleAdd('birth')
    expect(
      names.dialogContent.values.find(value => value?._class === 'Name').type
    ).toBe('Birth Name')
  })

  it('reveals empty fields without changing the native Name', () => {
    const name = new GrampsjsFormName()
    name.appState = appState
    name.webawesome = true
    name.historyMode = true
    name.data = {_class: 'Name', first_name: '', surname_list: []}
    const root = name.createRenderRoot()
    const original = structuredClone(name.data)
    render(name.render(), root, {host: name})
    expect(root.querySelector('#first_name')).toBeNull()
    expect(root.querySelector('#patronymic')).toBeNull()
    expect(root.querySelector('grampsjs-form-surname')).toBeNull()
    for (const label of ['Add given name', 'Add patronymic']) {
      ;[...root.querySelectorAll('wa-button')]
        .find(button => button.textContent.trim() === label)
        .click()
    }
    name._handleAddSurname()
    render(name.render(), root, {host: name})
    expect(root.querySelector('#first_name')).not.toBeNull()
    expect(root.querySelector('#patronymic')).not.toBeNull()
    expect(root.querySelector('grampsjs-form-surname')).not.toBeNull()
    expect(name.data).toEqual(original)
  })

  it('edits visible fields without splitting existing given names or dropping native details', () => {
    const name = new GrampsjsFormName()
    name.historyMode = true
    name.data = {
      _class: 'Name',
      type: 'Synthetic legacy custom type',
      first_name: 'Synthetic Given And Middle',
      date: {text: 'Synthetic period'},
      citation_list: ['synthetic-evidence'],
      surname_list: [
        {
          surname: 'Family',
          prefix: 'van',
          primary: true,
          custom_future_field: 'keep',
        },
        {
          surname: 'Patronymic',
          origintype: 'Patronymic',
          primary: false,
          connector: 'keep',
        },
      ],
    }
    name._handleFormData(input('patronymic', 'Revised patronymic'))
    expect(name.data.first_name).toBe('Synthetic Given And Middle')
    expect(name.data.surname_list[0].custom_future_field).toBe('keep')
    expect(name.data.surname_list[1]).toMatchObject({
      surname: 'Revised patronymic',
      connector: 'keep',
    })
    name._handleFormData(input('first_name', 'Synthetic Revised'))
    expect(name.data.type).toBe('Synthetic legacy custom type')
    expect(name.data.date).toEqual({text: 'Synthetic period'})
    expect(name.data.citation_list).toEqual(['synthetic-evidence'])
  })

  it('keeps multiple native patronymics separate during ordinary given-name edits', () => {
    const name = new GrampsjsFormName()
    name.historyMode = true
    const parts = [
      {surname: 'First part', origintype: 'Patronymic', prefix: 'keep'},
      {surname: 'Family', primary: true},
      {surname: 'Second part', origintype: 'Patronymic', connector: 'keep'},
    ]
    name.data = {first_name: 'Synthetic', surname_list: parts}
    name._handleFormData(input('first_name', 'Synthetic Revised'))
    expect(name.data.surname_list).toEqual(parts)
    const revised = {...parts[2], surname: 'Revised second part'}
    name._handleFormData(input('patronymics1', revised, 1))
    expect(name.data.surname_list).toEqual([parts[0], parts[1], revised])
  })

  it('retains an unknown recorded type until the user explicitly changes the kind', () => {
    const form = new GrampsjsFormEditName()
    form.appState = appState
    form.historyMode = true
    form.data = {first_name: 'Synthetic', type: 'Synthetic legacy custom type'}
    form.createRenderRoot()
    form.checkFormValidity()
    const save = vi.fn()
    form.addEventListener('object:save', save)
    form._handleDialogSave()
    expect(save.mock.calls[0][0].detail.data.type).toBe(
      'Synthetic legacy custom type'
    )
    save.mock.calls[0][0].detail.complete({error: 'Synthetic failed save'})
    expect(form.errorMessage).toBe('Synthetic failed save')
    expect(form.data.type).toBe('Synthetic legacy custom type')
    form._changeHistoryKind('birth')
    expect(form.data.type).toBe('Birth Name')
    form._changeHistoryKind('change')
    expect(form.data.type).toBe('Name change')
  })
})
