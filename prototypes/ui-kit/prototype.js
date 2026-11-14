import {LitElement, html} from 'lit'
import {keyed} from 'lit/directives/keyed.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/text-button.js'
import '@material/web/textfield/outlined-text-field.js'
import '@material/web/select/outlined-select.js'
import '@material/web/select/select-option.js'
import '@material/web/dialog/dialog.js'
import '@awesome.me/webawesome/dist/components/button/button.js'
import '@awesome.me/webawesome/dist/components/input/input.js'
import '@awesome.me/webawesome/dist/components/select/select.js'
import '@awesome.me/webawesome/dist/components/option/option.js'
import '@awesome.me/webawesome/dist/components/dialog/dialog.js'
import '@awesome.me/webawesome/dist/translations/ru.js'
import {copy} from './copy.js'

const makePerson = () => ({
  first: 'Alexandria',
  last: 'Example',
  type: 'birth',
  otherNames: [{first: 'Alex', last: 'Example'}],
  links: ['synthetic-parent'],
  notes: ['Synthetic hidden note'],
})

class NameExample extends LitElement {
  static properties = {
    library: {},
    language: {},
    failFirst: {type: Boolean},
    person: {state: true},
    draft: {state: true},
    pending: {state: true},
    error: {state: true},
    saved: {state: true},
  }

  constructor() {
    super()
    this.language = 'ru'
    this.person = makePerson()
    this.draft = {...this.person}
    this.pending = false
    this.error = ''
    this.saved = false
    this.attempt = 0
  }

  createRenderRoot() {
    return this
  }

  get text() {
    return copy[this.language]
  }

  get dialog() {
    return this.querySelector('md-dialog, wa-dialog')
  }

  async openEditor() {
    this.draft = {...this.person}
    this.error = ''
    this.attempt = 0
    await this.updateComplete
    this.dialog.open = true
  }

  cancel(event) {
    if (this.pending) {
      event?.preventDefault()
      return
    }
    this.dialog.open = false
  }

  updateField(event, field) {
    this.draft = {...this.draft, [field]: event.target.value}
  }

  async save() {
    if (this.pending) return
    const invalidField = ['first', 'last'].find(
      field => !this.draft[field].trim()
    )
    if (invalidField) {
      this.error = 'required'
      this.querySelector(`[name="${invalidField}"]`)?.focus()
      return
    }
    this.pending = true
    this.error = ''
    this.saved = false
    this.attempt += 1
    // In-memory simulation only. No backend, storage, or network request.
    await new Promise(resolve => {
      window.setTimeout(resolve, 1400)
    })
    this.pending = false
    if (this.failFirst && this.attempt === 1) {
      this.error = 'error'
      return
    }
    // Merge only visible fields; keep the hidden synthetic names and links.
    this.person = {
      ...this.person,
      first: this.draft.first.trim(),
      last: this.draft.last.trim(),
      type: this.draft.type,
    }
    this.saved = true
    this.dialog.open = false
  }

  keyboard(event) {
    if (event.key === 'Escape' && this.pending) {
      event.preventDefault()
      event.stopPropagation()
    }
    // Do not intercept Enter in the select: it must commit the selected option.
    if (
      event.key === 'Enter' &&
      event
        .composedPath()
        .some(node =>
          ['MD-OUTLINED-TEXT-FIELD', 'WA-INPUT'].includes(node.tagName)
        )
    ) {
      event.preventDefault()
      this.save()
    }
  }

  renderField(field) {
    const value = this.draft[field]
    return this.library === 'material'
      ? html`
          <md-outlined-text-field
            name=${field}
            label=${this.text[field]}
            .value=${value}
            ?autofocus=${field === 'first'}
            required
            maxlength="100"
            ?disabled=${this.pending}
            @input=${event => this.updateField(event, field)}
          ></md-outlined-text-field>
        `
      : html`
          <wa-input
            name=${field}
            label=${this.text[field]}
            .value=${value}
            ?autofocus=${field === 'first'}
            required
            maxlength="100"
            ?disabled=${this.pending}
            @input=${event => this.updateField(event, field)}
          ></wa-input>
        `
  }

  renderFields() {
    return html`<div class="fields" @keydown=${this.keyboard}>
      ${this.renderField('first')}${this.renderField('last')}
      ${keyed(
        this.language,
        this.library === 'material'
          ? html`
              <md-outlined-select
                label=${this.text.type}
                .value=${this.draft.type}
                ?disabled=${this.pending}
                @change=${event => this.updateField(event, 'type')}
              >
                <md-select-option value="birth"
                  ><div slot="headline">
                    ${this.text.birth}
                  </div></md-select-option
                >
                <md-select-option value="married"
                  ><div slot="headline">
                    ${this.text.married}
                  </div></md-select-option
                >
              </md-outlined-select>
            `
          : html`
              <wa-select
                label=${this.text.type}
                .value=${this.draft.type}
                ?disabled=${this.pending}
                @change=${event => this.updateField(event, 'type')}
              >
                <wa-option value="birth">${this.text.birth}</wa-option>
                <wa-option value="married">${this.text.married}</wa-option>
              </wa-select>
            `
      )}
      <p class="hint">${this.text.hint}</p>
      ${this.error
        ? html`<p class="error" role="alert">${this.text[this.error]}</p>`
        : ''}
      <p class="progress" role="status">
        ${this.pending ? this.text.pending : ''}
      </p>
    </div>`
  }

