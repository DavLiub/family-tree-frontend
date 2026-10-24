import {beforeEach, describe, expect, it, vi} from 'vitest'
import '../../src/components/GrampsjsLogin.js'
import {apiGetTokens, apiResetPassword, apiOIDCLogin} from '../../src/api.js'

vi.mock('../../src/api.js', async importActual => ({
  ...(await importActual()),
  apiGetTokens: vi.fn(),
  apiResetPassword: vi.fn(),
  apiOIDCLogin: vi.fn(),
}))

function loginForm() {
  const form = document.createElement('grampsjs-login')
  form.appState = {i18n: {strings: {}}}
  form.loadingConfig = false
  // Native DOM values model password-manager autofill without input events.
  const root = form.attachShadow({mode: 'open'})
  for (const [id, value] of Object.entries({
    username: 'synthetic-user',
    password: 'synthetic-password',
  })) {
    const input = document.createElement('input')
    input.id = id
    input.value = value
    root.append(input)
  }
  return form
}

beforeEach(() => vi.clearAllMocks())

describe('login request state', () => {
  it('reads autofilled DOM values, blocks a duplicate and keeps credentials after refusal', async () => {
    const form = loginForm()
    let release
    vi.mocked(apiGetTokens).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const pending = form._submitLogin(new Event('submit'))
    expect(form.pending).toBe(true)
    await form._submitLogin(new Event('submit'))
    expect(apiGetTokens).toHaveBeenCalledTimes(1)
    expect(apiGetTokens).toHaveBeenCalledWith(
      'synthetic-user',
      'synthetic-password'
    )
    release({error: 'Synthetic refusal'})
    await pending
    expect(form.pending).toBe(false)
    expect(form.errorMessage).toBe('Synthetic refusal')
    expect(form.credentials).toEqual({
      username: 'synthetic-user',
      password: 'synthetic-password',
    })
    vi.mocked(apiGetTokens).mockRejectedValueOnce(
      new Error('Synthetic transport error')
    )
    await form._submitLogin(new Event('submit'))
    expect(apiGetTokens).toHaveBeenCalledTimes(2)
    expect(form.errorMessage).toBe('Synthetic transport error')
    expect(form.pending).toBe(false)
    expect(form.shadowRoot.getElementById('password').value).toBe(
      'synthetic-password'
    )
  })

  it('refuses local login and reset when the server disables local authentication', async () => {
    const form = loginForm()
    form.oidcConfig = {enabled: true, disable_local_auth: true}
    await form._submitLogin(new Event('submit'))
    form.resetpw = true
    await form._resetPw(new Event('submit'))
    expect(apiGetTokens).not.toHaveBeenCalled()
    expect(apiResetPassword).not.toHaveBeenCalled()
  })

  it('does not submit blank credentials or while provider configuration is loading', async () => {
    const form = loginForm()
    form.loadingConfig = true
    await form._submitLogin(new Event('submit'))
    form.loadingConfig = false
    form.shadowRoot.getElementById('password').value = ''
    await form._submitLogin(new Event('submit'))
    expect(apiGetTokens).not.toHaveBeenCalled()
  })
})

describe('reset and provider request state', () => {
  it('keeps reset input on failure, retries, and prevents a duplicate reset', async () => {
    const form = loginForm()
    form.resetpw = true
    let release
    vi.mocked(apiResetPassword).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const pending = form._resetPw(new Event('submit'))
    await form._resetPw(new Event('submit'))
    expect(apiResetPassword).toHaveBeenCalledTimes(1)
    release({error: 'Synthetic mail failure'})
    await pending
    expect(form.resetSuccess).toBe(false)
    expect(form.errorMessage).toBe('Synthetic mail failure')
    expect(form.credentials.username).toBe('synthetic-user')
    vi.mocked(apiResetPassword).mockResolvedValueOnce({})
    await form._resetPw(new Event('submit'))
    expect(form.resetSuccess).toBe(true)
    expect(form.errorMessage).toBe('')
    expect(form.pending).toBe(false)
    await form._resetPw(new Event('submit'))
    expect(apiResetPassword).toHaveBeenCalledTimes(2)
  })

  it('recovers the provider action after a rejected request and blocks duplicates', async () => {
    const form = loginForm()
    let rejectRequest
    vi.mocked(apiOIDCLogin).mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          rejectRequest = reject
        })
    )
    const pending = form._submitOIDCLogin('synthetic-provider')
    await form._submitOIDCLogin('synthetic-provider')
    expect(apiOIDCLogin).toHaveBeenCalledTimes(1)
    rejectRequest(new Error('Synthetic provider error'))
    await pending
    expect(form.pending).toBe(false)
    expect(form.errorMessage).toBe('Synthetic provider error')
    vi.mocked(apiOIDCLogin).mockResolvedValueOnce({
      error: 'Synthetic retry refusal',
    })
    await form._submitOIDCLogin('synthetic-provider')
    expect(apiOIDCLogin).toHaveBeenCalledTimes(2)
  })
})
