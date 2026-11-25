import {describe, expect, it, vi} from 'vitest'
import {
  GrampsjsRecordDelete,
  recordUsage,
} from '../../src/components/GrampsjsRecordDelete.js'

function control(backlinks = {person: ['p1'], family: ['f1']}) {
  const item = new GrampsjsRecordDelete()
  item.endpoint = 'events'
  item.handle = 'synthetic-event'
  item.label = 'Synthetic birth'
  item.appState = {
    permissions: {canEdit: true, canDelete: true, canViewPrivate: true},
    i18n: {strings: {}},
    apiGet: vi.fn(async () => ({data: {handle: item.handle, backlinks}})),
    apiDelete: vi.fn(async () => ({data: []})),
  }
  return item
}

describe('global record deletion', () => {
  it('checks every reference type, then requires explicit confirmation', async () => {
    const item = control({
      person: ['p1'],
      family: ['f1'],
      event: ['e1'],
      media: ['m1'],
      place: ['l1'],
      citation: ['c1'],
      source: ['s1'],
      repository: ['r1'],
    })
    await item._prepare()
    expect(item._usage).toHaveLength(8)
    expect(item.appState.apiDelete).not.toHaveBeenCalled()
    await item._confirm()
    expect(item.appState.apiGet).toHaveBeenCalledTimes(2)
    expect(item.appState.apiDelete).toHaveBeenCalledWith(
      '/api/events/synthetic-event',
      {dbChanged: false}
    )
    expect(item._open).toBe(false)
  })

  it('requires a fresh confirmation if reference membership changed', async () => {
    const item = control()
    await item._prepare()
    item.appState.apiGet.mockResolvedValue({
      data: {handle: item.handle, backlinks: {person: ['p1', 'p2']}},
    })
    await item._confirm()
    expect(item.appState.apiDelete).not.toHaveBeenCalled()
    expect(item._open).toBe(true)
    expect(item._error).toContain('changed')
    await item._confirm()
    expect(item.appState.apiDelete).toHaveBeenCalledTimes(1)
  })

  it('does not interpret a missing or malformed reference response as no usage', async () => {
    const item = control()
    item.appState.apiGet.mockResolvedValue({data: {handle: item.handle}})
    await item._prepare()
    await item._confirm()
    expect(item._usage).toBeNull()
    expect(item._error).toBeTruthy()
    expect(item.appState.apiDelete).not.toHaveBeenCalled()
    expect(() => recordUsage({backlinks: {person: null}})).toThrow()
  })

  it('retains the dialog on delete failure and prevents duplicate requests', async () => {
    const item = control({})
    await item._prepare()
    let finish
    item.appState.apiDelete.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const pending = item._confirm()
    await vi.waitFor(() =>
      expect(item.appState.apiDelete).toHaveBeenCalledTimes(1)
    )
    await item._confirm()
    finish({error: 'Synthetic failure'})
    await pending
    expect(item._open).toBe(true)
    expect(item._pending).toBe(false)
    expect(item._error).toBe('Synthetic failure')
  })

  it('does not delete without deletion rights or a complete private-reference check', async () => {
    const item = control()
    item.appState.permissions.canDelete = false
    await item._prepare()
    expect(item.appState.apiGet).not.toHaveBeenCalled()
    item.appState.permissions.canDelete = true
    item.appState.permissions.canViewPrivate = false
    await item._prepare()
    await item._confirm()
    expect(item.appState.apiDelete).not.toHaveBeenCalled()
    expect(item._error).toContain('private')
  })

  it('waits for a background deletion and reports its failure', async () => {
    const item = control({})
    item.appState.registerTask = vi.fn()
    item.appState.apiDelete.mockResolvedValue({
      task: {id: 'synthetic-delete-task'},
    })
    await item._prepare()
    const pending = item._confirm()
    await vi.waitFor(() =>
      expect(item.appState.registerTask).toHaveBeenCalled()
    )
    expect(item._pending).toBe(true)
    window.dispatchEvent(
      new CustomEvent('task:error', {
        detail: {
          taskId: 'synthetic-delete-task',
          status: {state: 'FAILURE', info: 'Synthetic background failure'},
        },
      })
    )
    await pending
    expect(item._open).toBe(true)
    expect(item._error).toBe('Synthetic background failure')
  })

  it('does not submit a record after its identity changed', async () => {
    const item = control()
    await item._prepare()
    item.handle = 'another-synthetic-event'
    await item._confirm()
    expect(item.appState.apiDelete).not.toHaveBeenCalled()
  })
})
