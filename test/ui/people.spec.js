import {test, expect, noOverflow} from './site.js'

const peopleView = page => page.locator('grampsjs-view-people')
const rows = view => view.locator('grampsjs-table tbody tr')

test('people emphasize names and keep distinguishing textual dates and IDs', async ({
  page,
  site,
}) => {
  site.people()
  await site.open('/people')
  const view = peopleView(page)
  await expect(rows(view)).toHaveCount(24)
  const first = rows(view).first()
  await expect(first.locator('.cell-primary')).toHaveText(
    'Alexandria Synthetic Example'
  )
  await expect(first.locator('.cell-secondary')).toContainText('TEST-I0001')
  await expect(first).toContainText('about 1900')
  await expect(first).toContainText('after 1970')
  await expect(rows(view).nth(1)).toContainText('before 1890')
  await expect(rows(view).nth(1)).toContainText('during the winter')
  await noOverflow(page)
})

test('people error can be retried and an empty result is explained', async ({
  page,
  site,
}) => {
  const state = site.people('error')
  await site.open('/people')
  const view = peopleView(page)
  await expect(view.getByRole('alert')).toContainText(
    'Synthetic people load failure'
  )
  await expect(rows(view)).toHaveCount(0)
  state.mode = 'empty'
  await view.getByRole('button', {name: 'Retry', exact: true}).click()
  await expect(view.getByRole('status')).toContainText('No people found')
  await expect(view.getByRole('status')).toContainText(
    'Try changing or clearing the filters.'
  )
  await expect(rows(view)).toHaveCount(0)
  expect(state.requests).toHaveLength(2)
})

test('returning from a person preserves list page and scroll position', async ({
  page,
  site,
}) => {
  const state = site.people()
  const [target] = state.records.splice(0, 1)
  state.records.splice(44, 0, target)
  await site.open('/people')
  const view = peopleView(page)
  await expect(rows(view)).toHaveCount(24)
  await view
    .locator('grampsjs-pagination')
    .getByRole('button', {name: 'Next', exact: true})
    .click()
  await expect.poll(() => state.requests.at(-1)?.page).toBe('2')
  await expect(rows(view)).toHaveCount(24)
  const person = rows(view).filter({hasText: 'TEST-I0001'})
  await person.scrollIntoViewIfNeeded()
  const before = await person.boundingBox()
  expect(before.y).toBeGreaterThanOrEqual(0)
  const requestsBefore = state.requests.length
  await person.click()
  await expect(page).toHaveURL(/\/person\/TEST-I0001$/)
  await expect(
    page.locator('grampsjs-view-person h2').filter({hasText: 'Alexandria'})
  ).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/people$/)
  await expect(person).toBeVisible()
  await expect
    .poll(async () => Math.abs((await person.boundingBox()).y - before.y))
    .toBeLessThanOrEqual(4)
  expect(state.requests).toHaveLength(requestsBefore)
  expect(state.requests.at(-1).page).toBe('2')
})

test('Russian people list fits 320px without cutting off a long name', async ({
  page,
  site,
}) => {
  site.people()
  await page.setViewportSize({width: 320, height: 740})
  await site.open('/people', true, {lang: 'ru', theme: 'dark'})
  const view = peopleView(page)
  await expect(rows(view)).toHaveCount(24)
  const longName = rows(view).nth(2).locator('.cell-primary')
  await expect(longName).toContainText('Several Additional Words Example')
  const box = await longName.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
  await noOverflow(page)
})
