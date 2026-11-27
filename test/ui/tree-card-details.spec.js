import {test, expect} from './site.js'

for (const kind of ['ancestor', 'descendant', 'hourglass', 'relationship']) {
  test(`${kind} cards show age and relationship to the selected centre`, async ({
    page,
    site,
  }) => {
    const details = site.treeDetails()
    await site.open('/tree', true, {
      homePerson: 'TEST-I0001',
      treeDefaultView: kind,
    })
    const view = page.locator('grampsjs-view-tree')
    await expect(view.locator('.person-relationship')).toHaveText('mother')
    const mother = view
      .locator('.person-card')
      .filter({has: page.locator('.person-relationship')})
    await expect(mother.locator('.person-age')).toHaveText(
      'Age at death: 49 years'
    )
    await expect(view.locator('.person-age')).toHaveCount(2)
    // Every line stays inside the card and its neighbouring lines.
    const fits = await mother.evaluate(card => {
      const rect = card.querySelectorAll('rect')[1].getBBox()
      const texts = [...card.querySelectorAll('text')].map(t => t.getBBox())
      return (
        texts.every(
          t =>
            t.x >= rect.x &&
            t.x + t.width <= rect.x + rect.width &&
            t.y >= rect.y &&
            t.y + t.height <= rect.y + rect.height
        ) &&
        texts.every((t, i) =>
          texts
            .slice(i + 1)
            .every(
              other =>
                t.y + t.height <= other.y || other.y + other.height <= t.y
            )
        )
      )
    })
    expect(fits).toBe(true)
    await view.evaluate(element => {
      element.grampsId = 'TEST-MOTHER'
    })
    await expect(view.locator('.person-relationship')).toHaveText('son')
    expect(details.requests).toContain(
      '/api/relations/synthetic-person/synthetic-mother'
    )
    expect(details.requests).toContain(
      '/api/relations/synthetic-mother/synthetic-person'
    )
  })
}
