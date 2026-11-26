import {css, html, LitElement} from 'lit'

import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEditName.js'
import './GrampsjsObjectForm.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {formatHistoryName} from './nameHistory.js'

export class GrampsjsName extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        p {
          margin-block: 0 0.35rem;
          overflow-wrap: anywhere;
        }

        details {
          white-space: normal;
        }

        summary {
          cursor: pointer;
        }

        h4 {
          clear: left;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      compact: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.compact = false
  }

  render() {
    if (!this.compact) return this._renderDetails()
    const hasDetails =
      this.data.type ||
      ['title', 'suffix', 'call', 'nick', 'famnick'].some(
        key => this.data[key]
      ) ||
      (this.data.surname_list || []).some(surname => surname.origintype)
    return html`
      <p>${formatHistoryName(this.data)}</p>
      ${hasDetails
        ? html`<details
            @click="${e => e.stopPropagation()}"
            @keydown="${e => e.stopPropagation()}"
          >
            <summary>${this._('More details')}</summary>
            ${this._renderDetails()}
          </details>`
        : ''}
    `
  }

  _renderDetails() {
    return html`
      <h4>${this._(this.data.type)}</h4>
      <dl>
        ${this.data.title
          ? html`
              <div>
                <dt>${this._('Title')}</dt>
                <dd>${this.data.title}</dd>
              </div>
            `
          : ''}
        ${this.data.first_name
          ? html`
              <div>
                <dt>${this._('Given name')}</dt>
                <dd>${this.data.first_name}</dd>
              </div>
            `
          : ''}
        ${this.data.suffix
          ? html`
              <div>
                <dt>${this._('Suffix')}</dt>
                <dd>${this.data.suffix}</dd>
              </div>
            `
          : ''}
        ${this.data.call
          ? html`
              <div>
                <dt>${this._('Call name')}</dt>
                <dd>${this.data.call}</dd>
              </div>
            `
          : ''}
        ${this.data.nick
          ? html`
              <div>
                <dt>${this._('Nickname')}</dt>
                <dd>${this.data.nick}</dd>
              </div>
            `
          : ''}
        ${(this.data.surname_list || []).length > 0
          ? html`
              ${this.data.surname_list.map(
                surname => html`
                  <div>
                    <dt>
                      ${this._('Surname')}
                      ${surname.origintype
                        ? html`(${this._(surname.origintype)})`
                        : ''}
                    </dt>
                    <dd>
                      ${surname.prefix} ${surname.surname} ${surname.connector}
                    </dd>
                  </div>
                `
              )}
            `
          : ''}
        ${this.data.famnick
          ? html`
              <div>
                <dt>${this._('Family nick name')}</dt>
                <dd>${this.data.famnick}</dd>
              </div>
            `
          : ''}
      </dl>
    `
  }
}

window.customElements.define('grampsjs-name', GrampsjsName)
