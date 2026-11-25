import {test, expect, noOverflow} from './site.js'

const personCard = page => page.locator('grampsjs-view-person grampsjs-person')

test('person overview preserves facts, relationships, names, media, and citations', async ({
  page,
  site,
}) => {
  site.personOverview()
  await site.open('/person/TEST-I0001')
  const card = personCard(page)

  await expect(card.locator('h2').first()).toContainText(
    'Alexandria Synthetic van Example and Sample'
  )
  await expect(card.locator('.event').nth(0)).toContainText('about 1900')
  await expect(card.locator('.event').nth(0)).toContainText(
    'Synthetic Birth Town'
  )
  await expect(card.locator('.event').nth(1)).toContainText('after 1970')
  await expect(card.locator('.event').nth(1)).toContainText(
    'Synthetic Cemetery'
  )

  const names = card.locator('grampsjs-names')
  await expect
    .poll(() => names.evaluate(element => element.data.length))
    .toBe(2)
  await expect(names).toContainText('Synthetic Alias')
  const addName = names.getByRole('button', {
    name: 'Add another name',
    exact: true,
  })
  await expect(addName).toBeVisible()
  const addBox = await addName.boundingBox()
  const listBox = await names.locator('md-list').boundingBox()
  expect(addBox.y + addBox.height).toBeLessThanOrEqual(listBox.y + 1)
  const removeName = names.getByRole('button', {
    name: 'Delete name',
    exact: true,
  })
  await expect(removeName).toHaveCount(1)
  await removeName.click()
  await expect(names.locator('md-dialog')).toHaveJSProperty('open', true)
  await names.getByRole('button', {name: 'Cancel', exact: true}).click()

  const relationships = card.locator('grampsjs-relationships')
  await expect(relationships).toContainText('Synthetic Father')
  await expect(relationships).toContainText('Synthetic Mother')
  await expect(relationships).toContainText('Synthetic Partner')
  await expect(relationships).toContainText('Synthetic Child')

  const gallery = card.locator('grampsjs-gallery')
  await expect(gallery.locator('.tile')).toHaveCount(1)
  await expect
    .poll(() => gallery.evaluate(element => element.media[0]?.gramps_id))
    .toBe('TEST-M0001')

  const citations = card.locator('grampsjs-source-citations')
  await expect(citations).toContainText('Synthetic Source for Birth')
  await expect(citations).toContainText('synthetic page 1')

  await noOverflow(page)
})

test('person section shortcuts work in Russian on a narrow viewport', async ({
  page,
  site,
}) => {
  site.personOverview()
  await page.setViewportSize({width: 320, height: 780})
  await site.open('/person/TEST-I0001', true, {lang: 'ru', theme: 'dark'})
  const card = personCard(page)
  const addEvent = card.locator('grampsjs-events md-outlined-select').first()
  await expect(addEvent).toBeVisible()
  const selectWidth = await addEvent.evaluate(
    element => element.getBoundingClientRect().width
  )
  expect(selectWidth).toBeGreaterThanOrEqual(180)
  const navigation = card.locator('nav.profile-navigation')
  const shortcuts = navigation.locator('md-outlined-button')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(shortcuts).toHaveCount(5)
  await expect(shortcuts.nth(0)).toHaveText('Родственные связи')
  await expect(shortcuts.nth(1)).toHaveText('Имена')
  await expect(shortcuts.nth(2)).toHaveText('Галерея')
  await expect(shortcuts.nth(3)).toHaveText('Источники и цитаты')
  await expect(shortcuts.nth(4)).toHaveText('Оглавление')
  for (const shortcut of await shortcuts.all()) {
    await expect(shortcut).toBeVisible()
    await expect(shortcut).not.toHaveText(/^\s*_.*$/)
  }
  const eventTextColor = await card
    .locator('.event')
    .first()
    .evaluate(element => getComputedStyle(element).color)
  const surfaceTextColor = await page
    .locator('html')
    .evaluate(element => getComputedStyle(element).color)
  expect(eventTextColor).toBe(surfaceTextColor)

  const names = shortcuts.nth(1)
  await names.focus()
  await page.keyboard.press('Enter')
  await expect(card.locator('#section-names')).toBeInViewport()
  await expect(card.locator('grampsjs-names')).toContainText('Synthetic Alias')

  const sources = shortcuts.nth(3)
  await sources.click()
  await expect(card.locator('#section-sourceCitations')).toBeInViewport()
  await expect(card.locator('grampsjs-source-citations')).toContainText(
    'Synthetic Source for Birth'
  )

  const contents = shortcuts.last()
  await contents.click()
  await expect(card.locator('#toc-dialog')).toHaveJSProperty('open', true)
  await expect(
    card.locator('#toc-dialog').getByText('Родственные связи')
  ).toBeVisible()
  await noOverflow(page)
})
