import {test, expect} from './site.js'

test('name editor retains failed input, blocks duplicate save and retries', async ({
  page,
  site,
}) => {
  const save = site.nameSave()
  await site.open('/person/TEST-I0001')
  const view = page.locator('grampsjs-view-person')
  await expect(
    view.locator('h2').filter({hasText: 'Alexandria Synthetic'})
  ).toBeVisible()
  await view.locator('md-fab').click()
  const names = view.locator('grampsjs-names')
  await names.locator('md-list-item').first().click()
  // The existing editable-list toolbar has no accessible names; index 1 is Edit.
  await names.locator('md-icon-button').nth(1).click()
  const form = names.locator('grampsjs-form-edit-name')
  const input = form.locator('grampsjs-form-string#first_name input')
  await expect(input).toBeVisible()
  await input.fill('Alexandria Revised')
  const submit = form.locator('md-filled-button')
  await expect(submit).toHaveText('Save')
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect.poll(() => save.payloads.length).toBe(1)
  await expect(submit).toHaveAttribute('disabled', '')
  await expect(form.getByRole('status')).toContainText('Saving')
  await expect(form.locator('md-text-button').first()).toHaveAttribute(
    'disabled',
    ''
  )
  // Deliberately bypass native disabled-click filtering to exercise the JS guard.
  await submit.dispatchEvent('click')
  await page.keyboard.press('Escape')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  expect(save.payloads).toHaveLength(1)
  await expect.poll(() => typeof save.release).toBe('function')
  save.release()
  await expect(dialog.getByRole('alert')).toContainText(
    'Synthetic name save failed'
  )
  await expect(dialog.getByRole('textbox', {name: 'Given name'})).toHaveValue(
    'Alexandria Revised'
  )
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect.poll(() => save.payloads.length).toBe(2)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(names.getByRole('status')).toContainText('Saved')
  await expect(
    view.locator('h2').filter({hasText: 'Alexandria Revised'})
  ).toBeVisible()
  expect(save.payloads[0]).toEqual(save.payloads[1])
})
