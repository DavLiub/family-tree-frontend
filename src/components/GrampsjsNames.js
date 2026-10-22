import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-button'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import {fireEvent} from '../util.js'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditName.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsName.js'
import './GrampsjsObjectForm.js'

export class GrampsjsNames extends GrampsjsEditableList {
  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      dialogContent: {type: String},
      dialogTitle: {type: String},
      _saveStatus: {state: true},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.dialogContent = ''
    this.dialogTitle = ''
    this._saveStatus = ''
    this.hasEdit = true
    this.hasReorder = true
  }

  render() {
    return html`${super.render()}<span role="status" aria-live="polite"
        >${this._saveStatus}</span
      >`
  }

  row(obj, i) {
    return html` ${!obj
      ? ''
      : html`
          <md-list-item
            type="${this.edit ? 'button' : 'text'}"
            style="height: auto"
            class="${classMap({selected: i === this._selectedIndex})}"
            @click="${() => {
              if (this.edit) {
                this._handleSelected(i)
              }
            }}"
          >
            <grampsjs-name
              .appState="${this.appState}"
              .data="${obj}"
            ></grampsjs-name>
          </md-list-item>
        `}`
  }

  _handleAdd() {
    this._saveStatus = ''
    this.dialogContent = html`
      <grampsjs-form-edit-name
        id="name"
        @object:save="${this._handleNameAdd}"
        @object:cancel="${this._handleNameCancel}"
        @object:saved="${this._handleNameSaved}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-name>
    `
  }

  _handleDelete() {
    const handle = this._selectedIndex
    this.dialogContent = html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Are you sure?')}</span>
        <div slot="content">${this._('This action cannot be undone.')}</div>
        <div slot="actions">
          <md-text-button @click="${() => this._handleNameCancel()}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button
            @click="${() =>
              this._handleNameDelete(handle, new Event('confirm'))}"
          >
            ${this._('Yes')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _handleUp() {
    fireEvent(this, 'edit:action', {
      action: 'upName',
      handle: this._selectedIndex,
    })
    this._updateSelectionAfterReorder(true)
  }

  _handleDown() {
    fireEvent(this, 'edit:action', {
      action: 'downName',
      handle: this._selectedIndex,
    })
    this._updateSelectionAfterReorder(false)
  }

  _handleEdit() {
    this._saveStatus = ''
    const handle = this._selectedIndex
    this.dialogContent = html`
      <grampsjs-form-edit-name
        id="name"
        @object:save="${e => this._handleNameSave(handle, e)}"
        @object:cancel="${this._handleNameCancel}"
        @object:saved="${this._handleNameSaved}"
        .appState="${this.appState}"
        .data="${structuredClone(this.data[handle])}"
      >
      </grampsjs-form-edit-name>
    `
  }

  _handleNameAdd(e) {
    fireEvent(this, 'edit:action', {
      action: 'addName',
      data: e.detail.data,
      complete: e.detail.complete,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  _handleNameDelete(handle, e) {
    fireEvent(this, 'edit:action', {
      action: 'delName',
      data: {index: handle},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleNameSave(handle, e) {
    fireEvent(this, 'edit:action', {
      action: 'updateName',
      data: {index: handle, name: e.detail.data},
      complete: e.detail.complete,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  _handleNameSaved(e) {
    e.stopPropagation()
    this.dialogContent = ''
    this._saveStatus = this._('Saved')
  }

  _handleNameCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-names', GrampsjsNames)
