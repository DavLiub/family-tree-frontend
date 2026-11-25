/*
Form for adding a new event reference
*/

import {html, css} from 'lit'
import '@awesome.me/webawesome/dist/components/dialog/dialog.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/translations/ru.js'

import './GrampsjsFormName.js'
import './GrampsjsFormSelectType.js'

import {fireEvent, emptyDate} from '../util.js'
import {getNameKind, getNameType} from './nameHistory.js'
import './GrampsjsFormSelectDate.js'
import {waThemeStyles} from '../SharedStyles.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

export class GrampsjsFormEditName extends GrampsjsObjectForm {
  static get styles() {
    return [
      super.styles,
      waThemeStyles,
      css`
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
      if (select) select.updateComplete.then(() => this.checkFormValidity())
      else this.checkFormValidity()
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
      historyMode: {type: Boolean},
      errorMessage: {type: String},
    }
  }

  constructor() {
    super()
    this.isFormValid = false
    this.historyMode = false
    this.noReset = true
    this.errorMessage = ''
  }

  renderForm() {
    return html`
      <div ?inert=${this.saving} aria-busy=${this.saving}>
        ${this.historyMode ? this._renderHistoryChoice() : ''}
        <grampsjs-form-name
          webawesome
          ?historyMode=${this.historyMode}
          origintype
          id="name"
          @formdata:changed="${this._handleFormData}"
          ?loadingTypes=${this.loadingTypes}
          .appState="${this.appState}"
          .data="${this.data}"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
          ${!this.historyMode || getNameKind(this.data) === 'other'
            ? html`<grampsjs-form-select-type
                slot="name-details"
                webawesome
                required
                id="name-type"
                noheading
                label=${this._('Name type')}
                .appState=${this.appState}
                typeName="name_types"
                ?loadingTypes=${this.loadingTypes}
                defaultValue="Birth Name"
                value=${this.data?.type?.string ||
                this.data?.type ||
                'Birth Name'}
                .types=${this.types}
                .typesLocale=${this.typesLocale}
                @formdata:changed=${this._handleFormData}
              ></grampsjs-form-select-type>`
            : ''}
          ${this.historyMode
            ? html`<div slot="name-details">
                <h4>${this._('Date for this name (optional)')}</h4>
                <grampsjs-form-select-date
                  id="date"
                  .appState=${this.appState}
                  .data=${this.data.date || emptyDate}
                  @formdata:changed=${this._handleFormData}
                ></grampsjs-form-select-date>
              </div>`
            : ''}
        </grampsjs-form-name>
      </div>
      <span role="status" aria-live="polite"
        >${this.saving ? this._('Saving...') : ''}</span
      >
      ${this.errorMessage ? html`<p role="alert">${this.errorMessage}</p>` : ''}
    `
  }

  _renderHistoryChoice() {
    const kind = getNameKind(this.data)
    const choice =
      kind === 'birth' ? 'birth' : kind === 'other' ? 'other' : 'change'
    const rawType = getNameType(this.data)
    const reason = rawType.startsWith('Name change: ')
      ? rawType.slice('Name change: '.length)
      : ''
    return html`
      <wa-select
        id="name-kind"
        label=${this._('Name record')}
        .value=${choice}
        @change=${e => this._changeHistoryKind(e.target.value)}
      >
        <wa-option value="birth">${this._('At birth')}</wa-option>
        <wa-option value="change">${this._('Name change')}</wa-option>
        ${choice === 'other'
          ? html`<wa-option value="other"
              >${this._('Other recorded name')}</wa-option
            >`
          : ''}
      </wa-select>
      ${choice === 'change'
        ? html`
            <wa-select
              id="name-change-reason"
              label=${this._('Reason for name change')}
              .value=${kind === 'married' ? 'marriage' : 'other'}
              @change=${e => {
                this.data = {
                  ...this.data,
                  type:
                    e.target.value === 'marriage'
                      ? 'Married Name'
                      : 'Name change',
                }
                this.checkFormValidity()
              }}
            >
              <wa-option value="marriage">${this._('In marriage')}</wa-option>
              <wa-option value="other">${this._('Other reason')}</wa-option>
            </wa-select>
            ${kind !== 'married'
              ? html`<grampsjs-form-string
                  webawesome
                  fullwidth
                  id="name-change-text"
                  .appState=${this.appState}
                  label=${this._('Reason (optional)')}
                  value=${reason}
                  @formdata:changed=${e => {
                    e.stopPropagation()
                    this.data = {
                      ...this.data,
                      type: e.detail.data.trim()
                        ? `Name change: ${e.detail.data}`
                        : 'Name change',
                    }
                    this.checkFormValidity()
                  }}
                ></grampsjs-form-string>`
              : ''}
          `
        : ''}
    `
  }

  _changeHistoryKind(choice) {
    if (choice === 'other') return
    this.data = {
      ...this.data,
      type: choice === 'birth' ? 'Birth Name' : 'Name change',
    }
    this.checkFormValidity()
  }

  _handleDialogSave() {
    if (this.saving || !this.isValid) return
    this.saving = true
    this.errorMessage = ''
    // The view completes the actual request; dispatch itself is synchronous.
    fireEvent(this, 'object:save', {
      data: structuredClone({type: 'Birth Name', ...this.data}),
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
    this.isFormValid =
      (selectType === null || selectType.isValid()) &&
      (!this.historyMode || this._areDateSelectValid())
  }

  get isValid() {
    return this.isFormValid
  }
}

window.customElements.define('grampsjs-form-edit-name', GrampsjsFormEditName)
