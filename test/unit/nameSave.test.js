import {describe, expect, it, vi} from 'vitest'
import '../../src/components/GrampsjsFormEditName.js'
import {GrampsjsNames} from '../../src/components/GrampsjsNames.js'
import {person} from '../fixtures/family.js'
import {GrampsjsViewPerson} from '../../src/views/GrampsjsViewPerson.js'
import {clearDraftsWithPrefix} from '../../src/api.js'

vi.mock('../../src/api.js', async importActual => ({
  ...(await importActual()),
  clearDraftsWithPrefix: vi.fn(),
}))

describe('name save completion protocol', () => {
  it('prevents native Escape dismissal while a name save is pending', () => {
    const form = document.createElement('grampsjs-form-edit-name')
    form.appState = {i18n: {strings: {}}}
    form.saving = true
    let cancelled = 0
    form.addEventListener('object:cancel', () => {
      cancelled += 1
    })
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    })
    form._handleDialogKeydown(escape)
    expect(escape.defaultPrevented).toBe(true)
    expect(cancelled).toBe(0)
    expect(form.saving).toBe(true)
  })
  it('clears drafts only after a successful write and keeps success when refresh throws', async () => {
    vi.mocked(clearDraftsWithPrefix).mockClear()
    const view = new GrampsjsViewPerson()
    view.appState = {
      apiPut: vi
        .fn()
        .mockResolvedValueOnce({error: 'Synthetic denial'})
        .mockResolvedValueOnce({data: []}),
    }
    view._updateData = vi.fn(() => {
      throw new Error('Synthetic refresh failure')
    })
    const failed = await view.updateProp(
      person,
      'person',
      {},
      'synthetic:draft:'
    )
    expect(failed.error).toBe('Synthetic denial')
    expect(clearDraftsWithPrefix).not.toHaveBeenCalled()
    expect(view._updateData).not.toHaveBeenCalled()
    const saved = await view.updateProp(
      person,
      'person',
      {},
      'synthetic:draft:'
    )
    expect(saved).toEqual({data: []})
    expect(view._updateData).toHaveBeenCalledTimes(1)
    expect(clearDraftsWithPrefix).toHaveBeenCalledTimes(1)
    expect(clearDraftsWithPrefix).toHaveBeenCalledWith('synthetic:draft:')
  })
  it('forwards completion through the real Names event and closes only on saved', () => {
    const names = new GrampsjsNames()
    names.appState = {i18n: {strings: {}}}
    names.dialogContent = 'open'
    const complete = () => {}
    let action
    names.addEventListener('edit:action', event => {
      action = event.detail
    })
    names._handleNameSave(
      0,
      new CustomEvent('object:save', {
        detail: {data: person.primary_name, complete},
      })
    )
    expect(action).toEqual({
      action: 'updateName',
      data: {index: 0, name: person.primary_name},
      complete,
    })
    expect(names.dialogContent).toBe('open')
    names._handleNameSaved(new Event('object:saved'))
    expect(names.dialogContent).toBe('')
    expect(names._saveStatus).toBe('Saved')
  })
  it('keeps input after error, blocks a second save, and reports success after retry', () => {
    const form = document.createElement('grampsjs-form-edit-name')
    form.appState = {i18n: {strings: {}}}
    form.isFormValid = true
    form.data = structuredClone(person.primary_name)
    const saved = []
    const cancelled = []
    form.addEventListener('object:save', event => saved.push(event.detail))
    form.addEventListener('object:cancel', event =>
      cancelled.push(event.detail)
    )
    form._handleDialogSave()
    expect(form.saving).toBe(true)
    form._handleDialogSave()
    form._handleDialogCancel()
    expect(saved).toHaveLength(1)
    expect(cancelled).toHaveLength(0)
    expect(saved[0].data).toEqual(person.primary_name)
    expect(saved[0].data).not.toBe(form.data)
    saved[0].data.surname_list[0].surname = 'Transport copy'
    expect(form.data.surname_list[0].surname).toBe('Example')
    saved[0].complete({error: 'Synthetic rejection'})
    expect(form.saving).toBe(false)
    expect(form.errorMessage).toContain('Synthetic rejection')
    expect(form.data).toEqual(person.primary_name)
    form._handleDialogSave()
    expect(saved).toHaveLength(2)
    let success = 0
    form.addEventListener('object:saved', () => {
      success += 1
    })
    saved[1].complete({data: []})
    expect(success).toBe(1)
    expect(form.data).toEqual(person.primary_name)
  })
})
