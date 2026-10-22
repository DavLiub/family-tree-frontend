import {afterEach, describe, expect, it, vi} from 'vitest'
import {deferred, mountNavigation, setQuery} from '../fixtures/navigation.js'

afterEach(() => {
  document.body.replaceChildren()
  delete window._oldSearchBackend
})

const result = label => ({data: [{label}], total_count: 41})

describe('search request ownership', () => {
  it.each(['success', 'error'])(
    'keeps the latest results after an old %s',
    async outcome => {
      const old = deferred()
      const latest = deferred()
      const view = await mountNavigation(
        'search',
        vi
          .fn()
          .mockReturnValueOnce(old.promise)
          .mockReturnValueOnce(latest.promise)
      )
      setQuery(view, 'Synthetic old')
      const first = view._executeSearch()
      setQuery(view, 'Synthetic latest')
      const second = view._executeSearch()
      latest.resolve(result('latest'))
      await second
      old.resolve(
        outcome === 'success' ? result('old') : {error: 'Old synthetic denial'}
      )
      await first
      expect(view._data).toEqual([{label: 'latest'}])
      expect(view._totalCount).toBe(41)
      expect(view.error).toBe(false)
      expect(view.loading).toBe(false)
    }
  )

  it('keeps loading until the latest response and displays its error', async () => {
    const old = deferred()
    const latest = deferred()
    const view = await mountNavigation(
      'search',
      vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise)
    )
    setQuery(view, 'Old')
    const first = view._executeSearch()
    setQuery(view, 'New')
    const second = view._executeSearch()
    old.resolve(result('old'))
    await first
    expect(view.loading).toBe(true)
    expect(view._data).toEqual([])
    latest.resolve({error: 'Current synthetic failure'})
    await second
    expect(view.loading).toBe(false)
    expect(view.error).toBe(true)
    expect(view._errorMessage).toBe('Current synthetic failure')
  })

  it.each(['clear', 'leave', 'disconnect'])(
    'invalidates pending results on %s',
    async action => {
      const pending = deferred()
      const view = await mountNavigation(
        'search',
        vi.fn().mockReturnValue(pending.promise)
      )
      setQuery(view, 'Synthetic pending')
      const request = view._executeSearch()
      if (action === 'clear') {
        setQuery(view, '')
        await view._executeSearch()
      } else if (action === 'leave') {
        view.active = false
        await view.updateComplete
      } else {
        view.remove()
      }
      pending.resolve(result('obsolete'))
      await request
      expect(view._data).toEqual([])
      expect(view.loading).toBe(false)
      expect(view.error).toBe(false)
      if (action === 'clear') expect(view._totalCount).toBe(-1)
    }
  )

  it.each([false, true])(
    'restarts an interrupted search on return, changed locale=%s',
    async changeLocale => {
      const interrupted = deferred()
      const returning = deferred()
      const apiGet = vi
        .fn()
        .mockReturnValueOnce(interrupted.promise)
        .mockReturnValueOnce(returning.promise)
      const view = await mountNavigation('search', apiGet)
      setQuery(view, 'Synthetic interrupted')
      const first = view._executeSearch()
      view.active = false
      await view.updateComplete
      if (changeLocale) {
        view.appState = {
          ...view.appState,
          i18n: {...view.appState.i18n, lang: 'ru'},
        }
        await view.updateComplete
      }
      expect(apiGet).toHaveBeenCalledTimes(1)
      interrupted.resolve(result('obsolete'))
      await first
      expect(view._data).toEqual([])
      expect(view.loading).toBe(false)
      view.active = true
      await view.updateComplete
      expect(apiGet).toHaveBeenCalledTimes(2)
      const url = new URL(apiGet.mock.calls[1][0], 'http://synthetic.invalid')
      expect(url.searchParams.get('query')).toBe('Synthetic interrupted')
      expect(url.searchParams.get('page')).toBe('1')
      expect(url.searchParams.get('locale')).toBe(changeLocale ? 'ru' : 'en')
      expect(view.loading).toBe(true)
      returning.resolve(result('current'))
      await vi.waitFor(() => expect(view._data).toEqual([{label: 'current'}]))
      expect(view.loading).toBe(false)
      expect(view.error).toBe(false)
    }
  )

  it('resumes a debounced filter change on return without restoring the old result', async () => {
    const filtered = deferred()
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce(result('unfiltered'))
      .mockResolvedValueOnce(result('unfiltered page two'))
      .mockReturnValueOnce(filtered.promise)
    const view = await mountNavigation('search', apiGet)
    setQuery(view, 'Synthetic filtered search')
    await view._executeSearch()
    await view._handlePageChanged({detail: {page: 2}})
    await view.updateComplete
    expect(view._data).toEqual([{label: 'unfiltered page two'}])
    vi.useFakeTimers()
    try {
      view._handleFilterToggle({
        target: {id: 'toggle-person'},
        detail: {checked: true},
      })
      await vi.advanceTimersByTimeAsync(100)
      view.active = false
      await view.updateComplete
      await vi.advanceTimersByTimeAsync(1000)
      expect(apiGet).toHaveBeenCalledTimes(2)
      view.active = true
      await view.updateComplete
      expect(apiGet).toHaveBeenCalledTimes(3)
      const url = new URL(apiGet.mock.calls[2][0], 'http://synthetic.invalid')
      expect(url.searchParams.get('query')).toBe('Synthetic filtered search')
      expect(url.searchParams.get('type')).toBe('person')
      expect(url.searchParams.get('page')).toBe('1')
      expect(view._page).toBe(1)
      expect(view.loading).toBe(true)
      filtered.resolve(result('filtered current'))
      await filtered.promise
      await view.updateComplete
      expect(view._data).toEqual([{label: 'filtered current'}])
      expect(view.loading).toBe(false)
      await vi.advanceTimersByTimeAsync(1000)
      expect(apiGet).toHaveBeenCalledTimes(3)
    } finally {
      view.remove()
      vi.useRealTimers()
    }
  })

  it('invalidates a submitted search when input is edited before resubmission', async () => {
    const pending = deferred()
    const apiGet = vi.fn().mockReturnValue(pending.promise)
    const view = await mountNavigation('search', apiGet)
    setQuery(view, 'Submitted')
    const request = view._executeSearch()
    setQuery(view, 'Edited but not submitted')
    view._handleSearchInput()
    pending.resolve(result('obsolete'))
    await request
    expect(view._data).toEqual([])
    expect(view.loading).toBe(false)
    expect(apiGet).toHaveBeenCalledTimes(1)
    setQuery(view, '')
    view._handleSearchInput()
    expect(view._totalCount).toBe(-1)
    expect(view._page).toBe(1)
  })

  it.each([false, true])(
    'preserves reserved and Unicode characters with old backend=%s',
    async oldBackend => {
      window._oldSearchBackend = oldBackend
      const apiGet = vi.fn().mockResolvedValue(result('encoded'))
      const view = await mountNavigation('search', apiGet)
      view._objectTypes = {...view._objectTypes, person: true}
      const query = 'Éster & בן #1? / +'
      setQuery(view, query)
      await view._executeSearch()
      const url = new URL(apiGet.mock.calls[0][0], 'http://synthetic.invalid')
      expect(url.searchParams.get('query')).toBe(
        oldBackend ? `${query} (type:person)` : query
      )
      expect(url.hash).toBe('')
      expect(url.searchParams.get('page')).toBe('1')
      if (!oldBackend) expect(url.searchParams.get('type')).toBe('person')
    }
  )

  it('refetches in the new locale while the old response cannot finish loading', async () => {
    const english = deferred()
    const russian = deferred()
    const apiGet = vi
      .fn()
      .mockReturnValueOnce(english.promise)
      .mockReturnValueOnce(russian.promise)
    const view = await mountNavigation('search', apiGet)
    setQuery(view, 'Synthetic multilingual')
    const first = view._executeSearch()
    view.appState = {
      ...view.appState,
      i18n: {...view.appState.i18n, lang: 'ru'},
    }
    await view.updateComplete
    expect(apiGet).toHaveBeenCalledTimes(2)
    const url = new URL(apiGet.mock.calls[1][0], 'http://synthetic.invalid')
    expect(url.searchParams.get('locale')).toBe('ru')
    expect(url.searchParams.get('page')).toBe('1')
    english.resolve(result('obsolete English'))
    await first
    expect(view._data).toEqual([])
    expect(view.loading).toBe(true)
    russian.resolve(result('current Russian'))
    await vi.waitFor(() =>
      expect(view._data).toEqual([{label: 'current Russian'}])
    )
    expect(view.loading).toBe(false)
    expect(view.error).toBe(false)
  })

  it('starts page one when pagination follows an unsubmitted replacement query', async () => {
    const apiGet = vi.fn().mockResolvedValue(result('synthetic'))
    const view = await mountNavigation('search', apiGet)
    setQuery(view, 'Synthetic query A')
    await view._executeSearch()
    await view._handlePageChanged({detail: {page: 2}})
    expect(view._page).toBe(2)
    setQuery(view, 'Synthetic query B')
    apiGet.mockClear()
    await view._handlePageChanged({detail: {page: 3}})
    await view.updateComplete
    expect(apiGet).toHaveBeenCalledTimes(1)
    const url = new URL(apiGet.mock.calls[0][0], 'http://synthetic.invalid')
    expect(url.searchParams.get('query')).toBe('Synthetic query B')
    expect(url.searchParams.get('page')).toBe('1')
    expect(view._page).toBe(1)
  })

  it('paginates the submitted query, then resets once for a new query, filter and mode', async () => {
    const apiGet = vi.fn().mockResolvedValue(result('synthetic'))
    const view = await mountNavigation('search', apiGet)
    view.dbInfo = {
      server: {semantic_search: true},
      search: {sifts: {count_semantic: 1}},
    }
    setQuery(view, 'Submitted')
    await view._executeSearch()
    await view.updateComplete
    apiGet.mockClear()
    view._handlePageChanged({detail: {page: 2}})
    await vi.waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1))
    await view.updateComplete
    let url = new URL(apiGet.mock.calls[0][0], 'http://synthetic.invalid')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('query')).toBe('Submitted')
    setQuery(view, 'Replacement')
    apiGet.mockClear()
    await view._executeSearch()
    await view.updateComplete
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(view._page).toBe(1)
    url = new URL(apiGet.mock.calls[0][0], 'http://synthetic.invalid')
    expect(url.searchParams.get('query')).toBe('Replacement')
    expect(url.searchParams.get('page')).toBe('1')
    await view._executeSearch(2)
    apiGet.mockClear()
    view._handleFilterToggle({
      target: {id: 'toggle-person'},
      detail: {checked: true},
    })
    await vi.waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1))
    await view.updateComplete
    expect(view._page).toBe(1)
    url = new URL(apiGet.mock.calls[0][0], 'http://synthetic.invalid')
    expect(url.searchParams.get('type')).toBe('person')
    expect(url.searchParams.get('page')).toBe('1')
    await view._executeSearch(2)
    apiGet.mockClear()
    await view._handleModeClick({detail: {value: true}})
    await view.updateComplete
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(view._page).toBe(1)
    url = new URL(apiGet.mock.calls[0][0], 'http://synthetic.invalid')
    expect(url.searchParams.get('semantic')).toBe('1')
    expect(url.searchParams.get('page')).toBe('1')
  })
})
