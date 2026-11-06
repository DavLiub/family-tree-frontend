import {afterEach, describe, expect, it} from 'vitest'
import '../../src/components/GrampsjsMainMenu.js'

async function mountMenu(page = 'people', overrides = {}) {
  const menu = document.createElement('grampsjs-main-menu')
  menu.appState = {
    path: {page},
    i18n: {lang: 'en', strings: {}},
    frontendConfig: {},
    permissions: {canUseChat: true, canViewPrivate: true},
    dbInfo: {server: {chat: true}},
    getNotifications: () => [{read: false}, {read: true}],
    ...overrides,
  }
  document.body.append(menu)
  await menu.updateComplete
  return menu
}

const links = menu => [...menu.shadowRoot.querySelectorAll('a')]
const hrefs = entries => entries.map(link => link.getAttribute('href'))
const linkAt = (menu, href) =>
  menu.shadowRoot.querySelector(`a[href="${href}"]`)

async function navigate(menu, page) {
  menu.appState = {...menu.appState, path: {page}}
  await menu.updateComplete
}

afterEach(() => document.body.replaceChildren())

describe('family main menu', () => {
  it('puts family destinations first and preserves every remaining section behind More', async () => {
    const menu = await mountMenu()
    expect(hrefs(links(menu).filter(link => !link.closest('details')))).toEqual(
      ['/tree', '/people', '/medialist', '/', '/bookmarks', '/notifications']
    )
    expect(
      menu.shadowRoot.querySelector('nav').getAttribute('aria-label')
    ).toBe('Main navigation')
    expect(menu.shadowRoot.querySelector('summary').textContent.trim()).toBe(
      'More'
    )
    expect(menu.shadowRoot.querySelector('details').open).toBe(false)
    expect(
      hrefs(links(menu).filter(link => link.closest('details'))).sort()
    ).toEqual(
      [
        '/blog',
        '/timeline',
        '/map',
        '/dna-matches',
        '/families',
        '/chat',
        '/recent',
        '/tasks',
        '/reports',
        '/export',
        '/revisions',
      ].sort()
    )
    expect(new Set(hrefs(links(menu))).size).toBe(links(menu).length)
  })

  it.each([
    ['people', '/people', false],
    ['person', '/people', false],
    ['new_person', '/people', false],
    ['media', '/medialist', false],
    ['medialist', '/medialist', false],
    ['new_media', '/medialist', false],
    ['tree', '/tree', false],
    ['family', '/families', true],
    ['families', '/families', true],
    ['source', '/families', true],
    ['citations', '/families', true],
    ['report', '/reports', true],
    ['dna-chromosome', '/dna-matches', true],
    ['ydna', '/dna-matches', true],
  ])('identifies %s using one real current link', async (page, href, open) => {
    const menu = await mountMenu(page)
    const selected = menu.shadowRoot.querySelectorAll('a[aria-current="page"]')
    expect(hrefs([...selected])).toEqual([href])
    expect(linkAt(menu, href)).not.toBeNull()
    expect(menu.shadowRoot.querySelector('details').open).toBe(open)
  })

  it('reveals a newly selected extra section while respecting an explicit collapse on rerender', async () => {
    const menu = await mountMenu('people')
    const more = menu.shadowRoot.querySelector('details')
    await navigate(menu, 'sources')
    expect(more.open).toBe(true)
    more.open = false
    // Happy DOM does not model native summary activation; the browser test does.
    more.dispatchEvent(new Event('toggle'))
    window.dispatchEvent(
      new CustomEvent('notifications:changed', {detail: {unreadCount: 3}})
    )
    await menu.updateComplete
    expect(more.open).toBe(false)
    expect(linkAt(menu, '/notifications').textContent).toContain('3')
    await navigate(menu, 'export')
    expect(more.open).toBe(true)
    expect(linkAt(menu, '/export').getAttribute('aria-current')).toBe('page')
  })

  it('keeps permission and DNA visibility rules rather than exposing restricted sections', async () => {
    const menu = await mountMenu('people', {
      frontendConfig: {hideDNALink: true},
      permissions: {canUseChat: false, canViewPrivate: false},
    })
    for (const href of ['/dna-matches', '/chat', '/revisions'])
      expect(linkAt(menu, href)).toBeNull()
    menu.appState = {
      ...menu.appState,
      permissions: {canUseChat: true, canViewPrivate: true},
      dbInfo: {server: {chat: false}},
    }
    await menu.updateComplete
    expect(linkAt(menu, '/chat')).toBeNull()
    expect(linkAt(menu, '/revisions')).not.toBeNull()
  })

  it('updates the visible notification count and removes the listener when detached', async () => {
    const menu = await mountMenu()
    expect(linkAt(menu, '/notifications').textContent).toContain('1')
    window.dispatchEvent(
      new CustomEvent('notifications:changed', {detail: {unreadCount: 7}})
    )
    await menu.updateComplete
    expect(linkAt(menu, '/notifications').textContent).toContain('7')
    menu.remove()
    window.dispatchEvent(
      new CustomEvent('notifications:changed', {detail: {unreadCount: 9}})
    )
    expect(menu.unreadCount).toBe(7)
  })
})
