import {html} from 'lit'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {saveContextObject} from './contextEdit.js'
import {GrampsjsNestedContextMixin} from './contextEditor.js'
import {emptyDate, fireEvent} from '../util.js'
import './GrampsjsFormString.js'
import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/button/text-button.js'

const fieldsByEndpoint = {
  media: {desc: 'Description'},
  places: {'context-place-name': 'Name'},
  repositories: {name: 'Name', type: 'Type'},
  citations: {page: 'Page'},
  sources: {
    title: 'Title',
    author: 'Author',
    abbrev: 'Abbreviation',
    pubinfo: 'Publication info',
  },
}

// Editing a record keeps its identity and all fields outside this small form.
export class GrampsjsFormContextObject extends GrampsjsNestedContextMixin(
  GrampsjsObjectForm
) {
  static get properties() {
    return {
      endpoint: {type: String},
      handle: {type: String},
    }
  }

  constructor() {
    super()
    this.endpoint = ''
    this.handle = ''
    this.noReset = true
  }

  renderForm() {
    const fields = Object.entries(fieldsByEndpoint[this.endpoint] || {})
    return html`
      ${this._renderTextFields(fields.slice(0, 1))}
      ${['media', 'citations'].includes(this.endpoint)
        ? html`
            <h4>${this._('Date')}</h4>
            <grampsjs-form-select-date
              id="date"
              .data="${this.data.date || emptyDate}"
              .appState="${this.appState}"
            ></grampsjs-form-select-date>
          `
        : ''}
      <details>
        <summary>${this._('More details')}</summary>
        ${this._renderTextFields(fields.slice(1))}
        ${this.endpoint === 'citations' ? this._renderCitationDetails() : ''}
        <p>
          ${this._('Changes to this record also appear wherever it is used.')}
        </p>
      </details>
    `
  }

  _renderTextFields(fields) {
    return fields.map(
      ([key, label]) => html`
        <p>
          <grampsjs-form-string
            fullwidth
            id="${key}"
            label="${this._(label)}"
            value="${key === 'context-place-name'
              ? this.data.name?.value || ''
              : this.data[key] || ''}"
            .appState="${this.appState}"
          ></grampsjs-form-string>
        </p>
      `
    )
  }

  _renderCitationDetails() {
    const source =
      this.data.extended?.source?.handle === this.data.source_handle
        ? this.data.extended.source
        : {}
    return html`
      <h4>${this._('Source')}</h4>
      <grampsjs-form-select-object-list
        id="source"
        objectType="source"
        notDeletable
        .objectsInitial="${this.data.source_handle
          ? [
              {
                object_type: 'source',
                object: source,
                handle: this.data.source_handle,
              },
            ]
          : []}"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>
      <p>
        ${this._('Source changes are saved separately from this citation.')}
      </p>
      <md-text-button
        ?disabled="${!this.data.source_handle || this.saving}"
        @click="${this._openSourceEditor}"
        >${this._('Edit source details')}</md-text-button
      >
      <md-filled-select
        label="${this._('Confidence')}"
        .value="${String(this.data.confidence ?? 2)}"
        @change="${e => {
          this.data = {...this.data, confidence: Number(e.target.value)}
        }}"
      >
        ${['Very Low', 'Low', 'Normal', 'High', 'Very High'].map(
          (label, index) => html`<md-select-option value="${index}">
            <div slot="headline">${this._(label)}</div>
          </md-select-option>`
        )}
      </md-filled-select>
    `
  }

  _openSourceEditor() {
    const handle = this.data.source_handle
    return this.openNestedContextEditor(
      'sources',
      handle,
      this._('Edit source details'),
      source => {
        if (this.data.source_handle === handle) {
          this.data = {...this.data, extended: {...this.data.extended, source}}
        }
      }
    )
  }

  _handleFormData(event) {
    const id = event.composedPath()[0].id
    if (id === 'context-place-name') {
      this.data = {
        ...this.data,
        name: {...this.data.name, value: event.detail.data},
      }
    } else if (
      this.endpoint === 'repositories' &&
      ['name', 'type'].includes(id)
    ) {
      this.data = {...this.data, [id]: event.detail.data}
    } else {
      super._handleFormData(event)
    }
  }

  get isValid() {
    return (
      Boolean(fieldsByEndpoint[this.endpoint]) &&
      Boolean(this.handle) &&
      (this.endpoint !== 'citations' || Boolean(this.data.source_handle)) &&
      this._areDateSelectValid()
    )
  }

  async _handleDialogSave() {
    const keys = Object.keys(fieldsByEndpoint[this.endpoint] || {})
    if (['media', 'citations'].includes(this.endpoint)) keys.push('date')
    if (this.endpoint === 'citations') keys.push('confidence', 'source_handle')
    const fields = Object.fromEntries(keys.map(key => [key, this.data[key]]))
    const saved = await this.submitSave(() =>
      saveContextObject(
        this.appState,
        this.endpoint,
        this.handle,
        this.endpoint === 'places'
          ? fresh => ({
              name: {...fresh.name, value: this.data.name?.value || ''},
            })
          : fields
      )
    )
    if (saved) {
      fireEvent(this, 'context:saved')
      fireEvent(this, 'object:saved')
    }
  }
}

window.customElements.define(
  'grampsjs-form-context-object',
  GrampsjsFormContextObject
)
