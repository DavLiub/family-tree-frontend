import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getInitialAppState} from '../../src/appState.js'
import {token} from '../fixtures/family.js'
import {deferred, mountNavigation, setQuery} from '../fixtures/navigation.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('access_token', token())
  window.grampsjsConfig = {}
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  localStorage.clear()
})

it('uses authenticated API transport while a newer search overtakes an older HTTP error', async () => {
  const pending = new Map()
  const fetch = vi.fn((url, init) => {
    const request = new URL(url)
    expect(request.origin).toBe('http://localhost:5555')
    expect(request.pathname).toBe('/api/search/')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe(
      `Bearer ${localStorage.getItem('access_token')}`
    )
    expect(request.searchParams.get('page')).toBe('1')
    const response = deferred()
    pending.set(request.searchParams.get('query'), response)
    return response.promise
  })
  vi.stubGlobal('fetch', fetch)
  const state = getInitialAppState()
  const view = await mountNavigation('search', state.apiGet, state)
  setQuery(view, 'Synthetic old')
  const old = view._executeSearch()
  await vi.waitFor(() => expect(pending.has('Synthetic old')).toBe(true))
  const query = 'Synthetic Éster & בן #1?'
  setQuery(view, query)
  const latest = view._executeSearch()
  await vi.waitFor(() => expect(pending.has(query)).toBe(true))
  const rows = [{object_type: 'person', object: {handle: 'synthetic-latest'}}]
  pending.get(query).resolve(
    new Response(JSON.stringify(rows), {
      status: 200,
      headers: {'X-Total-Count': '21'},
    })
  )
  await latest
  expect(view._data).toEqual(rows)
  expect(view._totalCount).toBe(21)
  expect(view._pages).toBe(2)
  pending.get('Synthetic old').resolve(
    new Response(JSON.stringify({message: 'Obsolete synthetic error'}), {
      status: 500,
    })
  )
  await old
  expect(view._data).toEqual(rows)
  expect(view.error).toBe(false)
  expect(view.loading).toBe(false)
  expect(fetch).toHaveBeenCalledTimes(2)
})
