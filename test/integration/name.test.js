import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getInitialAppState} from '../../src/appState.js'
import {GrampsjsViewPerson} from '../../src/views/GrampsjsViewPerson.js'
import {person, token} from '../fixtures/family.js'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('access_token', token())
  window.grampsjsConfig = {}
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

it('real name update keeps hidden fields and retries a failed authenticated PUT', async () => {
  const fixture = {
    ...structuredClone(person),
    private: true,
    attribute_list: [{type: 'Synthetic attribute', value: 'must survive'}],
    note_list: ['synthetic-hidden-note'],
  }
  const name = {...fixture.primary_name, first_name: 'Alexandria Revised'}
  const changes = vi.fn()
  window.addEventListener('db:changed', changes)
  const sent = []
  let current = fixture
  const fetch = vi.fn(async (url, init) => {
    expect(init.headers.Authorization).toBe(
      `Bearer ${localStorage.getItem('access_token')}`
    )
    if (init.method === 'GET') {
      expect(url).toContain('/api/people/?gramps_id=TEST-I0001&')
      return new Response(JSON.stringify([current]), {status: 200})
    }
    expect(url).toBe('http://localhost:5555/api/people/synthetic-person')
    expect(init.method).toBe('PUT')
    const payload = JSON.parse(init.body)
    sent.push(payload)
    if (sent.length === 1) {
      return new Response(JSON.stringify({message: 'Synthetic save failure'}), {
        status: 500,
      })
    }
    current = {...fixture, ...payload}
    return new Response(JSON.stringify([{new: current}]), {status: 200})
  })
  vi.stubGlobal('fetch', fetch)
  const view = new GrampsjsViewPerson()
  view.appState = getInitialAppState()
  view.grampsId = fixture.gramps_id
  view._data = fixture
  try {
    const failed = await view.updateName({index: 0, name}, fixture)
    expect(failed.error).toBe('Synthetic save failure')
    expect(changes).not.toHaveBeenCalled()
    expect(view._data).toEqual(fixture)
    const saved = await view.updateName({index: 0, name}, fixture)
    expect(saved).not.toHaveProperty('error')
    await vi.waitFor(() => {
      expect(view._data.primary_name).toEqual(name)
      expect(view.loading).toBe(false)
    })
    expect(changes).toHaveBeenCalledTimes(1)
    expect(sent).toHaveLength(2)
    for (const payload of sent) {
      expect(payload.primary_name).toEqual(name)
      expect(payload.alternate_names).toEqual(fixture.alternate_names)
      expect(payload.private).toBe(true)
      expect(payload.attribute_list).toEqual(fixture.attribute_list)
      expect(payload.note_list).toEqual(fixture.note_list)
      for (const field of ['profile', 'extended', 'backlinks', 'formatted']) {
        expect(payload).not.toHaveProperty(field)
      }
    }
    expect(fixture.primary_name).toEqual(person.primary_name)
  } finally {
    window.removeEventListener('db:changed', changes)
  }
})
