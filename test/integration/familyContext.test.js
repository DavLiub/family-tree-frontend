import {expect, it, vi} from 'vitest'
import {GrampsjsFormFamilyContext} from '../../src/components/GrampsjsFormFamilyContext.js'

const makeForm = () => {
  const form = new GrampsjsFormFamilyContext()
  form.family = {
    handle: 'synthetic-family',
    father_handle: 'synthetic-father',
    mother_handle: 'synthetic-mother',
    type: 'Married',
    event_ref_list: [{ref: 'synthetic-event'}],
    child_ref_list: [{ref: 'synthetic-child', frel: 'Birth', mrel: 'Birth'}],
  }
  form.personHandle = 'synthetic-child'
  form.appState = {
    permissions: {canEdit: true},
    i18n: {strings: {}},
    apiGet: vi.fn(async () => ({data: structuredClone(form.family)})),
    apiPut: vi.fn(async () => ({data: []})),
  }
  form.willUpdate(new Map([['family', undefined]]))
  return form
}

it('changes an existing child relationship on the family and preserves event links', async () => {
  const form = makeForm()
  form.data = {...form.data, frel: 'Adopted'}
  const saved = vi.fn()
  form.addEventListener('object:saved', saved)
  await form._handleDialogSave()
  expect(form.appState.apiPut).toHaveBeenCalledWith(
    '/api/families/synthetic-family',
    expect.objectContaining({
      handle: 'synthetic-family',
      event_ref_list: [{ref: 'synthetic-event'}],
      child_ref_list: [
        {ref: 'synthetic-child', frel: 'Adopted', mrel: 'Birth'},
      ],
    })
  )
  expect(saved).toHaveBeenCalledTimes(1)
})

it('requires confirmation before replacing a parent and leaves the form open on failure', async () => {
  const form = makeForm()
  form.data = {...form.data, father_handle: 'replacement-parent'}
  await form._handleDialogSave()
  expect(form.appState.apiPut).not.toHaveBeenCalled()
  form.confirmed = true
  form.appState.apiPut.mockRejectedValue(new Error('Synthetic save failure'))
  const saved = vi.fn()
  form.addEventListener('object:saved', saved)
  await form._handleDialogSave()
  expect(form.errorMessage).toBe('Synthetic save failure')
  expect(form.data.father_handle).toBe('replacement-parent')
  expect(saved).not.toHaveBeenCalled()
})

it('confirms disconnection without deleting the family or people', async () => {
  const form = makeForm()
  form.disconnect = true
  await form._handleDialogSave()
  expect(form.appState.apiPut).not.toHaveBeenCalled()
  form.confirmed = true
  await form._handleDialogSave()
  expect(form.appState.apiPut).toHaveBeenCalledWith(
    '/api/families/synthetic-family',
    expect.objectContaining({
      child_ref_list: [],
      father_handle: 'synthetic-father',
      mother_handle: 'synthetic-mother',
    })
  )
})

it('does not save a family for a read-only user', async () => {
  const form = makeForm()
  form.appState.permissions.canEdit = false
  await form._handleDialogSave()
  expect(form.appState.apiGet).not.toHaveBeenCalled()
  expect(form.appState.apiPut).not.toHaveBeenCalled()
})
