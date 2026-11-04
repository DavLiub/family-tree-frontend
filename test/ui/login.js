import {expect} from './site.js'

export function loginControls(page) {
  const form = page.locator('grampsjs-login')
  // Locate actual controls across shadow roots, independently of label slots.
  // Their accessible names are checked separately before entering credentials.
  return {
    form,
    username: form.locator('input[name="username"]'),
    password: form.locator('input[name="password"]'),
  }
}

export async function expectLoginFields(
  page,
  {lang = 'en', reset = false} = {}
) {
  const controls = loginControls(page)
  if (reset) await expect(controls.password).toHaveCount(0)
  const names = {
    en: [/^Username(?:\s*\*)?$/, /^Password(?:\s*\*)?$/],
    ru: [/^Имя пользователя(?:\s*\*)?$/, /^Пароль(?:\s*\*)?$/],
  }
  const fields = [
    [controls.username, names[lang][0], 'text', 'username'],
    ...(!reset
      ? [[controls.password, names[lang][1], 'password', 'current-password']]
      : []),
  ]
  for (const [input, name, type, autocomplete] of fields) {
    await expect(input).toBeVisible()
    await expect(input).toHaveAccessibleName(name)
    await expect(input).toHaveAttribute('type', type)
    await expect(input).toHaveAttribute('required', '')
    await expect(input).toHaveAttribute('autocomplete', autocomplete)
    await expect(input).toBeEnabled()
  }
  return controls
}
