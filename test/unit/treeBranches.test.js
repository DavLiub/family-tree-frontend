import {describe, it, expect, vi} from 'vitest'
import {TreeBranches} from '../../src/treeBranches.js'

const family = (handle, father, mother, children) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(ref => ({ref, frel: 'Birth', mrel: 'Birth'})),
})
const person = (handle, families = []) => ({
  handle,
  gramps_id: `I_${handle}`,
  extended: {families},
})
const f1 = family('f1', 'aunt', '', ['cousin'])
const f2 = family('f2', 'cousin', 'partner', ['child'])
const aunt = person('aunt', [f1])
const cousin = person('cousin', [f2])
const partner = person('partner', [f2])
const child = person('child')
const all = [aunt, cousin, partner, child]
const handles = store => store.snapshot().people.map(p => p.handle)

describe('descendant branches', () => {
  it('opens all generations and spouses, supports nested collapse, and keeps base people', async () => {
    const changed = vi.fn()
    const store = new TreeBranches(changed)
    store.reset([person('centre'), aunt])
    const api = vi.fn(async () => ({data: all, total_count: '4'}))
    expect(store.snapshot().states.centre.available).toBe(false)
    await store.toggle('aunt', api, 'ru')
    expect(handles(store)).toEqual([
      'centre',
      'aunt',
      'cousin',
      'partner',
      'child',
    ])
    const url = new URL(api.mock.calls[0][0], 'http://test')
    expect(JSON.parse(url.searchParams.get('rules')).rules[0]).toEqual({
      name: 'IsDescendantFamilyOf',
      values: ['I_aunt', '1'],
    })
    expect(store.snapshot().states.cousin.expanded).toBe(true)
    await store.toggle('cousin', api, 'ru')
    expect(handles(store)).toEqual(['centre', 'aunt', 'cousin'])
    expect(store.snapshot().states.cousin.expanded).toBe(false)
    await store.toggle('aunt', api, 'ru')
    expect(handles(store)).toEqual(['centre', 'aunt'])
    await store.toggle('aunt', api, 'ru')
    expect(handles(store)).toContain('cousin')
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('keeps a shared descendant supplied by another open family branch', async () => {
    const otherFamily = family('otherFamily', 'other', '', ['cousin'])
    const other = person('other', [otherFamily])
    const store = new TreeBranches(() => {})
    store.reset([aunt, other])
    await store.toggle('aunt', async () => ({data: all}), 'en')
    await store.toggle(
      'other',
      async () => ({data: [other, cousin, partner, child]}),
      'en'
    )
    await store.toggle('aunt', () => {}, 'en')
    expect(handles(store)).toEqual(
      expect.arrayContaining(['cousin', 'partner', 'child'])
    )
  })

  it('loads every page without a generation cutoff', async () => {
    const store = new TreeBranches(() => {})
    store.reset([aunt])
    const api = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({length: 100}, (_, i) => person(`p${i}`)),
        total_count: '101',
      })
      .mockResolvedValueOnce({data: [cousin], total_count: '101'})
    await store.toggle('aunt', api, 'en')
    expect(api).toHaveBeenCalledTimes(2)
    expect(api.mock.calls[1][0]).toContain('page=2&pagesize=100')
    expect(store.loaded.get('aunt')).toHaveLength(101)
  })

  it('does not leave partial data after failure and allows retry', async () => {
    const store = new TreeBranches(() => {})
    store.reset([aunt])
    const api = vi
      .fn()
      .mockResolvedValueOnce({error: 'Synthetic failure'})
      .mockResolvedValueOnce({data: all})
    await expect(store.toggle('aunt', api, 'en')).rejects.toThrow(
      'Synthetic failure'
    )
    expect(handles(store)).toEqual(['aunt'])
    expect(store.snapshot().states.aunt.busy).toBe(false)
    await store.toggle('aunt', api, 'en')
    expect(handles(store)).toContain('child')
  })

  it('ignores duplicate taps and stale results after a new centre is loaded', async () => {
    const store = new TreeBranches(() => {})
    store.reset([aunt])
    let complete
    const api = vi.fn(
      () =>
        new Promise(resolve => {
          complete = resolve
        })
    )
    const loading = store.toggle('aunt', api, 'en')
    await store.toggle('aunt', api, 'en')
    expect(api).toHaveBeenCalledTimes(1)
    store.reset([person('newCentre')])
    complete({data: all})
    await loading
    expect(handles(store)).toEqual(['newCentre'])
  })

  it('terminates when family links contain a cycle', async () => {
    const loop = person('cousin', [family('cycle', 'cousin', '', ['aunt'])])
    const store = new TreeBranches(() => {})
    store.reset([aunt])
    await store.toggle('aunt', async () => ({data: [aunt, loop]}), 'en')
    expect(handles(store)).toEqual(['aunt', 'cousin'])
  })
})
