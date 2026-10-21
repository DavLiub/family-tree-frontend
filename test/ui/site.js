import {test as base, expect} from '@playwright/test'
import {person, token} from '../fixtures/family.js'

const origin = 'http://127.0.0.1:4173'
const pages = new Set(['/', '/login', '/people', '/person/TEST-I0001', '/tree'])
const asset =
  /\.(?:js|css|json|svg|png|jpe?g|gif|ico|woff2?|ttf|wasm|webmanifest)$/
const metadata = {
  gramps_webapi: {version: '3.17.0'},
  gramps: {version: '6.0.0'},
  database: {schema: '22', actual_schema: 22},
  locale: {language: 'en'},
  object_counts: {people: 1, families: 0, sources: 0, citations: 0, media: 0},
  search: {sifts: {version: '1', count: 1}},
  server: {},
}

export const test = base.extend({
  site: async ({context, page}, use) => {
    // Fail at the fixture boundary, before an incomplete API record reaches Lit.
    expect(
      person.backlinks,
      'profile=all requires top-level backlinks'
    ).toEqual({})
    expect(person.extended.backlinks).toEqual({})
    for (const key of [
      'events',
      'families',
      'parent_families',
      'media',
      'citations',
      'notes',
      'tags',
    ]) {
      expect(person.extended[key], `extended.${key} must be an array`).toEqual(
        expect.any(Array)
      )
    }
    expect(person.profile).toMatchObject({
      name_given: expect.any(String),
      name_surname: expect.any(String),
      birth: {},
      death: {},
      events: [],
      families: [],
    })
    for (const name of [person.primary_name, ...person.alternate_names]) {
      expect(name.type).toEqual(expect.any(String))
      expect(name.surname_list).toEqual(expect.any(Array))
    }
    const unexpected = []
    const errors = []
    const accessToken = token()
    let signedIn = false
    const recordError = owner => error =>
      errors.push({
        url: owner.url(),
        message: error.message,
        stack: error.stack || error.message,
      })
    page.on('pageerror', recordError(page))
    context.on('page', extra => {
      unexpected.push('Unexpected additional page')
      extra.on('pageerror', recordError(extra))
    })
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()
      const authorization = request.headers().authorization
      if (authorization && authorization !== `Bearer ${accessToken}`) {
        unexpected.push(`${method} ${url.pathname}: unexpected authorization`)
        return route.abort('blockedbyclient')
      }
      const reply = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          headers: Array.isArray(data)
            ? {'X-Total-Count': String(data.length)}
            : {},
          body: JSON.stringify(data),
        })
      if (url.origin !== origin) {
        unexpected.push(`${method} ${url.origin}${url.pathname}`)
        return route.abort('blockedbyclient')
      }
      if (
        signedIn &&
        url.pathname.startsWith('/api/') &&
        url.pathname !== '/api/oidc/config/' &&
        url.pathname !== '/api/token/create_owner/' &&
        authorization !== `Bearer ${accessToken}`
      ) {
        unexpected.push(
          `${method} ${url.pathname}: missing synthetic authorization`
        )
        return route.abort('blockedbyclient')
      }
      if (!url.pathname.startsWith('/api/')) {
        if (
          method === 'GET' &&
          (pages.has(url.pathname) || asset.test(url.pathname))
        ) {
          return route.continue()
        }
      } else if (method === 'GET' && url.pathname === '/api/metadata/') {
        return signedIn
          ? reply(metadata)
          : reply({message: 'Unauthorized'}, 401)
      } else if (
        method === 'POST' &&
        url.pathname === '/api/token/create_owner/'
      ) {
        // A simulated refusal: no request ever reaches a backend.
        return reply({message: 'Already configured'}, 405)
      } else if (method === 'GET' && url.pathname === '/api/oidc/config/') {
        return reply({enabled: false})
      } else if (method === 'POST' && url.pathname === '/api/translations/en') {
        return reply(
          request
            .postDataJSON()
            .strings.map(original => ({original, translation: original}))
        )
      } else if (signedIn && method === 'GET') {
        if (url.pathname === '/api/trees/-/config') return reply({})
        if (url.pathname === '/api/tasks/') return reply([])
        if (url.pathname === '/api/people/') return reply([person])
        // The People list initializes its tag filter after breadcrumb navigation.
        if (
          new URL(page.url()).pathname === '/people' &&
          url.pathname === '/api/tags/' &&
          url.search === ''
        ) {
          return reply([])
        }
        // The hidden home-person picker initializes the Changed tab (index 1).
        // md-tabs change → _setMode('changed') → _fetchData → _getFetchUrl('').
        const picker = {
          locale: 'en',
          profile: 'all',
          page: '1',
          pagesize: '20',
          sort: '-change',
          query: '*',
          type: 'person',
        }
        if (
          new URL(page.url()).pathname === '/tree' &&
          url.pathname === '/api/search/' &&
          [...url.searchParams].length === Object.keys(picker).length &&
          Object.entries(picker).every(
            ([key, value]) => url.searchParams.get(key) === value
          )
        ) {
          return reply([
            {object_type: 'person', handle: person.handle, object: person},
          ])
        }
        if (url.pathname === '/api/people/synthetic-person/timeline')
          return reply([])
        if (
          url.pathname ===
          '/api/transactions/history/objects/Person/synthetic-person'
        )
          return reply([])
      }
      unexpected.push(`${method} ${url.pathname}${url.search}`)
      return route.abort('blockedbyclient')
    })
    const site = {
      async open(path, auth = true) {
        signedIn = auth
        await context.addInitScript(
          ({accessToken, auth}) => {
            localStorage.clear()
            localStorage.setItem(
              'grampsjs_settings',
              JSON.stringify({lang: 'en'})
            )
            if (auth) localStorage.setItem('access_token', accessToken)
          },
          {accessToken, auth}
        )
        await page.goto(path)
      },
    }
    await use(site)
    expect(
      unexpected,
      'Every network request must be explicitly local or mocked'
    ).toEqual([])
    expect(errors, 'No uncaught browser exceptions').toEqual([])
  },
})

export {expect}

export async function noOverflow(page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }))
    )
    .toEqual({
      width: page.viewportSize().width,
      scroll: page.viewportSize().width,
    })
}
