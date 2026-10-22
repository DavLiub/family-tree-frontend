/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormName.js'
import './GrampsjsFormSelectType.js'

import {fireEvent} from '../util.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditName extends GrampsjsObjectForm {
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
