import {html} from 'lit'
import '@material/web/checkbox/checkbox.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'
import {saveContextObject} from './contextEdit.js'
import {familyContextChanges} from './familyContext.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'

export class GrampsjsFormFamilyContext extends GrampsjsObjectForm {
  static get properties() {
    return {
      ...super.properties,
      family: {type: Object},
      personHandle: {type: String},
      familyLabel: {type: String},
      personLabel: {type: String},
      disconnect: {type: Boolean},
      relationshipOnly: {type: Boolean},
      confirmed: {state: true},
    }
  }

  constructor() {
    super()
    this.family = {}
    this.personHandle = ''
    this.familyLabel = ''
    this.personLabel = ''
    this.disconnect = false
    this.relationshipOnly = false
    this.confirmed = false
    this.noReset = true
  }

  willUpdate(changed) {
    if (changed.has('family')) {
      this._initial = structuredClone(this.family)
      const child = (this.family.child_ref_list || []).find(
        ref => ref.ref === this.personHandle
      )
      this.data = {
        father_handle: this.family.father_handle || '',
        mother_handle: this.family.mother_handle || '',
        type: this.family.type?.string || this.family.type || '',
        ...(child
          ? {frel: child.frel || 'Birth', mrel: child.mrel || 'Birth'}
          : {}),
      }
    }
  }

  get isValid() {
    return Boolean(
      this.family.handle &&
        this.appState.permissions?.canEdit &&
        (!this._needsConfirmation || this.confirmed)
    )
  }

  get _needsConfirmation() {
    return (
      this.disconnect ||
      ['father_handle', 'mother_handle'].some(
        key => (this.data[key] || '') !== (this._initial?.[key] || '')
      )
    )
  }

  renderForm() {
    const isChild = (this.family.child_ref_list || []).some(
      ref => ref.ref === this.personHandle
    )
    return html`
      <p>
        ${this._('These changes affect this family and its linked people.')}
      </p>
      <p>${this.familyLabel} ${this.family.gramps_id || ''}</p>
      ${this.personLabel ? html`<p>${this.personLabel}</p>` : ''}
      ${this.disconnect
        ? html`<p>
            ${this._(
              'Disconnecting removes only this relationship. People remain in the tree.'
            )}
          </p>`
        : html`
            ${this.relationshipOnly
              ? ''
              : ['father', 'mother'].map(
                  role => html` <h4>
                      ${this._(role === 'father' ? 'Father' : 'Mother')}
                    </h4>
                    <grampsjs-form-select-object-list
                      id=${role}
                      objectType="person"
                      fixedMenuPosition
                      .appState=${this.appState}
                      label=${this._('Select')}
                      .objectsInitial=${this.family[`${role}_handle`]
                        ? [
                            {
                              object_type: 'person',
                              handle: this.family[`${role}_handle`],
                              object: {},
                            },
                          ]
                        : []}
                    ></grampsjs-form-select-object-list>`
                )}
            ${this.relationshipOnly
              ? ''
              : this._renderType(
                  'family-rel-type',
                  'family_relation_types',
                  this._('Relationship type:').replace(':', ''),
                  this.data.type,
                  'Unknown'
                )}
            ${isChild
              ? ['frel', 'mrel'].map(key =>
                  this._renderType(
                    `child-${key}`,
                    'child_reference_types',
                    this._(
                      key === 'frel'
                        ? 'Relationship to _Father:'
                        : 'Relationship to _Mother:'
                    ).replace(':', ''),
                    this.data[key],
                    'Birth'
                  )
                )
              : ''}
          `}
      ${this._needsConfirmation
        ? html` <label>
            <md-checkbox
              ?checked=${this.confirmed}
              @change=${e => {
                this.confirmed = e.target.checked
              }}
            ></md-checkbox>
            ${this._('Confirm family changes')}
          </label>`
        : ''}
    `
  }

  _renderType(id, typeName, heading, value, defaultValue) {
    return html`<grampsjs-form-select-type
      id=${id}
      typeName=${typeName}
      heading=${heading}
      .appState=${this.appState}
      .types=${this.types}
      .typesLocale=${this.typesLocale}
      ?loadingTypes=${this.loadingTypes}
      .value=${value?.string || value || ''}
      defaultValue=${defaultValue}
    ></grampsjs-form-select-type>`
  }

  _handleFormData(e) {
    this.confirmed = false
    super._handleFormData(e)
  }

  async _handleDialogSave() {
    if (!this.isValid || this.saving) return
    const success = await this.submitSave(() =>
      saveContextObject(this.appState, 'families', this.family.handle, fresh =>
        familyContextChanges(
          fresh,
          this._initial,
          this.data,
          this.personHandle,
          this.disconnect
        )
      )
    )
    if (success) {
      fireEvent(this, 'context:saved')
      fireEvent(this, 'object:saved')
    }
  }
}

window.customElements.define(
  'grampsjs-form-family-context',
  GrampsjsFormFamilyContext
)
