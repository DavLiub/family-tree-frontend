import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  getInitialAppState,
  appStateUpdatePermissions,
} from '../../src/appState.js'
import {person, token} from '../fixtures/family.js'

describe('real appState → Auth → API transport', () => {
  const cleanups = []
  function listen(name) {
    const events = []
    const handler = event => events.push(event.detail)
    window.addEventListener(name, handler)
    cleanups.push(() => window.removeEventListener(name, handler))
    return events
  }

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('access_token', token())
    window.grampsjsConfig = {}
  })

  afterEach(() => {
    cleanups.splice(0).forEach(cleanup => cleanup())
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('sends authenticated full records and announces one successful mutation', async () => {
    const changes = listen('db:changed')
    const counters = listen('requests:changed')
    const fixture = structuredClone(person)
    const fetch = vi.fn(async (url, init) => {
      expect(url).toBe('http://localhost:5555/api/people/synthetic-person')
      expect(init.method).toBe('PUT')
      expect(init.headers.Authorization).toBe(`Bearer ${tokenValue}`)
      expect(JSON.parse(init.body)).toEqual(fixture)
      return new Response(JSON.stringify([{new: fixture}]), {status: 200})
    })
    const tokenValue = localStorage.getItem('access_token')
    vi.stubGlobal('fetch', fetch)
    const state = appStateUpdatePermissions(getInitialAppState())
    expect(state.permissions.canEdit).toBe(true)
    const result = await state.apiPut('/api/people/synthetic-person', fixture)
    expect(result.data[0].new.alternate_names).toEqual(person.alternate_names)
    expect(fixture).toEqual(person)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(changes).toHaveLength(1)
    expect(counters[0]).toMatchObject({activeSave: 1})
    expect(counters.at(-1)).toMatchObject({
      activeSave: 0,
      lastSaveSucceeded: true,
    })
  })

  it('returns permission denial without db event and completes the save counter', async () => {
    const changes = listen('db:changed')
    const counters = listen('requests:changed')
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({message: 'Synthetic forbidden'}), {
          status: 403,
        })
    )
    vi.stubGlobal('fetch', fetch)
    const result = await getInitialAppState().apiPut(
      '/api/people/synthetic-person',
      person
    )
    expect(result).toMatchObject({error: 'Synthetic forbidden'})
    expect(result.errorDetail).toMatchObject({status: 403, method: 'PUT'})
    expect(changes).toHaveLength(0)
    expect(counters.at(-1)).toMatchObject({
      activeSave: 0,
      lastSaveSucceeded: false,
    })
  })

  it('pins the read tree and refuses a write after another tab changes tokens', async () => {
    const changes = listen('db:changed')
    const fetch = vi.fn(
      async () => new Response(JSON.stringify([person]), {status: 200})
    )
    vi.stubGlobal('fetch', fetch)
    const state = getInitialAppState()
    expect((await state.apiGet('/api/people/')).data).toEqual([person])
    localStorage.setItem('access_token', token('different-synthetic-tree'))
    const result = await state.apiDelete('/api/people/synthetic-person')
    expect(result.error).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(changes).toHaveLength(0)
  })
})
