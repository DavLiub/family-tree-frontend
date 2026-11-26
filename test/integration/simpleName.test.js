import {describe, expect, it, vi} from 'vitest'
import {GrampsjsFormName} from '../../src/components/GrampsjsFormName.js'
import {GrampsjsFormSurname} from '../../src/components/GrampsjsFormSurname.js'
import {GrampsjsFormEditName} from '../../src/components/GrampsjsFormEditName.js'

function inputEvent(id, data, idx) {
  const event = new CustomEvent('formdata:changed', {detail: {data, idx}})
  event.composedPath = () => [{id}]
  return event
}

describe('simple name editing', () => {
  it('changes visible fields while preserving the complete hidden Name and surnames', () => {
    const original = {
      _class: 'Name',
      first_name: 'Synthetic Alex',
      type: 'Synthetic custom type',
      title: 'Synthetic title',
      suffix: 'Jr',
      call: 'Al',
      nick: 'Synthetic nickname',
      famnick: 'Synthetic family nickname',
      citation_list: ['synthetic-citation'],
      note_list: ['synthetic-note'],
      private: true,
      custom_future_field: 'keep',
      surname_list: [
        {
          _class: 'Surname',
          surname: 'Example',
          prefix: 'van',
          connector: 'and',
          origintype: 'Birth Name',
          primary: true,
        },
        {
          _class: 'Surname',
          surname: 'Sample',
          prefix: 'de',
          custom_future_field: 'keep',
        },
      ],
    }
    const name = new GrampsjsFormName()
    name.data = structuredClone(original)
    expect(name.showMore).toBe(false)
    name._handleFormData(inputEvent('first_name', 'Synthetic Revised'))
    const surname = new GrampsjsFormSurname()
    surname.data = name.data.surname_list[0]
    surname._handleFormData(inputEvent('surname', 'Revised surname'))
    name._handleFormData(inputEvent('surnames0', surname.data, 0))
    const form = new GrampsjsFormEditName()
    form.appState = {i18n: {strings: {}}}
    form.data = name.data
    form.isFormValid = true
    const save = vi.fn()
    form.addEventListener('object:save', save)
    form._handleDialogSave()
    expect(save.mock.calls[0][0].detail.data).toEqual({
      ...original,
      first_name: 'Synthetic Revised',
      surname_list: [
        {...original.surname_list[0], surname: 'Revised surname'},
        original.surname_list[1],
      ],
    })
    expect(original.first_name).toBe('Synthetic Alex')
  })

  it('adds another surname without discarding details and supplies the new-name default', () => {
    const name = new GrampsjsFormName()
    name.data = {
      _class: 'Name',
      first_name: 'Synthetic',
      surname_list: [{surname: 'Example', prefix: 'van'}],
    }
    name._handleAddSurname()
    expect(name.data.surname_list).toEqual([
      {surname: 'Example', prefix: 'van'},
      {},
    ])
    const form = new GrampsjsFormEditName()
    form.data = name.data
    form.isFormValid = true
    const save = vi.fn()
    form.addEventListener('object:save', save)
    form._handleDialogSave()
    expect(save.mock.calls[0][0].detail.data.type).toBe('Birth Name')
  })
})
