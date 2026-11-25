import {css, html} from 'lit'

import '@material/web/iconbutton/icon-button.js'

import {mdiLinkOff, mdiLinkPlus, mdiPencil, mdiPlus} from '@mdi/js'

import {fireEvent, objectIconPath} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsObjectLink.js'
import './GrampsjsFormFamilyContext.js'
import '@material/web/button/outlined-button.js'
import './GrampsjsFormNewPerson.js'
import {GrampsjsObject} from './GrampsjsObject.js'
import {getPersonNameDisplay} from './nameHistory.js'
import {getSymbols} from '../symbols.js'
import {getSummaryEvent} from './personEventEdit.js'
import {renderContextEventEditor} from './GrampsjsFormContextEvent.js'

export class GrampsjsFamily extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          .parent-dates {
            display: block;
            font-size: 0.85em;
          }

          .sym {
            font-weight: bold;
            color: var(--grampsjs-body-font-color-35);
          }

          .parent-row {
            display: flex;
            align-items: center;
            gap: 0;
          }

          .parent-info {
            flex: 1;
          }

          .parent-actions {
            display: flex;
            align-items: center;
            flex-shrink: 0;
          }
        }
      `,
    ]
  }

  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Families'
    this._objectEndpoint = 'families'
    this._objectIcon = objectIconPath.family
  }

  _parentLabel(role) {
    const fatherSex = this.data?.profile?.father?.sex
    const motherSex = this.data?.profile?.mother?.sex
    const hasFather = Object.keys(this.data?.profile?.father ?? {}).length > 0
    const hasMother = Object.keys(this.data?.profile?.mother ?? {}).length > 0
    const gendersEqual = hasFather && hasMother && fatherSex === motherSex
    if (role === 'father') {
      return gendersEqual ||
        (hasFather && fatherSex !== 'M' && fatherSex !== 'F')
        ? this._('Partner 1')
        : this._('Father')
    }
    return gendersEqual || (hasMother && motherSex !== 'M' && motherSex !== 'F')
      ? this._('Partner 2')
      : this._('Mother')
  }

  renderProfile() {
    return html`
      <h2>${this._renderTitle()}</h2>
      ${this._renderParent('father', this._parentLabel('father'))}
      ${this._renderParent('mother', this._parentLabel('mother'))}
      ${this._renderMarriageBlock()}
      ${this.appState.permissions?.canEdit
        ? html` <md-outlined-button @click=${this._handleEditFamily}>
            ${this._('Edit family relationships')}
          </md-outlined-button>`
        : ''}
    `
  }

  _parentName(role) {
    const record = this.data?.extended?.[role]
    const handle = this.data?.[`${role}_handle`]
    const person =
      record?.primary_name && (!handle || record.handle === handle)
        ? record
        : {profile: this.data?.profile?.[role]}
    return getPersonNameDisplay(person, text => this._(text)).text || '…'
  }

  _renderTitle() {
    return html`${this._parentName('father')} &amp;
    ${this._parentName('mother')}`
  }

  _renderMarriageBlock() {
    const relType = this.data?.profile?.relationship
    const marriage = this.data?.profile?.marriage
    const divorce = this.data?.profile?.divorce
    const hasMarriage = marriage?.date || marriage?.place
    const hasDivorce = divorce && Object.keys(divorce).length > 0
    const {marriageSymbol, divorceSymbol} = getSymbols(
      this.appState.settings,
      s => this._(s)
    )
    if (!relType && !hasMarriage && !hasDivorce && !this.edit) {
      return ''
    }
    return html`
      <dl>
        <div>
          <dt>${this._('Relationship type:').replace(':', '')}</dt>
          <dd class="${this.edit ? 'parent-row' : ''}">
            <div class="parent-info">
              ${relType || ''}
              ${hasMarriage
                ? html`<span class="parent-dates">
                    <span class="sym">${marriageSymbol}</span>
                    ${marriage.date || ''}
                    ${marriage.place
                      ? `${this._('in')} ${
                          marriage.place_name || marriage.place
                        }`
                      : ''}
                  </span>`
                : ''}
              ${hasDivorce
                ? html`<span class="parent-dates">
                    <span class="sym">${divorceSymbol}</span>
                    ${divorce.date || ''}
                    ${divorce.place ? `${this._('in')} ${divorce.place}` : ''}
                  </span>`
                : ''}
            </div>
            ${this.edit
              ? html`
                  <div class="parent-actions">
                    <md-icon-button
                      class="edit"
                      aria-label="${this._('Edit')}"
                      @click="${this._handleEditFamily}"
                    >
                      <grampsjs-icon
                        path="${mdiPencil}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>
                  </div>
                `
              : ''}
          </dd>
        </div>
      </dl>
      ${this.appState.permissions?.canEdit
        ? ['marriage', 'divorce'].map(kind => {
            const event = getSummaryEvent(this.data, kind)
            if (!event) return ''
            const title = this._(
              kind === 'marriage' ? 'Edit marriage event' : 'Edit divorce event'
            )
            return html`<md-outlined-button
              @click=${() => {
                this.dialogContent = renderContextEventEditor(
                  this.appState,
                  event,
                  title,
                  () => {
                    this.dialogContent = ''
                  }
                )
              }}
              >${title}</md-outlined-button
            >`
          })
        : ''}
    `
  }

  _renderParent(parent, label) {
    const profile = this.data?.profile[parent]
    const hasProfile = Object.keys(profile ?? {}).length > 0
    const birthDate = profile?.birth?.date || ''
    const deathDate = profile?.death?.date || ''
    const {birthSymbol, deathSymbol} = getSymbols(this.appState.settings, s =>
      this._(s)
    )

    return html`
      <dl>
        <div>
          <dt>${label}</dt>
          <dd class="${this.edit ? 'parent-row' : ''}">
            <div class="parent-info">
              ${hasProfile
                ? html`<grampsjs-object-link
                      object-type="person"
                      gramps-id="${profile.gramps_id}"
                      >${this._parentName(parent)}</grampsjs-object-link
                    >
                    ${birthDate || deathDate
                      ? html`<span class="parent-dates">
                          ${birthDate
                            ? html`<span class="sym">${birthSymbol}</span>
                                ${birthDate}`
                            : ''}
                          ${birthDate && deathDate ? ' ' : ''}
                          ${deathDate
                            ? html`<span class="sym">${deathSymbol}</span>
                                ${deathDate}`
                            : ''}
                        </span>`
                      : ''}`
                : '…'}
            </div>
            ${this.edit
              ? html`
                  <div class="parent-actions">
                    ${hasProfile
                      ? html`
                          <md-icon-button
                            class="edit"
                            title="${this._('Remove')}"
                            aria-label="${this._('Remove')}"
                            @click="${e =>
                              this._handleParentChanged(e, parent)}"
                          >
                            <grampsjs-icon
                              path="${mdiLinkOff}"
                              color="var(--mdc-theme-secondary)"
                            ></grampsjs-icon>
                          </md-icon-button>
                        `
                      : ''}
                    <md-icon-button
                      class="edit"
                      title="${this._('Select an existing person')}"
                      aria-label="${this._('Select an existing person')}"
                      @click="${() => this._handleParentShare(parent)}"
                    >
                      <grampsjs-icon
                        path="${mdiLinkPlus}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>
                    <md-icon-button
                      class="edit"
                      title="${this._('Add a new person')}"
                      aria-label="${this._('Add a new person')}"
                      @click="${() => this._handleAddNewParent(parent)}"
                    >
                      <grampsjs-icon
                        path="${mdiPlus}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>
                  </div>
                `
              : ''}
          </dd>
        </div>
      </dl>
    `
  }

  _handleAddNewParent(parent) {
    this.dialogContent = html`
      <grampsjs-form-new-person
        @object:save="${e => this._handleNewParentSave(e, parent)}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-person>
    `
  }

  _handleParentShare() {
    this._handleEditFamily()
  }

  _handleParentChanged(e, parent) {
    this._openFamilyContext(this.data[`${parent}_handle`], true)
  }

  _handleEditFamily() {
    this._openFamilyContext()
  }

  _openFamilyContext(personHandle = '', disconnect = false) {
    if (!this.appState.permissions?.canEdit) return
    this.dialogContent = html`
      <grampsjs-form-family-context
        .family=${this.data}
        .appState=${this.appState}
        .personHandle=${personHandle}
        .familyLabel=${[this.data.profile?.father, this.data.profile?.mother]
          .map(person =>
            [person?.name_given, person?.name_surname].filter(Boolean).join(' ')
          )
          .filter(Boolean)
          .join(' / ')}
        ?disconnect=${disconnect}
        dialogTitle=${this._(
          disconnect
            ? 'Disconnect from this family'
            : 'Edit family relationships'
        )}
        @object:saved=${this._handleCancelDialog}
        @object:cancel=${this._handleCancelDialog}
      ></grampsjs-form-family-context>
    `
  }

  _handleNewParentSave(e, parent) {
    const data = {
      ...e.detail.data,
      parent,
    }
    fireEvent(this, 'edit:action', {
      action: 'newParent',
      data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-family', GrampsjsFamily)
