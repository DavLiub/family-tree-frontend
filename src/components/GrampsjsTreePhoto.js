import {LitElement, css, html} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {getPersonNameDisplay} from './nameHistory.js'
import {loadPersonPhotos, setPrimaryPersonPhoto} from './personPhoto.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormNewMedia.js'
import './GrampsjsImg.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/outlined-button.js'

export class GrampsjsTreePhoto extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return css`
      md-dialog {
        max-inline-size: min(36rem, 92vw);
      }
      .photos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
      }
      .photo {
        cursor: pointer;
        color: inherit;
        background: transparent;
        border: 1px solid currentColor;
        border-radius: 8px;
        padding: 8px;
      }
      .photo grampsjs-img {
        inline-size: 96px;
        block-size: 96px;
        max-inline-size: 100%;
      }
      .label {
        display: block;
        overflow-wrap: anywhere;
      }
    `
  }

  static get properties() {
    return {
      personHandle: {type: String},
      _person: {state: true},
      _photos: {state: true},
      _pending: {state: true},
      _error: {state: true},
      _upload: {state: true},
    }
  }

  constructor() {
    super()
    this.personHandle = ''
    this._person = null
    this._photos = []
    this._pending = false
    this._error = ''
    this._upload = false
    this._uploaded = null
    this._request = 0
  }

  updated(changed) {
    if (changed.has('personHandle')) this._load()
  }

  async _load() {
    const request = ++this._request
    this._pending = true
    this._error = ''
    this._person = null
    this._photos = []
    this._uploaded = null
    this._upload = false
    try {
      const result = await loadPersonPhotos(this.appState, this.personHandle)
      if (request !== this._request) return
      this._person = result.person
      this._photos = result.photos
    } catch (error) {
      if (request === this._request) this._error = error.message
    } finally {
      if (request === this._request) this._pending = false
    }
  }

  render() {
    if (!this.appState.permissions?.canEdit) return ''
    if (this._upload)
      return html`<grampsjs-form-new-media
        awaitSave
        accept="image/*"
        .appState=${this.appState}
        dialogTitle=${this._('Upload person photo')}
        @object:save=${this._saveUpload}
        @object:saved=${e => {
          e.stopPropagation()
          fireEvent(this, 'object:saved')
        }}
        @object:cancel=${e => {
          e.stopPropagation()
          this._upload = false
        }}
      ></grampsjs-form-new-media>`
    return html`<md-dialog
      open
      @cancel=${e => {
        if (this._pending) e.preventDefault()
        else this._cancel()
      }}
    >
      <span slot="headline"
        >${this._('Person photo')}${this._person
          ? `: ${getPersonNameDisplay(this._person, text => this._(text)).main}`
          : ''}</span
      >
      <div slot="content">
        <p>
          ${this._('The selected photo becomes the main photo of this person.')}
        </p>
        ${this._pending
          ? html`<p role="status">${this._('Loading...')}</p>`
          : ''}
        ${this._error ? html`<p role="alert">${this._(this._error)}</p>` : ''}
        ${this.appState.permissions.canAdd && this._person
          ? html`<md-outlined-button
              ?disabled=${this._pending}
              @click=${() => {
                this._upload = true
              }}
              >${this._('Upload new photo')}</md-outlined-button
            >`
          : ''}
        ${this._person
          ? html`<h3>${this._('Choose from this person’s photos')}</h3>
              ${this._photos.length
                ? html`<div class="photos">
                    ${this._photos.map(
                      ({record, ref}) => html`<button
                        class="photo"
                        ?disabled=${this._pending}
                        @click=${() => this._select(record.handle)}
                        aria-label=${record.desc || record.gramps_id}
                      >
                        <grampsjs-img
                          square
                          cover
                          size="100"
                          handle=${record.handle}
                          mime=${record.mime}
                          .rect=${ref.rect || []}
                          .appState=${this.appState}
                        ></grampsjs-img
                        ><span class="label"
                          >${record.desc || record.gramps_id}</span
                        >
                      </button>`
                    )}
                  </div>`
                : html`<p>${this._('This person has no photos yet.')}</p>`}`
          : ''}
      </div>
      <div slot="actions">
        <md-text-button ?disabled=${this._pending} @click=${this._cancel}
          >${this._('Cancel')}</md-text-button
        >
        ${!this._person && this._error
          ? html`<md-text-button @click=${this._load}
              >${this._('Retry')}</md-text-button
            >`
          : ''}
      </div>
    </md-dialog>`
  }

  _cancel() {
    if (!this._pending) fireEvent(this, 'object:cancel')
  }

  async _select(handle) {
    if (
      this._pending ||
      !this._photos.some(({record}) => record.handle === handle)
    )
      return
    this._pending = true
    this._error = ''
    try {
      const result = await setPrimaryPersonPhoto(
        this.appState,
        this.personHandle,
        handle
      )
      if (!result || result.error)
        throw new Error(result?.error || 'Unable to save record')
      fireEvent(this, 'object:saved')
    } catch (error) {
      this._error = error.message
    } finally {
      this._pending = false
    }
  }

  async _saveUpload(event) {
    event.preventDefault()
    event.stopPropagation()
    let result
    try {
      if (
        !this.appState.permissions?.canEdit ||
        !this.appState.permissions?.canAdd
      )
        throw new Error('Editing is not allowed')
      const form = event.currentTarget
      const file = form.renderRoot.querySelector('grampsjs-form-upload')?.file
      if (!file?.type?.startsWith('image/'))
        throw new Error('Choose an image file')
      if (!this._uploaded || this._uploaded.file !== file) {
        const upload = await form.upload(event.detail.data)
        if (upload?.error || !upload?.data?.handle)
          throw new Error(upload?.error || 'Unable to upload photo')
        this._uploaded = {file, handle: upload.data.handle}
      }
      result = await setPrimaryPersonPhoto(
        this.appState,
        this.personHandle,
        this._uploaded.handle,
        {existing: false}
      )
      if (result?.error)
        throw new Error(
          'The photo was uploaded but could not be attached. Save again to retry.'
        )
    } catch (error) {
      result = {error: error.message}
    }
    event.detail.complete?.(result)
  }
}

window.customElements.define('grampsjs-tree-photo', GrampsjsTreePhoto)
