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
import './GrampsjsFormString.js'
import './GrampsjsFormNewEvent.js'
import {getSummaryEvent} from './personEventEdit.js'
import {renderContextEventEditor} from './GrampsjsFormContextEvent.js'
import {savePersonBasicEvent} from './personBasicEvent.js'
import {getPersonEditFields, savePersonEdit} from './personEdit.js'

export class GrampsjsFormEditPerson extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      personHandle: {type: String},
      basic: {type: Boolean},
      _nested: {state: true},
      _summary: {state: true},
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
    this.basic = false
    this._nested = ''
    this._summary = null
    this._eventDrafts = {}
    this._originalPerson = null
    this._fields = {firstName: '', surnames: [''], patronymics: [''], gender: 2}
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
        `/api/people/${this.personHandle}${
          this.basic ? '?profile=all&extend=all' : ''
        }`
      )
      if (result.error || !result.data) {
        this._error = this._(result.error || 'Unable to load person')
        return
      }
      this._originalPerson = result.data
      this._summary = result.data
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
        <span slot="headline"
          >${this._(this.basic ? 'Basic details' : 'Edit Person')}</span
        >
        <div slot="content" aria-busy=${this._loading || this._saving}>
          ${this._loading
            ? html`<p role="status">${this._('Loading person...')}</p>`
            : this._originalPerson
            ? html`
                <div class="fields">
                  ${this._nameField(
                    'Given name',
                    this._fields.firstName,
                    value => {
                      this._fields = {...this._fields, firstName: value}
                    }
                  )}
                  ${(this._fields.patronymics || ['']).map((part, index) =>
                    this._nameField('Patronymic', part, value => {
                      this._fields = {
                        ...this._fields,
                        patronymics: this._fields.patronymics.map((old, i) =>
                          i === index ? value : old
                        ),
                      }
                    })
                  )}
                  ${this._fields.surnames.map((surname, index) =>
                    this._nameField('Surname', surname, value => {
                      this._fields = {
                        ...this._fields,
                        surnames: this._fields.surnames.map((old, i) =>
                          i === index ? value : old
                        ),
                      }
                    })
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
                ${this.basic
                  ? html`<p>
                        ${this._(
                          'Birth and death details are saved in their own forms.'
                        )}
                      </p>
                      ${this._eventRow('birth')}${this._eventRow('death')}`
                  : ''}
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
          ${this.basic && this._originalPerson?.gramps_id
            ? html`<md-text-button
                ?disabled=${this._saving}
                @click=${this._openPerson}
                >${this._('Open person card')}</md-text-button
              >`
            : ''}
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
        </div> </md-dialog
      >${this._nested}
    `
  }

  _nameField(label, value, changed) {
    return html`<grampsjs-form-string
      webawesome
      fullwidth
      .appState=${this.appState}
      label=${this._(label)}
      .value=${value}
      ?disabled=${this._saving}
      @formdata:changed=${e => {
        e.stopPropagation()
        changed(e.detail.data)
      }}
    ></grampsjs-form-string>`
  }

  _eventRow(kind) {
    const summary = this._summary?.profile?.[kind] || {}
    return html`<div>
      <strong>${this._(kind === 'birth' ? 'Birth' : 'Death')}</strong>
      <p>${[summary.date, summary.place].filter(Boolean).join(' · ')}</p>
      <md-text-button
        ?disabled=${this._saving ||
        (!getSummaryEvent(this._summary, kind) &&
          !this.appState.permissions?.canAdd)}
        @click=${() => this._editEvent(kind)}
        >${this._(
          kind === 'birth' ? 'Edit birth details' : 'Edit death details'
        )}</md-text-button
      >
    </div>`
  }

  _editEvent(kind) {
    if (this._saving) return
    const event = getSummaryEvent(this._summary, kind)
    const close = e => {
      e.stopPropagation()
      this._nested = ''
      this._refreshSummary()
    }
    if (event)
      this._nested = renderContextEventEditor(
        this.appState,
        event,
        this._(kind === 'birth' ? 'Edit birth details' : 'Edit death details'),
        close
      )
    else if (this.appState.permissions?.canAdd)
      this._nested = html`<grampsjs-form-new-event
        compact
        awaitSave
        .appState=${this.appState}
        initialType=${kind === 'birth' ? 'Birth' : 'Death'}
        defaultRole="Primary"
        .data=${{
          _class: 'Event',
          type: kind === 'birth' ? 'Birth' : 'Death',
          role: 'Primary',
        }}
        @object:save=${e => this._newEvent(kind, e)}
        @object:saved=${close}
        @object:cancel=${close}
      ></grampsjs-form-new-event>`
  }

  async _newEvent(kind, event) {
    event.preventDefault()
    event.stopPropagation()
    this._eventDrafts[kind] ||= {}
    let result
    try {
      result = await savePersonBasicEvent(
        this.appState,
        this.personHandle,
        kind,
        event.detail.data,
        this._eventDrafts[kind]
      )
    } catch (error) {
      result = {error: error.message}
    }
    event.detail.complete?.(result)
  }

  async _refreshSummary() {
    this._saving = true
    try {
      const result = await this.appState.apiGet(
        `/api/people/${this.personHandle}?profile=all&extend=all`
      )
      if (result.error || result.data?.handle !== this.personHandle)
        throw new Error(result.error || 'Unable to load person')
      this._summary = result.data
      // Adopt our event-reference changes without resetting unsaved name fields.
      // Other native fields retain their original conflict baseline.
      const baseline = {...this._originalPerson}
      for (const key of [
        'event_ref_list',
        'birth_ref_index',
        'death_ref_index',
        'change',
      ]) {
        if (key in result.data)
          baseline[key] = structuredClone(result.data[key])
      }
      this._originalPerson = baseline
    } catch (error) {
      this._error = this._(error.message)
    } finally {
      this._saving = false
    }
  }

  _openPerson() {
    if (this._saving) return
    if (
      JSON.stringify(this._fields) !==
      JSON.stringify(getPersonEditFields(this._originalPerson))
    ) {
      this._nested = html`<md-dialog
        open
        @cancel=${() => {
          this._nested = ''
        }}
      >
        <span slot="headline">${this._('Discard unsaved changes?')}</span>
        <div slot="actions">
          <md-text-button
            @click=${() => {
              this._nested = ''
            }}
            >${this._('Cancel')}</md-text-button
          >
          <md-text-button @click=${this._navigatePerson}
            >${this._('Open without saving')}</md-text-button
          >
        </div></md-dialog
      >`
      return
    }
    this._navigatePerson()
  }

  _navigatePerson() {
    fireEvent(this, 'nav', {path: `person/${this._originalPerson.gramps_id}`})
    fireEvent(this, 'object:cancel')
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
