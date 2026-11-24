import {html} from 'lit'
import {GrampsjsFormEditEventDetails} from './GrampsjsFormEditEventDetails.js'
import {saveContextObject} from './contextEdit.js'
import {GrampsjsNestedContextMixin} from './contextEditor.js'
import './GrampsjsFormContextObject.js'
import '@material/web/button/text-button.js'
import {fireEvent, emptyDate} from '../util.js'
import './GrampsjsFormString.js'

export class GrampsjsFormContextEvent extends GrampsjsNestedContextMixin(
  GrampsjsFormEditEventDetails
) {
  static get properties() {
    return {...super.properties, handle: {type: String}}
  }

  constructor() {
    super()
    this.handle = ''
    this.noReset = true
  }

  renderForm() {
    return html`
      <div ?inert=${this.saving} aria-busy=${this.saving}>
        ${super.renderForm()}
        <grampsjs-form-string
          fullwidth
          id="description"
          label=${this._('Description')}
          .appState=${this.appState}
          value=${this.data.description || ''}
        ></grampsjs-form-string>
        <details>
          <summary>${this._('More details')}</summary>
          <p>
            ${this._('Changes to this record also appear wherever it is used.')}
          </p>
          <p>
            ${this._('Place changes are saved separately from this event.')}
          </p>
          <md-text-button
            ?disabled=${!this.data.place || this.saving}
            @click=${this._openPlaceEditor}
            >${this._('Edit this place')}</md-text-button
          >
        </details>
      </div>
    `
  }

  _openPlaceEditor() {
    const handle = this.data.place
    return this.openNestedContextEditor(
      'places',
      handle,
      this._('Edit this place'),
      place => {
        if (this.data.place === handle) this.place = place
      }
    )
  }

  async _handleDialogSave() {
    if (!this.appState.permissions?.canEdit) return
    const {date, place = '', description = ''} = this.data
    const saved = await this.submitSave(() =>
      saveContextObject(this.appState, 'events', this.handle, {
        date,
        place,
        description,
      })
    )
    if (saved) {
      fireEvent(this, 'context:saved')
      fireEvent(this, 'object:saved')
    }
  }
}

window.customElements.define(
  'grampsjs-form-context-event',
  GrampsjsFormContextEvent
)

// Share the editor entry point between summaries, event lists and families.
export function renderContextEventEditor(appState, event, title, onClose) {
  return html`<grampsjs-form-context-event
    .appState=${appState}
    handle=${event.handle}
    .data=${structuredClone({
      date: event.date || emptyDate,
      place: event.place || '',
      description: event.description || '',
    })}
    .place=${event.extended?.place || {}}
    dialogTitle=${title}
    @object:saved=${onClose}
    @object:cancel=${onClose}
  ></grampsjs-form-context-event>`
}
