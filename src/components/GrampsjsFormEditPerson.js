import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog.js'
import '@material/web/textfield/outlined-text-field.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {getPersonEditFields, savePersonEdit} from './personEdit.js'

export class GrampsjsFormEditPerson extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      personHandle: {type: String},
      _originalPerson: {state: true},
      _fields: {state: true},
      _loading: {state: true},
      _saving: {state: true},
      _error: {state: true},
      _conflict: {state: true},
    }
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        md-dialog {
          width: min(560px, calc(100vw - 32px));
          max-height: calc(100dvh - 32px);
        }
        .fields {
          display: grid;
          gap: 20px;
        }
        md-outlined-text-field,
        md-filled-select {
          width: 100%;
        }
        .error {
          color: var(--md-sys-color-error);
        }
        [slot='actions'] {
          flex-wrap: wrap;
        }
      `,
    ]
  }

  constructor() {
    super()
    this.personHandle = ''
    this._originalPerson = null
    this._fields = {firstName: '', surnames: [''], gender: 2}
    this._loading = true
    this._saving = false
    this._error = ''
    this._conflict = false
  }

  firstUpdated() {
    this._loadPerson()
  }

  async _loadPerson() {
    this._loading = true
    this._error = ''
    try {
      if (!this.appState.permissions?.canEdit) {
        this._error = this._('Not authorized')
        return
      }
      const result = await this.appState.apiGet(
        `/api/people/${this.personHandle}`
      )
      if (result.error || !result.data) {
        this._error = this._(result.error || 'Unable to load person')
        return
      }
      this._originalPerson = result.data
      this._fields = getPersonEditFields(result.data)
      this._conflict = false
    } catch (error) {
      this._error = error.message
    } finally {
      this._loading = false
    }
  }

  render() {
    const genderLabels = ['Female', 'Male', 'Unknown', 'Other']
    return html`
      <md-dialog open @cancel=${this._handleCancel}>
        <span slot="headline">${this._('Edit Person')}</span>
        <div slot="content" aria-busy=${this._loading || this._saving}>
          ${this._loading
            ? html`<p role="status">${this._('Loading person...')}</p>`
            : this._originalPerson
            ? html`
                <div class="fields">
                  <md-outlined-text-field
                    label=${this._('Given name')}
                    .value=${this._fields.firstName}
                    ?disabled=${this._saving}
                    @input=${event => {
                      this._fields = {
                        ...this._fields,
                        firstName: event.target.value,
                      }
                    }}
                  ></md-outlined-text-field>
                  ${this._fields.surnames.map(
                    (surname, index) => html`
                      <md-outlined-text-field
                        label=${this._('Surname')}
                        .value=${surname}
                        ?disabled=${this._saving}
                        @input=${event => {
                          this._fields = {
                            ...this._fields,
                            surnames: this._fields.surnames.map((value, i) =>
                              i === index ? event.target.value : value
                            ),
                          }
                        }}
                      ></md-outlined-text-field>
                    `
                  )}
                  <md-filled-select
                    label=${this._('Gender')}
                    ?disabled=${this._saving}
                    @change=${event => {
                      this._fields = {
                        ...this._fields,
                        gender: Number(event.target.value),
                      }
                    }}
                  >
                    ${genderLabels.map(
                      (label, gender) => html`
                        <md-select-option
                          value=${String(gender)}
                          ?selected=${this._fields.gender === gender}
                        >
                          <div slot="headline">${this._(label)}</div>
                        </md-select-option>
                      `
                    )}
                  </md-filled-select>
                </div>
                <p>
                  ${this._(
                    'Edit dates, places, relatives and additional names in the page sections.'
                  )}
                </p>
              `
            : ''}
          ${this._error
            ? html`<p class="error" role="alert">${this._error}</p>`
            : ''}
          ${this._saving
            ? html`<p role="status">${this._('Saving...')}</p>`
            : ''}
        </div>
        <div slot="actions">
          ${this._conflict || (!this._originalPerson && this._error)
            ? html`<md-text-button
                ?disabled=${this._loading || this._saving}
                @click=${this._loadPerson}
                >${this._('Reload person')}</md-text-button
              >`
            : ''}
          <md-text-button ?disabled=${this._saving} @click=${this._handleCancel}
            >${this._('Cancel')}</md-text-button
          >
          <md-filled-button
            ?disabled=${this._loading ||
            this._saving ||
            this._conflict ||
            !this._originalPerson ||
            !this.appState.permissions?.canEdit}
            @click=${this._handleSave}
            >${this._('_Save')}</md-filled-button
          >
        </div>
      </md-dialog>
    `
  }

  _handleCancel(event) {
    event.preventDefault()
    if (!this._saving) fireEvent(this, 'object:cancel')
  }

  async _handleSave() {
    if (
      this._saving ||
      this._loading ||
      this._conflict ||
      !this._originalPerson
    ) {
      return
    }
    this._saving = true
    this._error = ''
    try {
      const result = await savePersonEdit(
        this.appState,
        this._originalPerson,
        this._fields
      )
      if (result.conflict) {
        this._conflict = true
        this._error = this._(
          'This person has changed. Reload the card before saving.'
        )
      } else if (result.error || !('data' in result)) {
        this._error = this._(result.error || 'Unable to save person')
      } else {
        fireEvent(this, 'object:save')
        fireEvent(this, 'grampsjs:notification', {message: this._('Saved')})
      }
    } catch (error) {
      this._error = error.message
    } finally {
      this._saving = false
    }
  }
}

window.customElements.define(
  'grampsjs-form-edit-person',
  GrampsjsFormEditPerson
)
