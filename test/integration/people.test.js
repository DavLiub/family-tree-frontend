import {afterEach, describe, expect, it, vi} from 'vitest'
import '../../src/views/GrampsjsViewPeople.js'
import {people} from '../fixtures/people.js'

vi.mock('tippy.js', () => ({default: () => ({setContent: vi.fn()})}))

function deferred() {
  let complete
  let fail
  const promise = new Promise((resolve, reject) => {
    complete = resolve
    fail = reject
  })
  return {promise, resolve: complete, reject: fail}
}

async function mountPeople(apiGet, settings = {}) {
  window.grampsjsConfig = {}
  const view = document.createElement('grampsjs-view-people')
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    settings,
    permissions: {canAdd: true, canEdit: true},
    apiGet: url =>
      url.startsWith('/api/people/')
        ? apiGet(url)
        : Promise.resolve({data: []}),
    updateSettings: vi.fn(),
  }
  view.active = true
  document.body.append(view)
  await view.updateComplete
  return view
}

const result = rows => ({data: rows, total_count: rows.length})
const table = view => view.shadowRoot.querySelector('grampsjs-table')
const filters = view => view.shadowRoot.querySelector('grampsjs-filters')

async function settleRows(view, count) {
  await vi.waitFor(() => expect(view._data).toHaveLength(count))
  await view.updateComplete
  if (table(view)) await table(view).updateComplete
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('family people list', () => {
  it('puts a full name and secondary ID before unmodified textual dates', async () => {
    const view = await mountPeople(async () => result(people.slice(0, 3)))
    await settleRows(view, 3)
    expect(view._visibleColumns.map(column => column.key)).toEqual([
      'name',
      'birth',
      'death',
    ])
    const root = table(view).shadowRoot
    const first = root.querySelector('tbody tr')
    expect(first.querySelector('.cell-primary').textContent).toContain(
      'Alexandria Synthetic Example'
    )
    expect(first.querySelector('.cell-secondary').textContent).toContain(
      'TEST-I0001'
    )
    expect(first.textContent).toContain('about 1900')
    expect(first.textContent).toContain('after 1970')
    expect(root.textContent).toContain('before 1890')
    expect(root.textContent).toContain('during the winter')
    expect(root.textContent).not.toContain('[object Object]')
  })

  it('shows explicit missing-name and missing-date states without inventing dates', async () => {
    const view = await mountPeople(async () => result(people.slice(-1)))
    await settleRows(view, 1)
    const root = table(view).shadowRoot
    expect(root.querySelector('.cell-primary').textContent).toContain(
      'Name not recorded'
    )
    expect(root.textContent.match(/Not recorded/g)).toHaveLength(2)
    expect(root.textContent).toContain('TEST-I0048')
    expect(root.textContent).not.toContain('undefined')
  })

  it('keeps saved legacy columns, server sorting, and raw handles for batch selection', async () => {
    const requests = []
    const view = await mountPeople(
      async url => {
        requests.push(new URL(url, 'http://synthetic.invalid').searchParams)
        return result(people.slice(0, 2))
      },
      {columns: {people: ['grampsId', 'surname', 'given', 'birth']}}
    )
    await settleRows(view, 2)
    expect(view._visibleColumns.map(column => column.key)).toEqual([
      'grampsId',
      'surname',
      'given',
      'birth',
    ])
    view._page = 2
    view._handleTableSortChanged({detail: {key: 'birth', descending: false}})
    await vi.waitFor(() => expect(requests.at(-1).get('sort')).toBe('+birth'))
    expect(requests.at(-1).get('page')).toBe('1')
    await settleRows(view, 2)
    view._toggleSelectionMode()
    view._handleSelectionChanged({detail: {indices: [0, 1]}})
    expect(view._selectedHandles).toEqual([
      'synthetic-person',
      'synthetic-list-person-1',
    ])
    expect(view._supportsMerge).toBe(true)
    expect(view._supportsDelete).toBe(true)
  })

  it('does not let an older rejection replace a newer page or clear its loading state', async () => {
    const pending = []
    const view = await mountPeople(() => {
      const request = deferred()
      pending.push(request)
      return request.promise
    })
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    expect(
      view.shadowRoot.querySelector('[role="status"]').textContent
    ).toContain('Loading people...')
    view._page = 2
    await vi.waitFor(() => expect(pending).toHaveLength(2))
    pending[0].reject(new Error('Obsolete synthetic failure'))
    await Promise.resolve()
    expect(view.loading).toBe(true)
    pending[1].resolve(result(people.slice(24, 26)))
    await settleRows(view, 2)
    expect(view._data[0].grampsId).toBe('TEST-I0025')
    expect(view.error).toBe(false)
    expect(view.loading).toBe(false)
  })

  it('ignores an old success after the latest request failed', async () => {
    const pending = []
    const view = await mountPeople(() => {
      const request = deferred()
      pending.push(request)
      return request.promise
    })
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    view._page = 2
    await vi.waitFor(() => expect(pending).toHaveLength(2))
    pending[1].resolve({error: 'Current synthetic failure'})
    await vi.waitFor(() => expect(view.error).toBe(true))
    pending[0].resolve(result(people.slice(0, 2)))
    await Promise.resolve()
    await view.updateComplete
    expect(view._data).toEqual([])
    expect(table(view)).toBeNull()
    expect(view._errorMessage).toBe('Current synthetic failure')
  })

  it('retains query, rules, page and sort when returning from a person', async () => {
    vi.stubGlobal('requestAnimationFrame', callback => {
      callback()
      return 0
    })
    const apiGet = vi.fn().mockResolvedValue({
      data: people.slice(0, 2),
      total_count: 48,
    })
    const view = await mountPeople(apiGet)
    await settleRows(view, 2)
    const rule = {name: 'Synthetic opaque rule', values: ['synthetic']}
    filters(view).query = 'Synthetic query context'
    filters(view)._pills = [{rule}]
    view._page = 2
    view._sort = '+birth'
    await vi.waitFor(() => {
      const url = new URL(
        apiGet.mock.calls.at(-1)[0],
        'http://synthetic.invalid'
      )
      expect(url.searchParams.get('page')).toBe('2')
      expect(url.searchParams.get('sort')).toBe('+birth')
    })
    await settleRows(view, 2)
    const count = apiGet.mock.calls.length
    const nav = vi.fn()
    view.addEventListener('nav', nav)
    view._handleTableRowClick({detail: {rowNumber: 0}})
    expect(nav.mock.calls[0][0].detail.path).toBe('person/TEST-I0001')
    view.active = false
    await view.updateComplete
    view.active = true
    await view.updateComplete
    expect(view._page).toBe(2)
    expect(view._sort).toBe('+birth')
    expect(filters(view).query).toBe('Synthetic query context')
    expect(filters(view).filters).toEqual([rule])
    expect(apiGet).toHaveBeenCalledTimes(count)
  })

  it('keeps the failed query and page for retry, without redisplaying stale rows as current results', async () => {
    const apiGet = vi.fn().mockResolvedValue(result(people.slice(0, 2)))
    const view = await mountPeople(apiGet)
    await settleRows(view, 2)
    filters(view).query = 'synthetic-query-context'
    apiGet.mockResolvedValue({error: 'Synthetic people failure'})
    await view._fetchData()
    await vi.waitFor(() => expect(view.error).toBe(true))
    await view.updateComplete
    expect(filters(view).query).toBe('synthetic-query-context')
    expect(
      view.shadowRoot.querySelector('[role="alert"]').textContent
    ).toContain('Synthetic people failure')
    expect(table(view)).toBeNull()
    apiGet.mockResolvedValue(result([]))
    view.shadowRoot.querySelector('.list-state md-outlined-button').click()
    await vi.waitFor(() => expect(view.error).toBe(false))
    await settleRows(view, 0)
    expect(apiGet.mock.calls.at(-1)[0]).toContain('synthetic-query-context')
    expect(view.shadowRoot.textContent).toContain('No people found')
  })
})
