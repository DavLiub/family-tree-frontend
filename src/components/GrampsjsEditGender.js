import {LitElement, html} from 'lit'

import '@material/web/iconbutton/icon-button.js'
import {
  mdiGenderFemale,
  mdiGenderMale,
  mdiGenderNonBinary,
  mdiHelp,
} from '@mdi/js'

import './GrampsjsIcon.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsFormGender.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'

const icons = {
  0: mdiGenderFemale,
  1: mdiGenderMale,
  2: mdiHelp,
  3: mdiGenderNonBinary,
}

export class GrampsjsEditGender extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      gender: {type: Number},
      edit: {type: Boolean},
      dialogContent: {state: true},
    }
  }

  constructor() {
    super()
    this.gender = 2 // unknown
    this.edit = false
    this.dialogContent = ''
  }

  render() {
    if (!this.edit && !this.appState.permissions?.canEdit) {
      return ''
    }
    return html`
      <md-icon-button
        @click="${this._handleClick}"
        class="edit"
        aria-label="${this._('Edit gender')}"
        title="${this._('Edit gender')}"
      >
        <grampsjs-icon path="${icons[this.gender]}"></grampsjs-icon>
      </md-icon-button>
      ${this.dialogContent}
    `
  }

  _handleClick() {
    this.dialogContent = html`<grampsjs-form-gender
      awaitSave
      dialogTitle="${this._('Edit gender')}"
      .appState="${this.appState}"
      .data="${{gender: this.gender}}"
      @object:save="${e => {
        e.stopPropagation()
        fireEvent(this, 'edit:action', {
          action: 'updateProp',
          data: e.detail.data,
          complete: e.detail.complete,
        })
      }}"
      @object:saved="${() => {
        this.dialogContent = ''
      }}"
      @object:cancel="${() => {
        this.dialogContent = ''
      }}"
    ></grampsjs-form-gender>`
  }
}

window.customElements.define('grampsjs-edit-gender', GrampsjsEditGender)
