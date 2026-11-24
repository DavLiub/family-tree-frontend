import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiAccount} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditAssociation.js'
import './GrampsjsIcon.js'

import {personDisplayName, fireEvent} from '../util.js'

import '@material/web/list/list-item.js'

export class GrampsjsAssociations extends GrampsjsEditableList {
  static get properties() {
    return {
      extended: {type: Array},
    }
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(this.extended[i])
          }
        }}"
        >${personDisplayName(this.extended[i])}
        <span slot="supporting-text">${this._(obj.rel)}</span>
        <grampsjs-icon
          slot="start"
          path="${mdiAccount}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
        ${this._renderRowEdit(i, 'Edit association')}
      </md-list-item>
    `
  }

  _handleClick(obj) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(obj.gramps_id)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `person/${grampsId}`
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-association
        awaitSave
        @object:saved="${this._handleDialogCancel}"
        new
        @object:save="${this._handleAssocSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-association>
    `
  }

  _handleEdit() {
    const data = structuredClone(this.data[this._selectedIndex])
    const person = this.extended[this._selectedIndex]
    this.dialogContent = html`
      <grampsjs-form-edit-association
        awaitSave
        @object:saved="${this._handleDialogCancel}"
        @object:save="${this._handleAssocSaveEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${data}"
        .person="${person}"
      >
      </grampsjs-form-edit-association>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delAssociation',
      index: this._selectedIndex,
    })
  }

  _handleAssocSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addAssociation',
      complete: e.detail.complete,
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  _handleAssocSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateAssociation',
      complete: e.detail.complete,
      data: e.detail.data,
      index: this._selectedIndex,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-associations', GrampsjsAssociations)
