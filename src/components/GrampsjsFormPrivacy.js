import {html} from 'lit'
import '@material/web/switch/switch.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

export class GrampsjsFormPrivacy extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <p>
        ${this._('Privacy applies to this record, not to the whole website.')}
      </p>
      <label>
        <md-switch
          aria-label=${this._('Private record')}
          ?selected=${this.data.private}
          @change=${e => {
            this.data = {...this.data, private: e.target.selected}
          }}
        ></md-switch>
        ${this._('Private record')}
      </label>
    `
  }
}

window.customElements.define('grampsjs-form-privacy', GrampsjsFormPrivacy)