  renderActions() {
    return this.library === 'material'
      ? html`
          <md-text-button ?disabled=${this.pending} @click=${this.cancel}
            >${this.text.cancel}</md-text-button
          >
          <md-filled-button ?disabled=${this.pending} @click=${this.save}
            >${this.pending
              ? this.text.pending
              : this.text.save}</md-filled-button
          >
        `
      : html`
          <wa-button
            appearance="plain"
            ?disabled=${this.pending}
            @click=${this.cancel}
            >${this.text.cancel}</wa-button
          >
          <wa-button
            variant="brand"
            ?disabled=${this.pending}
            @click=${this.save}
            >${this.pending ? this.text.pending : this.text.save}</wa-button
          >
        `
  }

  render() {
    return html`<article class="card" data-variant=${this.library}>
      <p class="eyebrow">
        ${this.library === 'material' ? 'Material Web' : 'Web Awesome'}
      </p>
      <h2>${this.person.first} ${this.person.last}</h2>
      <p>${this.text[this.person.type]}</p>
      ${this.library === 'material'
        ? html`<md-filled-button @click=${this.openEditor}
            >${this.text.edit}</md-filled-button
          >`
        : html`<wa-button variant="brand" @click=${this.openEditor}
            >${this.text.edit}</wa-button
          >`}
      <p class="result" role="status">
        ${this.saved ? this.text.saved : this.text.ready}
      </p>
      ${this.library === 'material'
        ? html`
            <md-dialog @cancel=${this.cancel} @keydown=${this.keyboard}>
              <div slot="headline">${this.text.title}</div>
              <div slot="content">${this.renderFields()}</div>
              <div slot="actions">${this.renderActions()}</div>
            </md-dialog>
          `
        : html`
            <wa-dialog
              label=${this.text.title}
              @wa-hide=${event => {
                if (event.target === this.dialog && this.pending)
                  event.preventDefault()
              }}
              @keydown=${this.keyboard}
            >
              ${this.renderFields()}
              <div slot="footer" class="actions">${this.renderActions()}</div>
            </wa-dialog>
          `}
    </article>`
  }
}
customElements.define('name-example', NameExample)

class UiComparison extends LitElement {
  static properties = {
    language: {state: true},
    dark: {state: true},
    failFirst: {state: true},
  }

  constructor() {
    super()
    this.language = 'ru'
    this.dark = false
    this.failFirst = true
  }

  createRenderRoot() {
    return this
  }

  updated() {
    document.documentElement.lang = this.language
    document.documentElement.className = this.dark ? 'wa-dark' : 'wa-light'
    document.documentElement.style.colorScheme = this.dark ? 'dark' : 'light'
  }

  render() {
    const text = copy[this.language]
    return html`<main>
      <header>
        <p class="eyebrow">Family Tree · UI lab</p>
        <h1>${text.title}</h1>
        <p>${text.intro}</p>
        <p class="notice">${text.notice}</p>
      </header>
      <section
        class="settings"
        aria-label=${this.language === 'ru'
          ? 'Настройки сравнения'
          : 'Comparison settings'}
      >
        <label
          >${text.language}<select
            .value=${this.language}
            @change=${event => {
              this.language = event.target.value
            }}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select></label
        >
        <label
          >${text.theme}<select
            .value=${this.dark ? 'dark' : 'light'}
            @change=${event => {
              this.dark = event.target.value === 'dark'
            }}
          >
            <option value="light">${text.light}</option>
            <option value="dark">${text.dark}</option>
          </select></label
        >
        <label
          >${text.mode}<select
            .value=${this.failFirst ? 'fail' : 'success'}
            @change=${event => {
              this.failFirst = event.target.value === 'fail'
            }}
          >
            <option value="fail">${text.fail}</option>
            <option value="success">${text.success}</option>
          </select></label
        >
      </section>
      <section
        class="comparison"
        aria-label=${this.language === 'ru'
          ? 'Варианты формы'
          : 'Form variants'}
      >
        ${['material', 'awesome'].map(
          library =>
            html`<name-example
              .library=${library}
              .language=${this.language}
              .failFirst=${this.failFirst}
            ></name-example>`
        )}
      </section>
    </main>`
  }
}
customElements.define('ui-comparison', UiComparison)
