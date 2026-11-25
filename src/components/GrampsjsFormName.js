/*
element for editing a name
*/

import {html, css, LitElement} from 'lit'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@material/mwc-textfield'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/text-button.js'

import {mdiArrowDown, mdiArrowUp, mdiDelete, mdiPlus} from '@mdi/js'

import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {getNameParts, updateNameParts} from './nameHistory.js'
import './GrampsjsIcon.js'
import './GrampsjsFormString.js'
import './GrampsjsFormSurname.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsFormName extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      iconButtonColorStyles,
      css`
        mwc-textfield.fullwidth {
          width: 100%;
        }

        wa-button > grampsjs-icon {
          pointer-events: none;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }

        details {
          margin-top: 12px;
        }

        summary {
          cursor: pointer;
          padding: 8px 0;
        }

        .surname-actions {
          display: flex;
          justify-content: flex-end;
        }

        .hide {
          display: none;
        }

        md-icon-button {
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-50);
        }

        /* .edit sets color, which does not reach the slotted icon */
        md-icon-button.edit {
          --grampsjs-icon-button-color: var(--mdc-theme-secondary);
        }
      `,
    ]
  }

  static get properties() {
    return {
      webawesome: {type: Boolean},
      historyMode: {type: Boolean},
      _expandedFields: {state: true},
      data: {type: Object},
      showMore: {type: Boolean},
      loadingTypes: {type: Boolean},
      types: {type: Object},
      typesLocale: {type: Object},
      origintype: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.webawesome = false
    this.historyMode = false
    this._expandedFields = []
    this.data = {_class: 'Name'}
    this.showMore = false
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    this.origintype = false
  }

  _action(icon, label, handler, disabled = false, hidden = false, id = '') {
    const content = html`<grampsjs-icon
      path=${icon}
      color="currentColor"
      aria-hidden="true"
    ></grampsjs-icon>`
    const classes = {edit: label !== 'Add', hide: hidden}
    return this.webawesome
      ? html`<wa-button
          appearance="plain"
          size="small"
          class=${classMap(classes)}
          id=${id}
          ?disabled=${disabled}
          @click=${handler}
          >${content}<span class="sr-only">${this._(label)}</span></wa-button
        >`
      : html`<md-icon-button
          class=${classMap(classes)}
          id=${id}
          aria-label=${this._(label)}
          ?disabled=${disabled}
          @click=${handler}
          >${content}</md-icon-button
        >`
  }

  render() {
    const parts = this.historyMode ? getNameParts(this.data) : null
    const surnames = parts ? parts.surnames : this.data.surname_list
    const surnameList = surnames?.length ? surnames : [{}]
    const showField = (key, value) =>
      !this.historyMode || Boolean(value) || this._expandedFields.includes(key)
    return html`
      ${showField('given', this.data.first_name)
        ? this._renderNameField(
            'first_name',
            'Given name',
            this.data.first_name
          )
        : this._renderAddField('given', 'Add given name')}
      ${this.historyMode
        ? (parts.patronymicParts || []).length > 1
          ? html`<p>${this._('Patronymic')}: ${parts.patronymic}</p>`
          : showField('patronymic', parts.patronymic)
          ? this._renderNameField('patronymic', 'Patronymic', parts.patronymic)
          : this._renderAddField('patronymic', 'Add patronymic')
        : ''}
      ${showField(
        'surname',
        surnames?.some(item => item.surname)
      )
        ? surnameList.map(
            (obj, i) => html`
              <div class="surname-actions">
                ${surnameList.length > 1
                  ? this._action(mdiDelete, 'Delete', () =>
                      this._handleDeleteSurname(i)
                    )
                  : ''}
                ${this.showMore
                  ? html`
                      ${this._action(
                        mdiArrowUp,
                        'Move Up',
                        () => this._handleUpSurname(i),
                        i === 0
                      )}
                      ${this._action(
                        mdiArrowDown,
                        'Move Down',
                        () => this._handleDownSurname(i),
                        i === surnameList.length - 1
                      )}
                    `
                  : ''}
              </div>
              <grampsjs-form-surname
                ?webawesome=${this.webawesome}
                ?origintype=${this.origintype}
                ?showMore=${this.showMore}
                id=${`surnames${i}`}
                .idx=${i}
                @formdata:changed=${this._handleFormData}
                .appState=${this.appState}
                .data=${obj}
                .types=${this.types}
                ?loadingTypes=${this.loadingTypes}
                .typesLocale=${this.typesLocale}
              ></grampsjs-form-surname>
            `
          )
        : ''}
      <p>
        ${this.webawesome
          ? html`<wa-button
              appearance="plain"
              size="small"
              @click=${this._handleAddSurname}
            >
              <grampsjs-icon
                slot="start"
                path=${mdiPlus}
                color="currentColor"
              ></grampsjs-icon>
              ${this._('Add surname')}
            </wa-button>`
          : html`<md-text-button @click=${this._handleAddSurname}
              >${this._('Add surname')}</md-text-button
            >`}
      </p>
      <details ?open=${this.showMore} @toggle=${this._handleDetailsToggle}>
        <summary>${this._('More name details')}</summary>
        <slot name="name-details"></slot>
        ${this.historyMode && (parts.patronymicParts || []).length > 1
          ? html`
              <h4>${this._('Patronymic')}</h4>
              ${parts.patronymicParts.map(
                (part, index) => html`<grampsjs-form-surname
                  ?webawesome=${this.webawesome}
                  showMore
                  id=${`patronymics${index}`}
                  .idx=${index}
                  .data=${part}
                  .appState=${this.appState}
                  @formdata:changed=${this._handleFormData}
                ></grampsjs-form-surname>`
              )}
            `
          : ''}
        ${Object.entries({
          title: 'Title',
          suffix: 'Suffix',
          call: 'Call name',
          nick: 'Nick name',
          famnick: 'Family nick name',
        }).map(
          ([key, label]) => html`
            <p>
              <grampsjs-form-string
                ?webawesome=${this.webawesome}
                @formdata:changed=${this._handleFormData}
                fullwidth
                id=${key}
                value=${this.data[key] || ''}
                label=${this._(label)}
                .appState=${this.appState}
              ></grampsjs-form-string>
            </p>
          `
        )}
      </details>
    `
  }

  _renderNameField(id, label, value) {
    return html`<p>
      <grampsjs-form-string
        ?webawesome=${this.webawesome}
        @formdata:changed=${this._handleFormData}
        fullwidth
        id=${id}
        value=${value || ''}
        label=${this._(label)}
        .appState=${this.appState}
      ></grampsjs-form-string>
    </p>`
  }

  _renderAddField(key, label) {
    const expand = () => {
      this._expandedFields = [...this._expandedFields, key]
      this.updateComplete.then(async () => {
        const field = this.renderRoot.querySelector(
          key === 'given' ? '#first_name' : `#${key}`
        )
        await field?.updateComplete
        const control = field?.renderRoot.querySelector(
          'wa-input, mwc-textfield'
        )
        await control?.updateComplete
        if (control?.isConnected) control.focus()
      })
    }
    return this.webawesome
      ? html`<wa-button appearance="plain" size="small" @click=${expand}
          >${this._(label)}</wa-button
        >`
      : html`<md-text-button @click=${expand}>${this._(label)}</md-text-button>`
  }

  _handleDetailsToggle(e) {
    this.showMore = e.target.open
  }

  _handleShowMore() {
    this.showMore = true
  }

  reset() {
    this.shadowRoot
      .querySelectorAll('grampsjs-form-string')
      .forEach(element => element.reset())
    this.shadowRoot.querySelector('grampsjs-form-surname').reset()
    this.showMore = false
    this._expandedFields = []
    this.data = {_class: 'Name'}
  }

  handleChange() {
    fireEvent(this, 'formdata:changed', {data: this.data})
  }

  _handleAddSurname() {
    if (this.historyMode) {
      const parts = getNameParts(this.data)
      if (
        !parts.surnames.some(part => part.surname) &&
        !this._expandedFields.includes('surname')
      ) {
        this._expandedFields = [...this._expandedFields, 'surname']
        return
      }
      this._expandedFields = [...this._expandedFields, 'surname']
      this.data = updateNameParts(this.data, {
        surnames: [...parts.surnames, {}],
      })
      this.handleChange()
      return
    }
    this.data = {
      ...this.data,
      surname_list: [
        ...(this.data.surname_list?.length ? this.data.surname_list : [{}]),
        {},
      ],
    }
    this.handleChange()
  }

  _handleDeleteSurname(i) {
    if (this.historyMode) {
      this._updateHistorySurnames(
        getNameParts(this.data).surnames.filter((_, index) => index !== i)
      )
      return
    }
    this.data = {
      ...this.data,
      surname_list: this.data.surname_list.filter((_, index) => index !== i),
    }
    this.handleChange()
  }

  _handleUpSurname(i) {
    if (this.historyMode) {
      this._updateHistorySurnames(
        this.moveItem(getNameParts(this.data).surnames, i, i - 1)
      )
      return
    }
    this.data = {
      ...this.data,
      surname_list: [...this.moveItem(this.data.surname_list, i, i - 1)],
    }
    this.handleChange()
  }

  _handleDownSurname(i) {
    if (this.historyMode) {
      this._updateHistorySurnames(
        this.moveItem(getNameParts(this.data).surnames, i, i + 1)
      )
      return
    }
    this.data = {
      ...this.data,
      surname_list: [...this.moveItem(this.data.surname_list, i, i + 1)],
    }
    this.handleChange()
  }

  _updateHistorySurnames(surnames) {
    this.data = updateNameParts(this.data, {surnames})
    this.handleChange()
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (
      this.historyMode &&
      ['first_name', 'patronymic'].includes(originalTarget.id)
    ) {
      const key = originalTarget.id === 'first_name' ? 'given' : 'patronymic'
      this._expandedFields = [...new Set([...this._expandedFields, key])]
      this.data = updateNameParts(this.data, {[key]: e.detail.data})
      e.stopPropagation()
      this.handleChange()
      return
    }
    if (this.historyMode && originalTarget.id.startsWith('patronymics')) {
      const patronymicParts = [...getNameParts(this.data).patronymicParts]
      patronymicParts[e.detail.idx] = e.detail.data
      this.data = updateNameParts(this.data, {patronymicParts})
      e.stopPropagation()
      this.handleChange()
      return
    }
    if (this.historyMode && originalTarget.id.startsWith('surnames')) {
      const surnames = [...getNameParts(this.data).surnames]
      surnames[e.detail.idx] = e.detail.data
      this._expandedFields = [...new Set([...this._expandedFields, 'surname'])]
      this._updateHistorySurnames(surnames)
      e.stopPropagation()
      return
    }
    if (
      ['first_name', 'call', 'nick', 'famnick', 'title', 'suffix'].includes(
        originalTarget.id
      )
    ) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    } else if (originalTarget.id.startsWith('surnames')) {
      const i = e.detail.idx
      const surnameList = this.data.surname_list || []
      this.data = {
        ...this.data,
        surname_list: [
          ...surnameList.slice(0, i),
          e.detail.data,
          ...surnameList.slice(i + 1),
        ],
      }
    }
    e.stopPropagation()
    this.handleChange()
  }

  moveItem = (array, from, to) => {
    const result = [...array]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  }
}

window.customElements.define('grampsjs-form-name', GrampsjsFormName)
