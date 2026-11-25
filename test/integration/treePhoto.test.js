import {describe, expect, it, vi} from 'vitest'
import {GrampsjsTreePhoto} from '../../src/components/GrampsjsTreePhoto.js'

function chooser() {
  const dialog = new GrampsjsTreePhoto()
  dialog.personHandle = 'synthetic-person'
  dialog.appState = {
    permissions: {canEdit: true, canAdd: true},
    i18n: {strings: {}},
    apiGet: vi.fn(async () => ({
      data: {
        handle: 'synthetic-person',
        media_list: [{ref: 'own'}],
        note_list: ['keep'],
      },
    })),
    apiPut: vi.fn(async () => ({data: []})),
  }
  return dialog
}

describe('tree photo chooser', () => {
  it('does not select a photo that is not offered by this person', async () => {
    const dialog = chooser()
    dialog._photos = [{record: {handle: 'own'}}]
    await dialog._select('foreign')
    expect(dialog.appState.apiPut).not.toHaveBeenCalled()
  })

  it('retains the selected dialog and error when saving fails', async () => {
    const dialog = chooser()
    dialog._photos = [{record: {handle: 'own'}}]
    dialog.appState.apiPut.mockResolvedValue({error: 'Synthetic failure'})
    const saved = vi.fn()
    dialog.addEventListener('object:saved', saved)
    await dialog._select('own')
    expect(dialog._error).toBe('Synthetic failure')
    expect(dialog._pending).toBe(false)
    expect(saved).not.toHaveBeenCalled()
  })

  it('retries attachment without uploading a second copy', async () => {
    const dialog = chooser()
    const file = {type: 'image/png'}
    const form = {
      renderRoot: {querySelector: () => ({file})},
      upload: vi.fn(async () => ({data: {handle: 'uploaded'}})),
    }
    const complete = vi.fn()
    const event = {
      preventDefault() {},
      stopPropagation() {},
      currentTarget: form,
      detail: {data: {}, complete},
    }
    dialog.appState.apiPut
      .mockResolvedValueOnce({error: 'Synthetic link failure'})
      .mockResolvedValueOnce({data: []})
    await dialog._saveUpload(event)
    expect(complete.mock.calls[0][0].error).toContain('uploaded')
    await dialog._saveUpload(event)
    expect(form.upload).toHaveBeenCalledTimes(1)
    expect(dialog.appState.apiPut).toHaveBeenCalledTimes(2)
    expect(complete.mock.calls[1][0]).toEqual({data: []})
  })

  it('does not upload documents or allow uploads without creation rights', async () => {
    const dialog = chooser()
    const upload = vi.fn()
    const complete = vi.fn()
    const event = {
      preventDefault() {},
      stopPropagation() {},
      currentTarget: {
        renderRoot: {querySelector: () => ({file: {type: 'application/pdf'}})},
        upload,
      },
      detail: {data: {}, complete},
    }
    await dialog._saveUpload(event)
    expect(upload).not.toHaveBeenCalled()
    expect(complete.mock.calls[0][0].error).toBe('Choose an image file')
    dialog.appState.permissions.canAdd = false
    await dialog._saveUpload(event)
    expect(upload).not.toHaveBeenCalled()
  })

  it('cancels without any write', () => {
    const dialog = chooser()
    const cancelled = vi.fn()
    dialog.addEventListener('object:cancel', cancelled)
    dialog._cancel()
    expect(cancelled).toHaveBeenCalledTimes(1)
    expect(dialog.appState.apiPut).not.toHaveBeenCalled()
  })
})
