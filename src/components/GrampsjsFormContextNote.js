import {html, css} from 'lit'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {saveContextObject} from './contextEdit.js'
import {clearDraft} from '../api.js'
import {fireEvent} from '../util.js'
import './GrampsjsEditor.js'

export class GrampsjsFormContextNote extends GrampsjsObjectForm {
  static get properties() {
    return {...super.properties, handle: {type: String}}
  }

  static get styles() {
    return [
      super.styles,
      css`
        md-dialog {
          --md-dialog-container-max-inline-size: min(900px, 95vw);
          --md-dialog-container-min-inline-size: min(600px, 95vw);
        }
      `,
    ]
  }

  constructor() {
    super()
    this.handle = ''
    this.noReset = true
  }

  renderForm() {
    return html`
      <p>
        ${this._('Changes to this record also appear wherever it is used.')}
      </p>
      <div ?inert=${this.saving} aria-busy=${this.saving}>
        <grampsjs-editor
          localSave
          id=${`context-note-${this.handle}`}
          .appState=${this.appState}
          .initialData=${this.data.text}
          @formdata:changed=${this._handleText}
          @keydown=${e => e.stopPropagation()}
        ></grampsjs-editor>
      </div>
    `
  }

  _handleText(e) {
    e.stopPropagation()
    this.data = {...this.data, text: e.detail.data}
  }

  _clearEditorDraft() {
    const editor = this.renderRoot.querySelector('grampsjs-editor')
    if (editor?._draftSaveTimer) {
      clearTimeout(editor._draftSaveTimer)
      editor._draftSaveTimer = null
    }
    const {page = '', pageId = ''} = this.appState.path || {}
    clearDraft(`${page}:${pageId}:context-note-${this.handle}`)
  }

  async _handleDialogSave() {
    if (!this.appState.permissions?.canEdit) return
    const text =
      this.renderRoot.querySelector('grampsjs-editor')?.data || this.data.text
    const saved = await this.submitSave(() =>
      saveContextObject(this.appState, 'notes', this.handle, {text})
    )
    if (saved) {
      this._clearEditorDraft()
      fireEvent(this, 'context:saved')
      fireEvent(this, 'object:saved')
    }
  }

  _handleDialogCancel() {
    if (this.saving) return
    this._clearEditorDraft()
    super._handleDialogCancel()
  }
}

window.customElements.define(
  'grampsjs-form-context-note',
  GrampsjsFormContextNote
)
