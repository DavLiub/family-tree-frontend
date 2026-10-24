import {test, expect, noOverflow} from './site.js'

test('login exposes labelled credentials and a visible submit action', async ({
  page,
  site,
}) => {
  await site.open('/login', false)
  await expect(page.getByLabel(/^Username(?:\s*\*)?$/)).toBeVisible()
  await expect(page.getByLabel(/^Password(?:\s*\*)?$/)).toHaveAttribute(
    'type',
    'password'
  )
  await expect(
    page
      .locator('grampsjs-login')
      .getByRole('button', {name: 'Log in', exact: true})
  ).toBeVisible()
  await noOverflow(page)
})

test('person keeps a readable heading and returns to the people list', async ({
  page,
  site,
}) => {
  await site.open('/person/TEST-I0001')
  const view = page.locator('grampsjs-view-person')
  const heading = view.locator('h2').filter({hasText: 'Alexandria Synthetic'})
  await expect(heading).toBeVisible()
  const box = await heading.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width)
  const tree = view.getByRole('button', {name: 'Show in tree', exact: true})
  await expect(tree).toBeVisible()
  await noOverflow(page)
  await view
    .locator('grampsjs-breadcrumbs')
    .getByRole('link', {name: 'People', exact: true})
    .click()
  await expect(page).toHaveURL(/\/people$/)
  await expect(
    page.locator('grampsjs-view-people').getByText('TEST-I0001', {exact: true})
  ).toBeVisible()
  await noOverflow(page)
})

test('tree without a home person explains the state and offers an exit', async ({
  page,
  site,
}) => {
  await site.open('/tree')
  const view = page.locator('grampsjs-view-tree')
  await expect(
    view.getByText('No Home Person set.', {exact: false})
  ).toBeVisible()
  await expect(
    view.getByRole('link', {name: 'Home', exact: true})
  ).toBeVisible()
  await expect(
    view.getByRole('button', {name: /Set.*Home Person/})
  ).toBeVisible()
  await noOverflow(page)
})
