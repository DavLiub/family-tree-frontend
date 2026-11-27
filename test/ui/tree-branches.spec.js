import {test, expect} from './site.js'

for (const input of ['pointer', 'keyboard']) {
  test(`relationship branches expand all descendants and preserve the centre (${input})`, async ({
    page,
    site,
    isMobile,
  }) => {
    const fixture = site.treeBranches()
    fixture.hold = true
    await site.open('/tree', true, {
      homePerson: 'TEST-I0001',
      treeDefaultView: 'relationship',
    })
    const view = page.locator('grampsjs-view-tree')
    const chart = view.locator('grampsjs-relationship-chart')
    const person = name =>
      chart
        .locator('.node.person')
        .filter({has: page.locator('title', {hasText: name})})
    const aunt = person('Synthetic Aunt')
    const button = aunt.locator('.branch-toggle')
    const activate = async target => {
      if (input === 'keyboard') {
        await target.focus()
        await target.press('Enter')
      } else if (isMobile) await target.tap()
      else await target.click()
    }
    await expect(chart.locator('.person-card')).toHaveCount(2)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await view.locator('#btn-fit').click()
    const centre = person('Alexandria Synthetic').locator('.branch-toggle')
    await expect(centre).toHaveAttribute('aria-disabled', 'true')
    await activate(button)
    await expect(button).toHaveAttribute('aria-busy', 'true')
    expect(fixture.requests).toHaveLength(1)
    fixture.release()
    await expect(chart.locator('.person-card')).toHaveCount(5)
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(
      person('Synthetic Cousin').locator('.person-relationship')
    ).toHaveText('cousin')
    await expect(
      person('Synthetic Grandchild').locator('.person-relationship')
    ).toHaveText('first cousin once removed')
    await expect(
      person('Synthetic Grandchild').locator('.branch-toggle')
    ).toHaveAttribute('aria-disabled', 'true')
    await expect(view.locator('#selected-person')).toContainText('TEST-I0001')
    // Collapse a nested branch without hiding the original aunt or the cousin.
    await view.locator('#btn-fit').click()
    await activate(person('Synthetic Cousin').locator('.branch-toggle'))
    await expect(chart.locator('.person-card')).toHaveCount(3)
    await activate(button)
    await expect(chart.locator('.person-card')).toHaveCount(2)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(view.locator('#selected-person')).toContainText('TEST-I0001')
    expect(fixture.relations).toContain(
      '/api/relations/synthetic-person/synthetic-grandchild'
    )
    await expect(page).toHaveURL(/\/tree$/)
  })
}
