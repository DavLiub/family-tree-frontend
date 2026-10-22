import {afterEach, describe, expect, it, vi} from 'vitest'
import {deferred, mountNavigation} from '../fixtures/navigation.js'

afterEach(() => document.body.replaceChildren())

describe('card navigation with reordered responses', () => {
  it.each(['success', 'error'])(
    'ignores an old %s after loading the new card',
    async outcome => {
      const old = deferred()
      const latest = deferred()
      const apiGet = vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise)
      const view = await mountNavigation('object', apiGet)
      const loaded = []
      view.addEventListener('object:loaded', event =>
        loaded.push({id: event.detail.grampsId, data: view._data.gramps_id})
      )
      view.grampsId = 'TEST-A'
      await view.updateComplete
      view.grampsId = 'TEST-B'
      await view.updateComplete
      latest.resolve({data: [{gramps_id: 'TEST-B'}]})
      await vi.waitFor(() => expect(view._data.gramps_id).toBe('TEST-B'))
      old.resolve(
        outcome === 'success'
          ? {data: [{gramps_id: 'TEST-A'}]}
          : {error: 'Old synthetic denial'}
      )
      await old.promise
      await view.updateComplete
      expect(view._data.gramps_id).toBe('TEST-B')
      expect(view.error).toBe(false)
      expect(view.loading).toBe(false)
      expect(loaded).toEqual([{id: 'TEST-B', data: 'TEST-B'}])
    }
  )

  it('does not announce old data with a newly assigned id before Lit updates', async () => {
    const old = deferred()
    const latest = deferred()
    const view = await mountNavigation(
      'object',
      vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise)
    )
    const loaded = []
    view.addEventListener('object:loaded', event =>
      loaded.push({id: event.detail.grampsId, data: view._data.gramps_id})
    )
    view.grampsId = 'TEST-A'
    await view.updateComplete
    old.resolve({data: [{gramps_id: 'TEST-A'}]})
    view.grampsId = 'TEST-B'
    await old.promise
    await view.updateComplete
    expect(loaded).toEqual([])
    latest.resolve({data: [{gramps_id: 'TEST-B'}]})
    await vi.waitFor(() =>
      expect(loaded).toEqual([{id: 'TEST-B', data: 'TEST-B'}])
    )
  })

  it('does not finish the newer loading state when the old response arrives first', async () => {
    const old = deferred()
    const latest = deferred()
    const view = await mountNavigation(
      'object',
      vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise)
    )
    view.grampsId = 'TEST-A'
    await view.updateComplete
    view.grampsId = 'TEST-B'
    await view.updateComplete
    old.resolve({data: [{gramps_id: 'TEST-A'}]})
    await old.promise
    await view.updateComplete
    expect(view.loading).toBe(true)
    expect(view._data).toEqual({})
    latest.resolve({data: [{gramps_id: 'TEST-B'}]})
    await vi.waitFor(() => expect(view.loading).toBe(false))
    expect(view._data.gramps_id).toBe('TEST-B')
  })

  it('invalidates an id change before the next Lit update and recovers after leaving', async () => {
    const old = deferred()
    const returning = deferred()
    const apiGet = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValue(returning.promise)
    const view = await mountNavigation('object', apiGet)
    const loaded = vi.fn()
    view.addEventListener('object:loaded', loaded)
    view.grampsId = 'TEST-A'
    await view.updateComplete
    view.grampsId = 'TEST-B'
    view.active = false
    old.resolve({data: [{gramps_id: 'TEST-A'}]})
    await old.promise
    await view.updateComplete
    expect(loaded).not.toHaveBeenCalled()
    expect(view._data).toEqual({})
    view.active = true
    await view.updateComplete
    expect(apiGet).toHaveBeenLastCalledWith('/api/people/?gramps_id=TEST-B')
    returning.resolve({data: [{gramps_id: 'TEST-B'}]})
    await vi.waitFor(() => expect(view._data.gramps_id).toBe('TEST-B'))
    expect(view.loading).toBe(false)
  })
})
