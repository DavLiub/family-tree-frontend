import {test, expect, noOverflow} from './site.js'

async function openDrawer(page, lang = 'en') {
  const menu = page.locator('grampsjs-main-menu')
  const people = menu.locator('a[href="/people"]')
  if (!(await people.isVisible())) {
    await page
      .locator('grampsjs-app-bar')
      .getByRole('button', {name: lang === 'ru' ? 'Меню' : 'Menu', exact: true})
      .click()
  }
  await expect(people).toBeVisible()
  return menu
}

test('family menu exposes primary links, toggles extra tools by keyboard and navigates', async ({
  page,
  site,
}) => {
  await site.open('/person/TEST-I0001')
  await expect(
    page
      .locator('grampsjs-view-person h2')
      .filter({hasText: 'Alexandria Synthetic'})
  ).toBeVisible()
  const menu = await openDrawer(page)
  const nav = menu.getByRole('navigation', {
    name: 'Main navigation',
    exact: true,
  })
  const primary = [
    ['Family Tree', '/tree'],
    ['People', '/people'],
    ['Photos and documents', '/medialist'],
  ]
  for (const [name, href] of primary) {
    const link = nav.getByRole('link', {name, exact: true})
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', href)
  }
  await expect(
    nav.getByRole('link', {name: 'People', exact: true})
  ).toHaveAttribute('aria-current', 'page')
  const extra = menu.locator('details')
  const summary = extra.locator('summary')
  await expect(summary).toHaveAccessibleName('More')
  await expect(extra).not.toHaveAttribute('open', '')
  await expect(nav.getByRole('link', {name: 'Map', exact: true})).toBeHidden()
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(extra).toHaveAttribute('open', '')
  await expect(nav.getByRole('link', {name: 'Map', exact: true})).toBeVisible()
  await summary.focus()
  await page.keyboard.press('Space')
  await expect(extra).not.toHaveAttribute('open', '')
  await nav.getByRole('link', {name: 'People', exact: true}).click()
  await expect(page).toHaveURL(/\/people$/)
  await expect(
    page.locator('grampsjs-view-people').getByText('TEST-I0001', {exact: true})
  ).toBeVisible()
  await openDrawer(page)
  await nav.getByRole('link', {name: 'Family Tree', exact: true}).click()
  await expect(page).toHaveURL(/\/tree$/)
  await expect(
    page
      .locator('grampsjs-view-tree')
      .getByText('No Home Person set.', {exact: false})
  ).toBeVisible()
  await noOverflow(page)
})

test('Russian family menu fits a 320px drawer and reveals additional sections', async ({
  page,
  site,
}) => {
  await page.setViewportSize({width: 320, height: 740})
  await site.open('/person/TEST-I0001', true, {lang: 'ru', theme: 'dark'})
  await expect(
    page
      .locator('grampsjs-view-person h2')
      .filter({hasText: 'Alexandria Synthetic'})
  ).toBeVisible()
  const menu = await openDrawer(page, 'ru')
  const photos = menu.getByRole('link', {name: 'Фото и документы', exact: true})
  await expect(photos).toBeVisible()
  await expect(photos).toHaveAttribute('href', '/medialist')
  const box = await photos.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
  const summary = menu.locator('summary')
  await expect(summary).toHaveAccessibleName('Дополнительно')
  await summary.click()
  await expect(menu.locator('a[href="/families"]')).toBeVisible()
  await expect
    .poll(() => menu.evaluate(el => el.scrollWidth <= el.clientWidth))
    .toBe(true)
})
