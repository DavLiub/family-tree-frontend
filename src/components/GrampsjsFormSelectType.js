/*
Element for selecting a Gramps type
*/

import {css, html, LitElement} from 'lit'
import {keyed} from 'lit/directives/keyed.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/components/input/input.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/textfield/filled-text-field.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsFormSelectType extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hide {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      webawesome: {type: Boolean},
      disabled: {type: Boolean},
      loadingTypes: {type: Boolean},
      nocustom: {type: Boolean},
      noheading: {type: Boolean},
      required: {type: Boolean},
      allowedTypes: {type: Array},
      defaultValue: {type: String},
      heading: {type: String},
      label: {type: String},
      typeName: {type: String},
      typeNameCustom: {type: String},
      types: {type: Object},
      typesLocale: {type: Object},
      value: {type: String},
      _hasCustomType: {type: Boolean},
      _touched: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.webawesome = false
    this.disabled = false
    this.loadingTypes = false
    this.nocustom = false
    this.noheading = false
    this.required = false
    this.allowedTypes = []
    this.defaultValue = 'General'
    this.heading = ''
    this.label = ''
    this.typeName = ''
    this.typeNameCustom = ''
    this.types = {}
    this.typesLocale = {}
    this.value = ''
    this._hasCustomType = false
    this._touched = false
  }

  reset() {
    this._hasCustomType = false
    this._touched = false
    this.value = ''
    const selectElement = this.renderRoot.querySelector('#select-type')
    if (selectElement) {
      if (this.webawesome) selectElement.value = this.defaultValue
      else selectElement.select(this.defaultValue)
    }
  }

  updated(changed) {
    if (
      this.webawesome &&
      (this.typeName in (this.types?.default || {}) ||
        (this.typeNameCustom || this.typeName) in (this.types?.custom || {})) &&
      !this.loadingTypes &&
      (changed.has('types') || changed.has('loadingTypes')) &&
      this.value &&
      !this.getTypes().includes(this.value)
    ) {
      this._hasCustomType = true
    }
    if (changed.has('types')) {
      const types = this.getTypes()
      if (
        Array.isArray(types) &&
        !types.includes(this.value) &&
        (!this.webawesome || !this.value) &&
        types.includes(this.defaultValue)
      ) {
        this.#setValue(this.defaultValue)
      }
    }
  }

  isValid() {
    return !this.required || this.value
  }

  render() {
    if (this.webawesome) return this._renderAwesome()
    return html`
      ${this.noheading ? '' : this.#renderHeading()}
      <p>
        ${this.loadingTypes ? this.#renderLoading() : this.#renderInputs()}
        ${this.nocustom ? '' : this.#renderCustomSwitch()}
      </p>
    `
  }

  _renderAwesome() {
    const values = this.getTypes()
    const options =
      this.value && !values.includes(this.value)
        ? [...values, this.value]
        : values
    return html` ${this.noheading ? '' : this.#renderHeading()}
      <p>
        ${this._hasCustomType
          ? html`
              <wa-input
                id="custom-type"
                label="${this.label} ${this._('Custom')}"
                .value=${this.value}
                ?disabled=${this.disabled || this.loadingTypes}
                ?required=${this.required}
                @input=${this.#handleTextFieldInput}
                @blur=${this.#handleTextFieldBlur}
              ></wa-input>
            `
          : keyed(
              JSON.stringify(options.map(value => this._(value))),
              html`
                <wa-select
                  id="select-type"
                  style="width:100%"
                  label=${this.loadingTypes
                    ? this._('Loading items...')
                    : this.label}
                  .value=${this.value}
                  ?disabled=${this.disabled || this.loadingTypes}
                  ?required=${this.required}
                  @change=${this.#handleSelectChange}
                  @wa-after-hide=${this.#handleSelectClosing}
                >
                  <wa-option value=""></wa-option>
                  ${options.map(
                    value =>
                      html`<wa-option value=${value}
                        >${this._(value)}</wa-option
                      >`
                  )}
                </wa-select>
              `
            )}
        ${this.#error
          ? html`<span role="alert">${this._('This field is mandatory')}</span>`
          : ''}
        ${this.nocustom
          ? ''
          : html` <wa-button
              appearance="plain"
              id="button-switch-type"
              @click=${this.#toggleCustomType}
              ?disabled=${this.disabled || this.loadingTypes}
            >
              ${this._hasCustomType
                ? this._('Switch to default type')
                : this._('Add custom type')}
            </wa-button>`}
      </p>`
  }

  #renderHeading() {
    return html`<h4 class="label">${this.heading || this._('Type')}</h4>`
  }

  #renderLoading() {
    return html`
      <md-filled-select
        style="width:100%"
        label="${this._('Loading items...')}"
        disabled
      ></md-filled-select>
    `
  }

  #renderInputs() {
    return html`
      ${!this._hasCustomType
        ? html`
            <md-filled-select
              style="width:100%"
              ?disabled="${this.disabled}"
              ?error="${this.#error}"
              error-text="${this._('This field is mandatory')}"
              @change="${this.#handleSelectChange}"
              @closing="${this.#handleSelectClosing}"
              label="${this.label}"
              .value="${this.value}"
              id="select-type"
            >
              <md-select-option value="">
                <div slot="headline"></div>
              </md-select-option>
              ${this.getTypes().map(
                (obj, i) => html`
                  <md-select-option value="${obj}">
                    <div slot="headline">${this._(obj)}</div>
                  </md-select-option>
                `
              )}
            </md-filled-select>
          `
        : html`
            <md-filled-text-field
              style="width:100%"
              ?disabled="${this.disabled}"
              ?error="${this.#error}"
              error-text="${this._('This field is mandatory')}"
              @input="${this.#handleTextFieldInput}"
              @blur="${this.#handleTextFieldBlur}"
              label="${this.label} ${this._('Custom')}"
              .value="${this.value}"
              id="custom-type"
            >
            </md-filled-text-field>
          `}
    `
  }

  #renderCustomSwitch() {
    return html`
      <md-text-button
        style="margin-top: 4px;"
        id="button-switch-type"
        @click="${this.#toggleCustomType}"
        ?disabled="${this.disabled || this.loadingTypes}"
      >
        ${this._hasCustomType
          ? this._('Switch to default type')
          : this._('Add custom type')}
      </md-text-button>
    `
  }

  getTypes(nonLocal = true) {
    const types = nonLocal ? this.types : this.typesLocale
    const defaultTypesAll = types?.default || {}
    const customTypesAll = types?.custom || {}
    const defaultTypes =
      this.typeName in defaultTypesAll ? defaultTypesAll[this.typeName] : []
    const customTypes =
      this.typeNameCustom || this.typeName in customTypesAll
        ? customTypesAll[this.typeNameCustom || this.typeName]
        : []
    const allTypes = defaultTypes.concat(customTypes)
    if (this.allowedTypes.length > 0) {
      return allTypes.filter(t => this.allowedTypes.includes(t))
    }
    return allTypes
  }

  #toggleCustomType() {
    this._hasCustomType = !this._hasCustomType
    if (this._hasCustomType) {
      this._touched = false
    }
    this.#setValue('')
  }

  #handleSelectChange(e) {
    this.#setValue(e.target.value)
  }

  #handleSelectClosing() {
    this._touched = true
  }

  #handleTextFieldInput(e) {
    this.#setValue(e.target.value)
  }

  #handleTextFieldBlur() {
    this._touched = true
  }

  #setValue(value) {
    this.value = value
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {data: value},
      })
    )
  }

  get #error() {
    return this._touched && !this.isValid()
  }
}

window.customElements.define(
  'grampsjs-form-select-type',
  GrampsjsFormSelectType
)
