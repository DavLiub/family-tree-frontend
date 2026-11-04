import {html, css, LitElement} from 'lit'

import '@awesome.me/webawesome/dist/components/input/input.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/translations/ru.js'

import './GrampsjsOidcButton.js'
import {sharedStyles, waThemeStyles} from '../SharedStyles.js'
import {
  apiGetTokens,
  apiResetPassword,
  apiGetOIDCConfig,
  apiOIDCLogin,
} from '../api.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsLogin extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      waThemeStyles,
      css`
        :host {
          display: block;
          min-width: 0;
        }

        #login-container {
          box-sizing: border-box;
          width: 100%;
          max-width: 28rem;
          margin: clamp(1rem, 10vh, 6rem) auto 2rem;
          padding: 0 1rem;
        }

        form {
          min-width: 0;
        }

        h2 {
          overflow-wrap: anywhere;
        }

        wa-input,
        .primary-action {
          display: block;
          width: 100%;
          margin-block: 1rem;
        }

        .secondary-actions {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.5rem;
        }

        wa-button::part(label) {
          white-space: normal;
          overflow-wrap: anywhere;
        }

        [role='alert'] {
          color: var(--md-sys-color-error);
          overflow-wrap: anywhere;
        }

        .success {
          color: var(--grampsjs-alert-success-font-color);
        }

        hr {
          margin-block: 1.5rem;
        }
      `,
    ]
  }

  static get properties() {
    return {
      resetpw: {type: Boolean},
      credentials: {type: Object},
      tree: {type: String},
      oidcConfig: {type: Object},
      pending: {state: true},
      loadingConfig: {state: true},
      errorMessage: {state: true},
      resetSuccess: {state: true},
    }
  }

  constructor() {
    super()
    this.resetpw = false
    this.credentials = {}
    this.tree = ''
    this.oidcConfig = {}
    this.pending = false
    this.loadingConfig = true
    this.errorMessage = ''
    this.resetSuccess = false
  }

  async connectedCallback() {
    super.connectedCallback()
    try {
      const config = await apiGetOIDCConfig()
      if (!this.isConnected) return
      if (config.error) {
        this._showError(config.error)
        return
      }
      this.oidcConfig = config
      if (
        config.enabled &&
        config.disable_local_auth &&
        config.auto_redirect &&
        config.providers?.length === 1
      ) {
        requestAnimationFrame(() => {
          if (this.isConnected) this._submitOIDCLogin(config.providers[0].id)
        })
      }
    } catch (error) {
      this._showError(error?.message || 'Unable to sign in. Please try again.')
    } finally {
      this.loadingConfig = false
    }
  }

  get localAuthDisabled() {
    return this.oidcConfig?.enabled && this.oidcConfig?.disable_local_auth
  }

  get busy() {
    return this.pending || this.loadingConfig
  }

  render() {
    return html`<div
      id="login-container"
      lang=${this.appState?.i18n?.lang || this.appState?.settings?.lang || 'en'}
    >
      ${this.resetpw ? this._renderResetPw() : this._renderLogin()}
      <p role="status" aria-live="polite">
        ${this.loadingConfig
          ? this._('Loading items...')
          : this.pending
          ? this._(this.resetpw ? 'Sending reset link...' : 'Signing in...')
          : ''}
      </p>
      ${this.errorMessage
        ? html`<p role="alert">${this._(this.errorMessage)}</p>`
        : ''}
    </div>`
  }

  _renderLogin() {
    return html`<form
      id="login-form"
      aria-busy=${this.busy}
      @submit=${this._submitLogin}
      @keydown=${this._handleFormKeydown}
    >
      <h2>${this._('Log in to Gramps Web')}</h2>
      ${this.localAuthDisabled
        ? ''
        : html`
            ${this._renderUsername()}
            <wa-input
              id="password"
              name="password"
              label=${this._('Password')}
              type="password"
              autocomplete="current-password"
              password-toggle
              required
              .value=${this.credentials.password || ''}
              ?disabled=${this.busy}
              @input=${this._credChanged}
              @change=${this._credChanged}
            ></wa-input>
            <wa-button
              class="primary-action"
              variant="brand"
              type="submit"
              ?disabled=${this.busy}
              ?loading=${this.pending}
              >${this._('Log in')}</wa-button
            >
            <div class="secondary-actions">
              <wa-button
                appearance="plain"
                ?disabled=${this.busy}
                @click=${() => this._setResetPw(true)}
                >${this._('Lost password?')}</wa-button
              >
              ${window.grampsjsConfig.hideRegisterLink
                ? ''
                : html`<wa-button
                    appearance="outlined"
                    ?disabled=${this.busy}
                    @click=${() => this._handleNav('register')}
                    >${this._('Register new account')}</wa-button
                  >`}
            </div>
          `}
      ${this.oidcConfig?.enabled && this.oidcConfig?.providers?.length
        ? html`
            ${this.localAuthDisabled ? '' : html`<hr />`}
            ${this.oidcConfig.providers.map(
              provider => html`<grampsjs-oidc-button
                .provider=${provider.id}
                .providerName=${provider.name}
                .onClick=${() => this._submitOIDCLogin(provider.id)}
                .disabled=${this.busy}
                .loading=${this.pending}
                .buttonText=${this._getOIDCButtonText(
                  provider.id,
                  provider.name
                )}
                .signingInText=${this._('Signing in...')}
              ></grampsjs-oidc-button>`
            )}
          `
        : ''}
    </form>`
  }

  _renderUsername() {
    return html`<wa-input
      id="username"
      name="username"
      label=${this._('Username')}
      type="text"
      autocomplete="username"
      autocapitalize="off"
      spellcheck="false"
      required
      .value=${this.credentials.username || ''}
      ?disabled=${this.busy}
      @input=${this._credChanged}
      @change=${this._credChanged}
    ></wa-input>`
  }

  _renderResetPw() {
    return html`<form
      id="login-form"
      aria-busy=${this.busy}
      @submit=${this._resetPw}
      @keydown=${this._handleFormKeydown}
    >
      <h2>${this._('reset password')}</h2>
      ${this.resetSuccess
        ? html`<p class="success" role="status" tabindex="-1">
            ${this._('A password reset link has been sent by e-mail.')}
          </p>`
        : html`
            ${this._renderUsername()}
            <wa-button
              class="primary-action"
              variant="brand"
              type="submit"
              ?disabled=${this.busy}
              ?loading=${this.pending}
              >${this._('reset password')}</wa-button
            >
          `}
      <wa-button
        appearance="plain"
        ?disabled=${this.busy}
        @click=${() => this._setResetPw(false)}
        >${this._('_Back')}</wa-button
      >
    </form>`
  }

  _setResetPw(resetpw) {
    if (this.busy || this.localAuthDisabled) return
    this.resetpw = resetpw
    this.errorMessage = ''
    this.resetSuccess = false
    this.updateComplete.then(() =>
      this.shadowRoot.querySelector('#username')?.focus()
    )
  }

  _handleNav(path) {
    if (!this.busy) fireEvent(this, 'nav', {path})
  }

  _getOIDCButtonText(providerId, providerName) {
    return this._('Continue with %s', providerName)
  }

  _credChanged(e) {
    this.credentials = {...this.credentials, [e.target.id]: e.target.value}
  }

  // WA also schedules Enter submission; cancelling its event keeps one submit.
  // eslint-disable-next-line class-methods-use-this
  _handleFormKeydown(event) {
    if (
      event.key === 'Enter' &&
      !event.isComposing &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      event.composedPath()[0]?.tagName === 'INPUT'
    ) {
      event.preventDefault()
      event.currentTarget.requestSubmit()
    }
  }

  _readField(id) {
    const field = this.shadowRoot.getElementById(id)
    return field?.input?.value ?? field?.value ?? ''
  }

  async _submitLogin(e) {
    e?.preventDefault()
    e?.stopPropagation()
    if (this.busy || this.localAuthDisabled || this.resetpw) return
    const username = this._readField('username')
    const password = this._readField('password')
    if (!username || !password) return
    this.credentials = {...this.credentials, username, password}
    this.pending = true
    this.errorMessage = ''
    let navigating = false
    try {
      const res = await apiGetTokens(username, password)
      if (res.error) this._showError(res.error)
      else {
        document.location.href = '/'
        navigating = true
      }
    } catch (error) {
      this._showError(error?.message || 'Unable to sign in. Please try again.')
    } finally {
      if (!navigating) this.pending = false
    }
  }

  async _submitOIDCLogin(providerId) {
    if (this.busy) return
    if (!providerId) {
      this._showError('No OIDC provider specified')
      return
    }
    this.pending = true
    this.errorMessage = ''
    let navigating = false
    try {
      const res = await apiOIDCLogin(providerId)
      if (res.error) this._showError(res.error)
      else navigating = true
    } catch (error) {
      this._showError(error?.message || 'Unable to sign in. Please try again.')
    } finally {
      if (!navigating) this.pending = false
    }
  }

  async _resetPw(e) {
    e?.preventDefault()
    e?.stopPropagation()
    if (
      this.busy ||
      this.localAuthDisabled ||
      !this.resetpw ||
      this.resetSuccess
    )
      return
    const username = this._readField('username')
    if (!username) {
      this._showError('Username must not be empty.')
      return
    }
    this.credentials = {...this.credentials, username}
    this.pending = true
    this.errorMessage = ''
    try {
      const res = await apiResetPassword(username)
      if (res.error) this._showError(res.error)
      else this.resetSuccess = true
    } catch (error) {
      this._showError(
        error?.message || 'Unable to send reset link. Please try again.'
      )
    } finally {
      this.pending = false
    }
  }

  _showError(message) {
    this.errorMessage = message
  }
}

window.customElements.define('grampsjs-login', GrampsjsLogin)
