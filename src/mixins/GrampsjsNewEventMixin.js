import {html} from 'lit'

import '@material/mwc-textfield'

import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

export const GrampsjsNewEventMixin = superClass =>
  class extends superClass {
    renderForm() {
      const extras = html`
        ${this._renderCitationForm()} ${this._renderTagsForm()}
        ${this._renderAdditionalEventFields?.() || ''}
        <grampsjs-form-private
          id="private"
          .appState=${this.appState}
        ></grampsjs-form-private>
      `
      return html`
        <div ?hidden=${this.compact && Boolean(this.initialType)}>
          <h3 class="label">${this._('Type')}</h3>
          <grampsjs-form-select-type
            required
            noheading
            id="event-type"
            .value=${this.data?.type || this.initialType || ''}
            defaultValue=${this.initialType || ''}
            .appState="${this.appState}"
            ?loadingTypes="${this.loadingTypes}"
            typeName="event_types"
            .types="${this.types}"
            .typesLocale="${this.typesLocale}"
          >
          </grampsjs-form-select-type>
        </div>
        <h3 class="label">${this._('Date')}</h3>
        <p>
          <grampsjs-form-select-date id="date" .appState="${this.appState}">
          </grampsjs-form-select-date>
        </p>

        <h3 class="label">${this._('Description')}</h3>
        <p>
          <grampsjs-form-string
            fullwidth
            id="description"
            @formdata:changed="${this._handleFormData}"
            label="${this._('Description')}"
            .appState="${this.appState}"
          >
          </grampsjs-form-string>
        </p>

        <h3 class="label">${this._('Place')}</h3>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          id="place"
          objectType="place"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        ${this.compact
          ? html`<details>
              <summary>${this._('More details')}</summary>
              ${extras}
            </details>`
          : extras}
      `
    }
  }
