import {expect, it, vi} from 'vitest'
import {GrampsjsObjectForm} from '../../src/components/GrampsjsObjectForm.js'

class SyntheticContextForm extends GrampsjsObjectForm {}
customElements.define('synthetic-context-form', SyntheticContextForm)

it('retains input on failure, blocks a duplicate save and permits retry', async () => {
  const form = new SyntheticContextForm()
  form.appState = {permissions: {canEdit: true}, i18n: {strings: {}}}
  form.data = {description: 'Synthetic correction'}
  let resolveSave
  const save = vi.fn(
    () =>
      new Promise(resolve => {
        resolveSave = resolve
      })
  )
  const pending = form.submitSave(save)
  expect(form.saving).toBe(true)
  expect(await form.submitSave(save)).toBe(false)
  expect(save).toHaveBeenCalledTimes(1)
  resolveSave({error: 'Synthetic write failure'})
  expect(await pending).toBe(false)
  expect(form.errorMessage).toBe('Synthetic write failure')
  expect(form.data.description).toBe('Synthetic correction')
  expect(form.saving).toBe(false)
  expect(await form.submitSave(async () => ({data: []}))).toBe(true)
  expect(form.errorMessage).toBe('')
})

it('does not write for a read-only user', async () => {
  const form = new SyntheticContextForm()
  form.appState = {permissions: {canEdit: false}, i18n: {strings: {}}}
  const save = vi.fn()
  expect(await form.submitSave(save)).toBe(false)
  expect(save).not.toHaveBeenCalled()
})
