import {LitElement, css, html} from 'lit'
import '@material/web/button/outlined-button'
import '@material/web/iconbutton/icon-button.js'
import {
  mdiAccountMultiple,
  mdiAccountMultiplePlus,
  mdiArrowDown,
  mdiArrowUp,
  mdiLinkOff,
  mdiLinkVariantPlus,
} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import './GrampsjsConnectedChildren.js'
import './GrampsjsConnectedParents.js'
import './GrampsjsFormAddPersonToFamily.js'
import './GrampsjsFormNewParentFamily.js'
import './GrampsjsFormNewPartnerFamily.js'
import './GrampsjsIcon.js'
import './GrampsjsFormFamilyContext.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsRelationships extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .familybtn {
          margin-left: 1.5em;
        }

        h4 {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .number {
          color: var(--grampsjs-body-font-color-35);
          font-size: 22px;
          margin-left: 0.3em;
        }

        .reorder-buttons {
          display: flex;
          align-items: center;
        }

        .reorder-buttons md-icon-button {
          --md-icon-button-icon-size: 20px;
          width: 34px;
          height: 34px;
        }

        .edit-buttons {
          margin-left: 0.5em;
          display: flex;
          align-items: center;
        }

        .edit-buttons > md-icon-button {
          --md-icon-button-icon-size: 24px;
          --md-icon-button-icon-color: var(--mdc-theme-secondary);
          --md-icon-button-icon-opacity: 1;
          width: 40px;
          height: 40px;
        }

        .button-list {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 0.5em;
          margin-bottom: 3em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      familyList: {type: Array},
      families: {type: Array},
      parentFamilyList: {type: Array},
      primaryParentFamily: {type: Object},
      otherParentFamilies: {type: Array},
      edit: {type: Boolean},
      personGender: {type: Number},
      personHandle: {type: String},
      dialogContent: {type: Object},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.familyList = []
    this.parentFamilyList = []
    this.families = []
    this.otherParentFamilies = []
    this.primaryParentFamily = {}
    this.edit = false
    this.personGender = 2
    this.personHandle = ''
    this.dialogContent = ''
  }

  // male=1 → father, female=0 → mother, unknown=2 → father
  get _personRole() {
    return this.personGender === 0 ? 'mother' : 'father'
  }

  render() {
    const parentFamilies = [
      this.primaryParentFamily,
      ...this.otherParentFamilies,
    ].filter(f => Object.keys(f).length > 0)
    const totalParent = parentFamilies.length
    const totalPartner = this.families.length
    return html`
      ${parentFamilies.map((familyProfile, i) =>
        this._renderFamily(
          familyProfile,
          totalParent < 2
            ? this._('Parents')
            : html`${this._('Parents')} <span class="number">${i + 1}</span>`,
          this._('Siblings'),
          this.edit
            ? html`
                <div class="edit-buttons">
                  ${totalParent > 1
                    ? this._renderReorderButtons(
                        i,
                        totalParent,
                        () => this._moveParentFamily(i, -1),
                        () => this._moveParentFamily(i, 1)
                      )
                    : ''}
                  ${this._renderRemoveButton(
                    () => this._openFamilyEditor(familyProfile, true),
                    this._('Remove person as child of these parents')
                  )}
                </div>
              `
            : ''
        )
      )}
      ${this.appState.permissions?.canEdit
        ? this._renderAddParentFamilyButtons()
        : ''}
      ${this.families.map((familyProfile, i) =>
        this._renderFamily(
          familyProfile,
          html`${this._('Partner')}
          ${totalPartner < 2 ? '' : html`<span class="number">${i + 1}</span>`}`,
          this._('Children'),
          this.edit
            ? html`
                <div class="edit-buttons">
                  ${totalPartner > 1
                    ? this._renderReorderButtons(
                        i,
                        totalPartner,
                        () => this._movePartnerFamily(i, -1),
                        () => this._movePartnerFamily(i, 1)
                      )
                    : ''}
                  ${this._renderRemoveButton(
                    () => this._openFamilyEditor(familyProfile, true),
                    this._('Remove person as parent in this family')
                  )}
                </div>
              `
            : ''
        )
      )}
      ${this.appState.permissions?.canEdit &&
      this.appState.permissions?.canAdd !== false
        ? this._renderAddPartnerFamilyButton()
        : ''}
      ${this.dialogContent}
    `
  }

  _renderRemoveButton(onClick, title) {
    return html`
      <md-icon-button
        class="edit"
        @click="${onClick}"
        title="${title}"
        aria-label="${title}"
      >
        <grampsjs-icon
          path="${mdiLinkOff}"
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>
    `
  }

  _openFamilyEditor(
    profile,
    disconnect = false,
    personHandle = this.personHandle,
    relationshipOnly = false
  ) {
    if (!this.appState.permissions?.canEdit) return
    const family = [...this.familyList, ...this.parentFamilyList].find(
      item => item.handle === profile.handle
    )
    if (!family) return
    const childIndex = (family.child_ref_list || []).findIndex(
      ref => ref.ref === personHandle
    )
    const child = profile.children?.[childIndex]
    const personLabel = child
      ? [child.name_given, child.name_surname].filter(Boolean).join(' ')
      : this.grampsId
    this.dialogContent = html`
      <grampsjs-form-family-context
        .appState=${this.appState}
        .family=${family}
        .personHandle=${personHandle}
        .personLabel=${personLabel}
        ?relationshipOnly=${relationshipOnly}
        .familyLabel=${[profile.father, profile.mother]
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
        @object:saved=${this._handleDialogCancel}
        @object:cancel=${this._handleDialogCancel}
      ></grampsjs-form-family-context>
    `
  }

  _renderAddParentFamilyButtons() {
    return html`
      <p class="button-list">
        <md-outlined-button
          class="edit"
          @click="${this._handleAddPersonToFamily}"
        >
          ${this._('Add person as child to an existing family')}
          <grampsjs-icon
            path="${mdiLinkVariantPlus}"
            color="var(--mdc-theme-secondary)"
            slot="icon"
          ></grampsjs-icon>
        </md-outlined-button>
        ${this.appState.permissions?.canAdd !== false
          ? html`<md-outlined-button
              class="edit"
              @click="${this._handleAddNewParents}"
            >
              ${this._('Add a new set of parents')}
              <grampsjs-icon
                path="${mdiAccountMultiplePlus}"
                color="var(--mdc-theme-secondary)"
                slot="icon"
              ></grampsjs-icon>
            </md-outlined-button>`
          : ''}
      </p>
    `
  }

  _renderAddPartnerFamilyButton() {
    return html`
      <p class="button-list">
        <md-outlined-button
          class="edit"
          @click="${this._handleAddPartnerFamily}"
        >
          ${this._('Add a new family with person as parent')}
          <grampsjs-icon
            path="${mdiAccountMultiplePlus}"
            color="var(--mdc-theme-secondary)"
            slot="icon"
          ></grampsjs-icon>
        </md-outlined-button>
      </p>
    `
  }

  _handleAddPersonToFamily() {
    this.dialogContent = html`
      <grampsjs-form-add-person-to-family
        @object:save="${this._handleAddToFamilySave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        personHandle="${this.personHandle}"
        dialogTitle="${this._('Add person as child to an existing family')}"
      ></grampsjs-form-add-person-to-family>
    `
  }

  _handleAddNewParents() {
    this.dialogContent = html`
      <grampsjs-form-new-parent-family
        @object:save="${this._handleNewParentFamilySave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        personHandle="${this.personHandle}"
        dialogTitle="${this._('Add a new set of parents')}"
      ></grampsjs-form-new-parent-family>
    `
  }

  _handleAddPartnerFamily() {
    this.dialogContent = html`
      <grampsjs-form-new-partner-family
        @object:save="${this._handleNewPartnerFamilySave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        personRole="${this._personRole}"
        personHandle="${this.personHandle}"
        dialogTitle="${this._('Add a new family with person as parent')}"
      ></grampsjs-form-new-partner-family>
    `
  }

  _handleAddToFamilySave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addPersonToExistingFamily',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNewParentFamilySave(e) {
    fireEvent(this, 'edit:action', {
      action: 'newParentFamily',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNewPartnerFamilySave(e) {
    fireEvent(this, 'edit:action', {
      action: 'newPartnerFamily',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }

  _renderReorderButtons(index, total, onUp, onDown) {
    return html`
      <div class="reorder-buttons">
        <md-icon-button
          ?disabled="${index === 0}"
          @click="${onUp}"
          title="${this._('Move Up')}"
        >
          <grampsjs-icon
            path="${mdiArrowUp}"
            color="var(--mdc-theme-secondary)"
            height="20"
            width="20"
          ></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          ?disabled="${index === total - 1}"
          @click="${onDown}"
          title="${this._('Move Down')}"
        >
          <grampsjs-icon
            path="${mdiArrowDown}"
            color="var(--mdc-theme-secondary)"
            height="20"
            width="20"
          ></grampsjs-icon>
        </md-icon-button>
      </div>
    `
  }

  _movePartnerFamily(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= this.families.length) return
    const newOrder = [...this.families]
    ;[newOrder[index], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[index],
    ]
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {family_list: newOrder.map(f => f.handle)},
    })
  }

  _moveParentFamily(index, direction) {
    const parentFamilies = [
      this.primaryParentFamily,
      ...this.otherParentFamilies,
    ].filter(f => Object.keys(f).length > 0)
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= parentFamilies.length) return
    const newOrder = [...parentFamilies]
    ;[newOrder[index], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[index],
    ]
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {parent_family_list: newOrder.map(f => f.handle)},
    })
  }

  _renderFamily(
    familyProfile,
    parentTitle,
    childrenTitle,
    reorderButtons = ''
  ) {
    if (Object.keys(familyProfile).length === 0) {
      return html``
    }
    return html`
      <h4>
        ${parentTitle}
        ${this._renderFamilyBtn(familyProfile.gramps_id)}${reorderButtons}
      </h4>
      ${this.appState.permissions?.canEdit
        ? html`<p class="button-list">
            <md-outlined-button
              @click=${() => this._openFamilyEditor(familyProfile)}
            >
              ${this._('Edit family relationships')}
            </md-outlined-button>
            ${!this.edit
              ? html`<md-outlined-button
                  @click=${() => this._openFamilyEditor(familyProfile, true)}
                >
                  ${this._('Disconnect from this family')}
                </md-outlined-button>`
              : ''}
          </p>`
        : ''}
      <grampsjs-connected-parents
        familyGrampsId="${familyProfile.gramps_id}"
        .profile="${familyProfile}"
        highlightId="${this.grampsId}"
        .appState="${this.appState}"
      ></grampsjs-connected-parents>
      ${this._renderChildren(familyProfile, childrenTitle)}
    `
  }

  _renderFamilyBtn(grampsId) {
    return html` <md-outlined-button
      class="familybtn"
      @click="${() => this._handleButtonClick(grampsId)}"
    >
      <grampsjs-icon
        path="${mdiAccountMultiple}"
        color="var(--mdc-theme-primary)"
        slot="icon"
      ></grampsjs-icon>
      ${this._('Family')}
    </md-outlined-button>`
  }

  _handleButtonClick(grampsId) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {
          path: `family/${grampsId}`,
        },
      })
    )
  }

  _renderChildren(profile, childrenTitle) {
    const allFamilies = [...this.familyList, ...this.parentFamilyList]
    const [family] = allFamilies.filter(obj => obj.handle === profile.handle)
    return html`
      ${profile?.children?.length
        ? html`
            <h4>${childrenTitle}</h4>
            <grampsjs-connected-children
              familyGrampsId="${profile.gramps_id}"
              .profile=${profile?.children || []}
              .data=${family?.child_ref_list || []}
              .appState="${this.appState}"
              highlightId="${this.grampsId}"
            ></grampsjs-connected-children>
            ${this.appState.permissions?.canEdit
              ? html` <div class="button-list">
                  ${(profile.children || []).map((child, i) => {
                    const ref = family?.child_ref_list?.[i]
                    if (!ref || ref.ref === this.personHandle) return ''
                    const name = [child.name_given, child.name_surname]
                      .filter(Boolean)
                      .join(' ')
                    return html`<md-outlined-button
                      @click=${() =>
                        this._openFamilyEditor(profile, false, ref.ref, true)}
                      >${this._('Edit relationship')}:
                      ${name}</md-outlined-button
                    >`
                  })}
                </div>`
              : ''}
          `
        : ''}
    `
  }
}

window.customElements.define('grampsjs-relationships', GrampsjsRelationships)
