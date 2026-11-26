import {test, expect} from './site.js'

for (const slow of [false, true]) {
  test(`home person stays visible across tree views (slow: ${slow})`, async ({
    page,
    site,
    isMobile,
  }) => {
    const navigation = site.treeNavigation()
    await site.open('/tree', true, {homePerson: 'TEST-IHOME'})
    const view = page.locator('grampsjs-view-tree')
    const cards = view.locator('.person-card')
    await expect(cards).toHaveCount(1)
    await view.evaluate(element => {
      element.grampsId = 'TEST-I0001'
    })
    await expect(view.locator('#selected-person')).toContainText('TEST-I0001')
    navigation.hold = slow
    const activate = async target => {
      if (isMobile) await target.tap()
      else await target.click()
    }
    await activate(view.locator('#button-home'))
    if (slow) await expect.poll(() => navigation.pending.length).toBe(1)
    await activate(
      view.getByRole('radio', {name: 'Descendant Tree', exact: true})
    )
    if (slow) {
      await expect.poll(() => navigation.pending.length).toBe(2)
      navigation.hold = false
      navigation.pending.pop()()
      await expect(cards).toHaveCount(1)
      navigation.pending.pop()()
    }
    for (const name of [
      'Descendant Tree',
      'Hourglass Graph',
      'Relationship Graph',
      'Ancestor Tree',
    ]) {
      await activate(view.getByRole('radio', {name, exact: true}))
      await expect(cards).toHaveCount(1)
      await expect(cards).toContainText('Home Synthetic')
      await expect(cards).toBeInViewport()
      await expect(view.locator('#selected-person')).toContainText('TEST-IHOME')
    }
  })
}

test('missing home person cannot clear the selected tree', async ({
  page,
  site,
}) => {
  await site.open('/tree')
  const view = page.locator('grampsjs-view-tree')
  await view.evaluate(element => {
    element.grampsId = 'TEST-I0001'
  })
  await expect(view.locator('.person-card')).toHaveCount(1)
  await expect(view.locator('#button-home')).toBeDisabled()
  await view.evaluate(element => element._backToHomePerson())
  await view.getByRole('radio', {name: 'Descendant Tree', exact: true}).click()
  await expect(view.locator('.person-card')).toHaveCount(1)
  await expect(view.locator('.person-card')).toBeInViewport()
})
