import {describe, it, expect, vi} from 'vitest'
import {loadTreeRelations} from '../../src/treeRelations.js'
import {GrampsjsViewTree} from '../../src/views/GrampsjsViewTree.js'

describe('tree relationships', () => {
  it('uses root-to-relative direction, skips self, and limits concurrency', async () => {
    let active = 0
    let maximum = 0
    const api = vi.fn(async () => {
      maximum = Math.max(maximum, ++active)
      await Promise.resolve()
      active -= 1
      return {data: {relationship_string: 'mother'}}
    })
    const people = Array.from({length: 10}, (_, i) => ({handle: `p${i}`}))
    const cache = new Map()
    const result = await loadTreeRelations(people, 'p0', api, 'ru', cache)
    expect(result.p0).toBeUndefined()
    expect(Object.keys(result)).toHaveLength(9)
    expect(
      api.mock.calls.every(([url]) => url.startsWith('/api/relations/p0/'))
    ).toBe(true)
    expect(maximum).toBeLessThanOrEqual(4)
    await loadTreeRelations(people, 'p0', api, 'ru', cache)
    expect(api).toHaveBeenCalledTimes(9)
    await loadTreeRelations(people.slice(0, 2), 'p1', api, 'en', cache)
    expect(api).toHaveBeenLastCalledWith(
      '/api/relations/p1/p0?depth=20&locale=en'
    )
  })

  it('leaves unknown relationships empty and allows retry after failure', async () => {
    const api = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({data: {relationship_string: ''}})
    const cache = new Map()
    const people = [{handle: 'root'}, {handle: 'other'}]
    expect(await loadTreeRelations(people, 'root', api, 'en', cache)).toEqual({
      other: '',
    })
    await loadTreeRelations(people, 'root', api, 'en', cache)
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('ignores a late relationship for the previous central person', async () => {
    let complete
    const view = new GrampsjsViewTree()
    view.appState = {
      i18n: {lang: 'en'},
      apiGet: () =>
        new Promise(resolve => {
          complete = resolve
        }),
    }
    view.grampsId = 'Iroot'
    const loading = view._loadRelations(
      [{gramps_id: 'Iroot', handle: 'root'}, {handle: 'other'}],
      0
    )
    await Promise.resolve()
    view.grampsId = 'Iother'
    complete({data: {relationship_string: 'mother'}})
    await loading
    expect(view._relations).toEqual({})
  })
})
