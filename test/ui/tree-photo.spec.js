import {test, expect, noOverflow} from './site.js'

for (const target of ['.person-photo-button', '.person-photo-target']) {
  test(`tree photo ${target} opens a chooser without selecting the person`, async ({
    page,
    site,
    isMobile,
  }) => {
    site.treePhoto()
    await site.open('/tree')
    const view = page.locator('grampsjs-view-tree')
    await view.evaluate(element => {
      element.grampsId = 'TEST-I0001'
    })
    const chart = view.locator('grampsjs-tree-chart')
    await expect(chart.locator('.photo-placeholder')).toHaveCount(1)
    const action = chart.locator(target)
    await expect(action).toHaveAccessibleName('Add or change photo')
    if (isMobile) await action.tap()
    else await action.click()
    const chooser = chart.locator('grampsjs-tree-photo')
    await expect(chooser.locator('md-dialog')).toHaveJSProperty('open', true)
    await expect(
      chooser.getByRole('button', {name: 'Upload new photo', exact: true})
    ).toBeVisible()
    await expect(chooser).toContainText('This person has no photos yet.')
    await expect(page).toHaveURL(/\/tree$/)
    await chooser.getByRole('button', {name: 'Cancel', exact: true}).click()
    await expect(chooser).toHaveCount(0)
    await noOverflow(page)
  })
}
