import {html} from 'lit'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

export class GrampsjsFormGender extends GrampsjsObjectForm {
  renderForm() {
    return html`<md-filled-select
      label="${this._('Gender')}"
      .value="${String(this.data.gender ?? 2)}"
      @change="${e => {
        this.data = {...this.data, gender: Number(e.target.value)}
      }}"
    >
      ${['Female', 'Male', 'Unknown', 'Other'].map(
        (label, index) => html`<md-select-option value="${index}">
          <div slot="headline">${this._(label)}</div>
        </md-select-option>`
      )}
    </md-filled-select>`
  }
}

window.customElements.define('grampsjs-form-gender', GrampsjsFormGender)
