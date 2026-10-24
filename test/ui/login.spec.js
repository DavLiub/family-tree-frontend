import {test, expect, noOverflow} from './site.js'

test('login keeps credentials after refusal and submits once before redirecting', async ({
  page,
  site,
}) => {
  const login = site.login()
  await site.open('/login', false)
  const form = page.locator('grampsjs-login')
  const username = form.getByLabel(/^Username(?:\s*\*)?$/)
  const password = form.getByLabel(/^Password(?:\s*\*)?$/)
  const submit = form.getByRole('button', {name: 'Log in', exact: true})
  await username.fill('synthetic-user')
  await password.fill('synthetic-password')
  await form.getByRole('button', {name: 'Show password', exact: true}).click()
  await expect(password).toHaveAttribute('type', 'text')
  await form.getByRole('button', {name: 'Hide password', exact: true}).click()
  await expect(password).toHaveAttribute('type', 'password')
  await password.press('Enter')
  await expect.poll(() => login.attempts.length).toBe(1)
  await expect(submit).toBeDisabled()
  await expect(form.getByRole('status')).toContainText('Signing in')
  await submit.dispatchEvent('click')
  expect(login.attempts).toHaveLength(1)
  await expect.poll(() => typeof login.release).toBe('function')
  login.release()
  await expect(form.getByRole('alert')).toContainText(
    'Wrong username or password'
  )
  await expect(username).toHaveValue('synthetic-user')
  await expect(password).toHaveValue('synthetic-password')
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page).toHaveURL('http://127.0.0.1:4173/')
  await expect(page.getByRole('heading', {name: 'Signed in'})).toBeVisible()
  expect(login.attempts).toEqual([
    {username: 'synthetic-user', password: 'synthetic-password'},
    {username: 'synthetic-user', password: 'synthetic-password'},
  ])
  expect(
    await page.evaluate(() => localStorage.getItem('access_token'))
  ).toBeTruthy()
})

test('password reset is keyboard accessible, blocks duplicates and returns to login', async ({
  page,
  site,
}) => {
  const login = site.login()
  await site.open('/login', false)
  const form = page.locator('grampsjs-login')
  const lost = form.getByRole('button', {name: 'Lost password?', exact: true})
  await lost.focus()
  await page.keyboard.press('Enter')
  const username = form.getByLabel(/^Username(?:\s*\*)?$/)
  await username.fill('synthetic-user')
  await username.press('Enter')
  await expect.poll(() => login.resets).toBe(1)
  const submit = form.getByRole('button', {name: 'reset password', exact: true})
  await expect(submit).toBeDisabled()
  await submit.dispatchEvent('click')
  expect(login.resets).toBe(1)
  await expect.poll(() => typeof login.releaseReset).toBe('function')
  login.releaseReset()
  await expect(
    form.getByRole('status').filter({hasText: 'sent by e-mail'})
  ).toBeVisible()
  await form.getByRole('button', {name: 'Back', exact: true}).click()
  await expect(
    form.getByRole('button', {name: 'Log in', exact: true})
  ).toBeVisible()
  await expect(form.getByLabel(/^Password(?:\s*\*)?$/)).toBeVisible()
})

test('Russian login fits 320px with visible primary and secondary actions', async ({
  page,
  site,
}) => {
  await page.setViewportSize({width: 320, height: 640})
  await site.open('/login', false, {lang: 'ru', theme: 'dark'})
  const form = page.locator('grampsjs-login')
  await expect(form.getByLabel(/^Имя пользователя(?:\s*\*)?$/)).toBeVisible()
  await expect(form.getByLabel(/^Пароль(?:\s*\*)?$/)).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const submit = form.getByRole('button', {name: 'Войти', exact: true})
  await expect(submit).toBeVisible()
  const box = await submit.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  await noOverflow(page)
})

test('provider-only login does not expose local credentials or password reset', async ({
  page,
  site,
}) => {
  site.login({
    enabled: true,
    disable_local_auth: true,
    auto_redirect: false,
    providers: [{id: 'synthetic-provider', name: 'Synthetic provider'}],
  })
  await site.open('/login', false)
  const form = page.locator('grampsjs-login')
  await expect(
    form.getByRole('button', {name: 'Continue with Synthetic provider'})
  ).toBeVisible()
  await expect(form.getByLabel(/^Username(?:\s*\*)?$/)).toHaveCount(0)
  await expect(form.getByLabel(/^Password(?:\s*\*)?$/)).toHaveCount(0)
  await expect(
    form.getByRole('button', {name: 'Lost password?', exact: true})
  ).toHaveCount(0)
  await noOverflow(page)
})
