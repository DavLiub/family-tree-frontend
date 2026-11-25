/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import {css, html, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {fireEvent} from '../util.js'
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiDelete,
  mdiLinkPlus,
  mdiPencil,
  mdiPlus,
} from '@mdi/js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {personListItemStyles, sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  confirmSectionRemoval,
  renderSectionCreateActions,
} from './sectionActions.js'

export class GrampsjsEditableList extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      personListItemStyles,
      css`
        md-list.activatable,
        md-list.activatable > * {
          --md-ripple-hover-opacity: 0;
          --md-ripple-pressed-opacity: 0;
        }

        md-list.activatable > * {
          transition: background-color 0.1s, color 0.1s;
        }

        md-list.activatable md-list-item.selected {
          background-color: var(
            --grampsjs-editable-list-selected-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)
          );
        }

        md-list.activatable md-list-item:not(.selected):hover,
        md-list.activatable md-list-item:not(.selected):focus {
          background-color: var(
            --grampsjs-editable-list-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)
          );
        }

        md-list.activatable md-list-item:not(.selected):active {
          background-color: var(
            --grampsjs-editable-list-active-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)
          );
        }

        md-list.activatable md-list-item.selected:hover,
        md-list.activatable md-list-item.selected:focus {
          background-color: var(
            --grampsjs-editable-list-selected-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 16%, transparent)
          );
          color: var(--grampsjs-body-font-color-90);
        }

        md-list.activatable md-list-item.selected:active {
          background-color: var(
            --grampsjs-editable-list-selected-active-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)
          );
        }

        md-icon-button[disabled] {
          color: var(--grampsjs-body-font-color-25);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      objType: {type: String},
      dialogContent: {type: String},
      dialogTitle: {type: String},
      hasAdd: {type: Boolean},
      hasShare: {type: Boolean},
      hasEdit: {type: Boolean},
      hasReorder: {type: Boolean},
      _selectedIndex: {type: Number},
      addLabel: {type: String},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.objType = ''
    this.dialogContent = ''
    this.dialogTitle = ''
    this.hasAdd = true
    this.hasShare = false
    this.hasEdit = false
    this.hasReorder = false
    this._selectedIndex = -1
    this.addLabel = 'Add'
  }

  render() {
    return html`
      ${this._renderCreateActions()}
      ${Object.keys(this.data).length === 0 && !this.edit
        ? ''
        : html`
            ${this.edit ? this._renderActionBtns() : ''}
            <md-list class="${classMap({activatable: this.edit})}">
              ${this.sortData([...this.data]).map((obj, i, arr) =>
                this.row(obj, i, arr)
              )}
            </md-list>
          `}
      ${this.dialogContent}
    `
  }

  _renderCreateActions() {
    return renderSectionCreateActions(this, {
      add: this.hasAdd && typeof this._handleAdd === 'function',
      attach: this.hasShare && typeof this._handleShare === 'function',
      addLabel: this.addLabel,
      newObject: ['Event', 'Citation', 'ChildRef'].includes(this.objType),
      onAdd: () => this._handleAdd(),
      onAttach: () => this._handleShare(),
    })
  }

  _renderRowEdit(index, label = 'Edit') {
    if (!this.appState.permissions?.canEdit) return ''
    return html`${this._renderRowRemove(index)}<md-icon-button
        slot="end"
        aria-label="${this._(label)}"
        title="${this._(label)}"
        @click="${e => {
          e.stopPropagation()
          this._selectedIndex = index
          this._handleEdit()
        }}"
      >
        <grampsjs-icon
          path="${mdiPencil}"
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>`
  }

  _renderRowRemove(index, label = 'Remove from card') {
    if (
      !this.appState.permissions?.canEdit ||
      typeof this._handleDelete !== 'function'
    )
      return ''
    return html`<md-icon-button
      slot="end"
      aria-label=${this._(label)}
      title=${this._(label)}
      @click=${e => {
        e.stopPropagation()
        this._requestRowRemove(index)
      }}
      ><grampsjs-icon
        path=${mdiDelete}
        color="var(--mdc-theme-secondary)"
      ></grampsjs-icon
    ></md-icon-button>`
  }

  _canRemoveIndex(index) {
    return index >= 0 && index < this.data.length
  }

  _requestRowRemove(index) {
    if (!this._canRemoveIndex(index)) return
    confirmSectionRemoval(this, () => {
      this._selectedIndex = index
      this._handleDelete(new Event('confirm'))
    })
  }

  _handleSelected(i) {
    this._selectedIndex = i
  }

  // function to sort the data, if necessary
  sortData(dataCopy) {
    return dataCopy
  }

  row(obj, i, arr) {
    return ''
  }

  _renderActionBtns() {
    if (!this.appState.permissions?.canEdit) return ''
    return html`
      ${this.hasEdit
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1}"
              class="edit"
              aria-label=${this._('Edit selected item')}
              @click="${this._handleEdit}"
            >
              <grampsjs-icon
                path="${mdiPencil}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.hasReorder
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === 0}"
              class="edit"
              aria-label=${this._('Move Up')}
              @click="${this._handleUp}"
            >
              <grampsjs-icon
                path="${mdiArrowUp}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
            <md-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === this.data.length - 1}"
              class="edit"
              aria-label=${this._('Move Down')}
              @click="${this._handleDown}"
            >
              <grampsjs-icon
                path="${mdiArrowDown}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      <md-icon-button
        ?disabled="${!this._canRemoveIndex(this._selectedIndex)}"
        class="edit"
        aria-label=${this._('Remove selected item')}
        @click="${() => this._requestRowRemove(this._selectedIndex)}"
      >
        <grampsjs-icon
          path="${mdiDelete}"
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>
    `
  }

  updated(changed) {
    if (changed.has('edit') && changed.get('edit') !== undefined) {
      this._selectedIndex = -1
      this.dialogContent = ''
    }
  }

  _updateSelectionAfterReorder(movedUp) {
    // Clear selection to avoid highlighting wrong item while API call completes.
    // The movedUp parameter is provided for subclasses that may want to track
    // and restore selection after the data updates.
    this._selectedIndex = -1
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
