import {test, expect, noOverflow} from './site.js'
import {person} from '../fixtures/family.js'

async function openNameEditor(page, site, settings = {}) {
  await site.open('/person/TEST-I0001', true, settings)
  const view = page.locator('grampsjs-view-person')
  const names = view.locator('grampsjs-names')
  await expect(
    view.locator('h2').filter({hasText: 'Alexandria Synthetic'})
  ).toBeVisible()
  await view.locator('md-fab').click()
  await names.locator('md-list-item').first().click()
  // The existing editable-list toolbar has no accessible names; index 1 is Edit.
  await names.locator('md-icon-button').nth(1).click()
  return names.locator('grampsjs-form-edit-name')
}

test('name editor retains failed input, blocks duplicate save and retries', async ({
  page,
  site,
}) => {
  const save = site.nameSave()
  const view = page.locator('grampsjs-view-person')
  const names = view.locator('grampsjs-names')
  const form = names.locator('grampsjs-form-edit-name')
  const input = form.locator('grampsjs-form-string#first_name wa-input input')
  const submit = form.locator('wa-button[variant=brand]')
  const dialog = page.getByRole('dialog')

  await test.step('Open the name editor and change the given name', async () => {
    await openNameEditor(page, site)
    await expect(input).toBeVisible()
    await expect(submit).not.toHaveAttribute('disabled', '')
    await input.fill('Alexandria Revised')
    await expect(form.locator('wa-dialog')).toBeVisible()
    await noOverflow(page)
    await expect(submit).toHaveText('Save')
    await expect(submit).not.toHaveAttribute('disabled', '')
  })

  await test.step('Pending save blocks duplicate requests and cancellation', async () => {
    await submit.click()
    await expect.poll(() => save.payloads.length).toBe(1)
    await expect(submit).toHaveAttribute('disabled', '')
    await expect(form.getByRole('status')).toContainText('Saving')
    await expect(
      form.locator('wa-button').filter({hasText: /^\s*Cancel\s*$/})
    ).toHaveAttribute('disabled', '')
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

test('name type keyboard selection stays open and cancellation discards changes', async ({
  page,
  site,
}) => {
  const save = site.nameSave()
  const form = await openNameEditor(page, site)
  const type = form.locator('grampsjs-form-select-type#name-type wa-select')
  const input = form.locator('grampsjs-form-string#first_name input')
  await expect(type).toHaveJSProperty('value', 'Birth Name')
  const combobox = type.getByRole('combobox')
  await combobox.focus()
  await page.keyboard.press('Space')
  await expect(type).toHaveJSProperty('open', true)
  await page.keyboard.press('Escape')
  await expect(type).toHaveJSProperty('open', false)
  await expect(page.getByRole('dialog')).toBeVisible()
  await combobox.focus()
  await page.keyboard.press('Space')
  await expect(type).toHaveJSProperty('open', true)
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(type).toHaveJSProperty('open', false)
  await expect(type).toHaveJSProperty('value', 'Also Known As')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(save.payloads).toHaveLength(0)
  // Empty given names remain permitted; this migration adds no name requirement.
  await input.fill('')
  await expect(form.locator('wa-button[variant=brand]')).not.toHaveAttribute(
    'disabled',
    ''
  )
  await page.keyboard.press('Escape')
  await expect(form).toHaveCount(0)
  expect(save.payloads).toHaveLength(0)
  const names = page.locator('grampsjs-view-person grampsjs-names')
  await names.locator('md-icon-button').nth(1).click()
  await expect(input).toHaveValue('Alexandria Synthetic')
  await expect(type).toHaveJSProperty('value', 'Birth Name')
  await form.getByRole('button', {name: 'Cancel', exact: true}).click()
  await expect(form).toHaveCount(0)
  await expect(
    names.locator('md-icon-button').nth(1).getByRole('button')
  ).toBeFocused()
  expect(save.payloads).toHaveLength(0)
})

test('Russian dark name editor keeps labelled actions within the viewport', async ({
  page,
  site,
}) => {
  site.nameSave()
  const form = await openNameEditor(page, site, {lang: 'ru', theme: 'dark'})
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    form.getByRole('textbox', {name: 'Имя', exact: true})
  ).toBeVisible()
  const save = form.getByRole('button', {name: 'Сохранить', exact: true})
  const cancel = form.getByRole('button', {name: 'Отмена', exact: true})
  for (const action of [save, cancel]) {
    await expect(action).toBeVisible()
    const box = await action.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width)
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height)
  }
  await noOverflow(page)
  await cancel.click()
  await expect(form).toHaveCount(0)
})

test('custom name type and surname changes reach the save payload without losing hidden fields', async ({
  page,
  site,
}) => {
  const reordered = [
    person.primary_name.surname_list[1],
    person.primary_name.surname_list[0],
  ]
  const save = site.nameSave({
    type: 'Synthetic custom type',
    surname_list: reordered,
  })
  const form = await openNameEditor(page, site)
  const type = form.locator('grampsjs-form-select-type#name-type')
  await type.locator('wa-button#button-switch-type').click()
  const custom = type.locator('wa-input#custom-type input')
  await expect(custom).toHaveValue('')
  await expect(form.locator('wa-button[variant=brand]')).toHaveAttribute(
    'disabled',
    ''
  )
  await custom.fill('Synthetic custom type')
  const name = form.locator('grampsjs-form-name')
  await name.getByRole('button', {name: 'Show more', exact: true}).click()
  await name
    .getByRole('button', {name: 'Move Down', exact: true})
    .first()
    .click()
  const surnames = name.locator('grampsjs-form-surname')
  await expect(
    surnames.first().locator('grampsjs-form-string#surname input')
  ).toHaveValue('Sample')
  await name.getByRole('button', {name: 'Add', exact: true}).click()
  await expect(surnames).toHaveCount(3)
  await surnames
    .last()
    .locator('grampsjs-form-string#surname input')
    .fill('Temporary surname')
  await name.getByRole('button', {name: 'Delete', exact: true}).last().click()
  await expect(surnames).toHaveCount(2)
  // A mononym/empty given name remains a supported data model case.
  await form.locator('grampsjs-form-string#first_name input').fill('')
  await form.locator('wa-button[variant=brand]').click()
  await expect.poll(() => save.payloads.length).toBe(1)
  expect(save.payloads[0].primary_name.first_name).toBe('')
  expect(save.payloads[0].primary_name.type).toBe('Synthetic custom type')
  expect(save.payloads[0].primary_name.surname_list).toEqual(reordered)
  await expect.poll(() => typeof save.release).toBe('function')
  save.release()
  await expect(form.getByRole('alert')).toBeVisible()
  await expect(custom).toHaveValue('Synthetic custom type')
  await form.getByRole('button', {name: 'Cancel', exact: true}).click()
  await expect(form).toHaveCount(0)
  expect(save.payloads).toHaveLength(1)
})

test('an existing unknown name type is preserved and can be saved immediately', async ({
  page,
  site,
}) => {
  const save = site.nameSave({}, {type: 'Existing synthetic custom type'})
  const form = await openNameEditor(page, site)
  const custom = form.locator(
    'grampsjs-form-select-type#name-type wa-input#custom-type input'
  )
  await expect(custom).toHaveValue('Existing synthetic custom type')
  const submit = form.locator('wa-button[variant=brand]')
  await expect(submit).not.toHaveAttribute('disabled', '')
  await submit.click()
  await expect.poll(() => save.payloads.length).toBe(1)
  expect(save.payloads[0].primary_name.type).toBe(
    'Existing synthetic custom type'
  )
  await expect.poll(() => typeof save.release).toBe('function')
  save.release()
  await expect(form.getByRole('alert')).toBeVisible()
  await form.getByRole('button', {name: 'Cancel', exact: true}).click()
  await expect(form).toHaveCount(0)
})
