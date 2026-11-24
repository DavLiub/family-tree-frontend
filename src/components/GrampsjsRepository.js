import {html} from 'lit'
import '@material/web/button/text-button.js'
import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsFormContextObject.js'
import {renderContextObjectEditor} from './contextEditor.js'
import {objectIconPath} from '../util.js'

export class GrampsjsRepository extends GrampsjsObject {
  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Repositories'
    this._objectEndpoint = 'repositories'
    this._objectIcon = objectIconPath.repository
  }

  renderProfile() {
    return html`
      <h2>${this.data.name}</h2>
      ${this.data.type
        ? html`<dl>
            <div>
              <dt>${this._('Type')}</dt>
              <dd>${this._(this.data.type)}</dd>
            </div>
          </dl>`
        : ''}
      ${this.appState.permissions?.canEdit
        ? html`<md-text-button @click=${this._handleEditRepository}>
            ${this._('Edit repository details')}
          </md-text-button>`
        : ''}
    `
  }

  _handleEditRepository() {
    this.dialogContent = renderContextObjectEditor({
      appState: this.appState,
      record: this.data,
      endpoint: 'repositories',
      title: this._('Edit repository details'),
      onSaved: () => this._handleCancelDialog(),
      onCancel: () => this._handleCancelDialog(),
    })
  }
}

window.customElements.define('grampsjs-repository', GrampsjsRepository)
