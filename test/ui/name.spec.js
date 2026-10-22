import {test, expect} from './site.js'

test('name editor retains failed input, blocks duplicate save and retries', async ({
  page,
  site,
}) => {
  const save = site.nameSave()
  const view = page.locator('grampsjs-view-person')
  const names = view.locator('grampsjs-names')
  const form = names.locator('grampsjs-form-edit-name')
  const input = form.locator('grampsjs-form-string#first_name input')
  const submit = form.locator('md-filled-button')
  const dialog = page.getByRole('dialog')

  await test.step('Open the name editor and change the given name', async () => {
    await site.open('/person/TEST-I0001')
    await expect(
      view.locator('h2').filter({hasText: 'Alexandria Synthetic'})
    ).toBeVisible()
    await view.locator('md-fab').click()
    await names.locator('md-list-item').first().click()
    // The existing editable-list toolbar has no accessible names; index 1 is Edit.
    await names.locator('md-icon-button').nth(1).click()
    await expect(input).toBeVisible()
    await input.fill('Alexandria Revised')
    await expect(submit).toHaveText('Save')
    await expect(submit).not.toHaveAttribute('disabled', '')
  })

  await test.step('Pending save blocks duplicate requests and cancellation', async () => {
    await submit.click()
    await expect.poll(() => save.payloads.length).toBe(1)
    await expect(submit).toHaveAttribute('disabled', '')
    await expect(form.getByRole('status')).toContainText('Saving')
    await expect(form.locator('md-text-button').first()).toHaveAttribute(
      'disabled',
      ''
    )
    // Bypass native disabled-click filtering to exercise the JS guard.
    await submit.dispatchEvent('click')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    expect(save.payloads).toHaveLength(1)
  })

  await test.step('Failed save shows an error and retains the edited name', async () => {
    await expect.poll(() => typeof save.release).toBe('function')
    save.release()
    // Slotted content belongs to the form DOM, not the native dialog DOM.
    await expect(form.getByRole('alert')).toContainText(
      'Synthetic name save failed'
    )
    await expect(dialog).toBeVisible()
    await expect(input).toHaveValue('Alexandria Revised')
    await expect(submit).not.toHaveAttribute('disabled', '')
  })

  await test.step('Retry succeeds and refreshes the person without losing fields', async () => {
    await submit.click()
    await expect.poll(() => save.payloads.length).toBe(2)
    await expect(dialog).toHaveCount(0)
    await expect(names.getByRole('status')).toContainText('Saved')
    await expect(
      view.locator('h2').filter({hasText: 'Alexandria Revised'})
    ).toBeVisible()
    expect(save.payloads[0]).toEqual(save.payloads[1])
  })
})
