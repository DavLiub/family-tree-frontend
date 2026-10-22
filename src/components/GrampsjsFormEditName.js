/*
Form for adding a new event reference
*/

import {html, css} from 'lit'
import '@awesome.me/webawesome/dist/components/dialog/dialog.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/translations/ru.js'

import './GrampsjsFormName.js'
import './GrampsjsFormSelectType.js'

import {fireEvent} from '../util.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditName extends GrampsjsObjectForm {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          color: var(--md-sys-color-on-surface);
          --wa-color-brand-on-quiet: var(--md-sys-color-primary);
          --wa-color-brand-on-normal: var(--md-sys-color-on-primary-container);
          --wa-color-neutral-on-quiet: var(--md-sys-color-on-surface);
          --wa-color-neutral-on-normal: var(--md-sys-color-on-surface);
          --wa-color-neutral-fill-quiet: var(
            --md-sys-color-surface-container-highest
          );
          --wa-color-text-quiet: var(--md-sys-color-on-surface-variant);
          --wa-color-brand-on-loud: var(--md-sys-color-on-primary);
          --wa-color-surface-lowered: var(--md-sys-color-surface-container);
          --wa-form-control-background-color: var(--md-sys-color-surface);
          --wa-form-control-value-color: var(--md-sys-color-on-surface);
          --wa-form-control-label-color: var(--md-sys-color-on-surface);
          --wa-form-control-placeholder-color: var(
            --md-sys-color-on-surface-variant
          );
        }
        wa-dialog {
          --width: 44rem;
        }
        wa-dialog::part(dialog) {
          max-height: calc(100dvh - 2rem);
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        [role='alert'] {
          color: var(--md-sys-color-error);
        }
      `,
    ]
  }

  render() {
    return html`<wa-dialog
      open
      label=${this.dialogTitle || this._('Name')}
      lang=${this.appState?.i18n?.lang ||
      this.appState?.settings?.lang ||
      document.documentElement.lang ||
      'en'}
      @wa-hide=${this._handleAwesomeHide}
    >
      <div @formdata:changed=${this._handleFormData}>${this.renderForm()}</div>
      <div slot="footer" class="actions">
        ${this.hideCancelButton
          ? ''
          : html`<wa-button
              ?disabled=${this.saving}
              @click=${this._handleDialogCancel}
              >${this._('Cancel')}</wa-button
            >`}
        ${this.hideSaveButton
          ? ''
          : html`<wa-button
              variant="brand"
              ?disabled=${!this.isValid || this.saving}
              ?loading=${this.saving}
              @click=${this._handleDialogSave}
              >${this._('_Save')}</wa-button
            >`}
      </div>
    </wa-dialog>`
  }

  connectedCallback() {
    let opener = document.activeElement
    while (opener?.shadowRoot?.activeElement) {
      opener = opener.shadowRoot.activeElement
    }
    this._opener = opener
    super.connectedCallback()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    const opener = this._opener
    queueMicrotask(() => {
      if (opener?.isConnected && typeof opener.focus === 'function') {
        opener.focus()
      }
    })
  }

  updated(changed) {
    if (['data', 'types', 'loadingTypes'].some(key => changed.has(key))) {
      const select = this.renderRoot.querySelector('grampsjs-form-select-type')
      select?.updateComplete.then(() => this.checkFormValidity())
    }
  }

  _handleAwesomeHide(e) {
    // A select's dropdown also emits wa-hide and must not close the form.
    if (e.target !== this.renderRoot.querySelector('wa-dialog')) return
    e.preventDefault()
    this._handleDialogCancel()
  }

  _openDialog() {
    const dialog = this.renderRoot.querySelector('wa-dialog')
    if (dialog) dialog.open = true
  }

  get dialogIsOpen() {
    return this.renderRoot.querySelector('wa-dialog')?.open ?? false
  }

  static get properties() {
    return {
      isFormValid: {type: Boolean},
      errorMessage: {type: String},
    }
  }

  constructor() {
    super()
    this.isFormValid = false
    this.noReset = true
    this.errorMessage = ''
  }

  renderForm() {
    return html`
      <div ?inert=${this.saving} aria-busy=${this.saving}>
        <grampsjs-form-select-type
          webawesome
          required
          id="name-type"
          noheading
          label="${this._('Name type')}"
          .appState="${this.appState}"
          typeName="name_types"
          ?loadingTypes=${this.loadingTypes}
          defaultValue="Birth Name"
          value=${this.data?.type?.string || this.data?.type || null}
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
          @formdata:changed="${this._handleFormData}"
        >
        </grampsjs-form-select-type>

        <grampsjs-form-name
          webawesome
          origintype
          id="name"
          @formdata:changed="${this._handleFormData}"
          ?loadingTypes=${this.loadingTypes}
          .appState="${this.appState}"
          .data="${this.data}"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-name>
      </div>
      <span role="status" aria-live="polite"
        >${this.saving ? this._('Saving...') : ''}</span
      >
      ${this.errorMessage ? html`<p role="alert">${this.errorMessage}</p>` : ''}
    `
  }

  _handleDialogSave() {
    if (this.saving || !this.isValid) return
    this.saving = true
    this.errorMessage = ''
    // The view completes the actual request; dispatch itself is synchronous.
    fireEvent(this, 'object:save', {
      data: structuredClone(this.data),
      complete: result => {
        this.saving = false
        if (
          result &&
          typeof result === 'object' &&
          ('data' in result || 'task' in result) &&
          !('error' in result)
        ) {
          fireEvent(this, 'object:saved')
        } else {
          this.errorMessage = this._(result?.error || 'Unable to save person')
        }
      },
    })
  }

  _handleDialogCancel() {
    if (this.saving) return
    super._handleDialogCancel()
  }

  _handleFormData(e) {
    super._handleFormData(e)
    this.checkFormValidity()
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector(
      'grampsjs-form-select-type'
    )
    this.isFormValid = selectType === null ? true : selectType.isValid()
  }

  get isValid() {
    return this.isFormValid
  }
}

window.customElements.define('grampsjs-form-edit-name', GrampsjsFormEditName)
