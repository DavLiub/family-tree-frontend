import {LitElement, css, html} from 'lit'
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiDelete,
  mdiPencil,
  mdiStarOutline,
} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsImg.js'
import './GrampsjsIcon.js'
import '../views/GrampsjsViewMediaLightbox.js'
import './GrampsjsFormMediaRef.js'
import './GrampsjsFormContextObject.js'
import './GrampsjsFormNewMedia.js'
import '@material/web/iconbutton/icon-button.js'
import {fireEvent} from '../util.js'
import {renderSectionCreateActions} from './sectionActions.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsGallery extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .gallery {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(max(100px, 15%), 1fr)
          );
          gap: 4px;
          margin-top: 8px;
        }

        .tile {
          cursor: pointer;
          border-radius: 6px;
          overflow: hidden;
          aspect-ratio: 1;
          position: relative;
        }

        .tile grampsjs-img {
          position: absolute;
          inset: 0;
        }

        .tile-overlay {
          position: absolute;
          bottom: 4px;
          right: 4px;
          display: flex;
          gap: 2px;
          max-width: calc(100% - 8px);
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tile-overlay md-icon-button {
          --md-icon-button-container-width: 32px;
          --md-icon-button-container-height: 32px;
          --md-icon-button-icon-size: 18px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
        }

        .edit-actions {
          margin-top: 8px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      mediaRef: {type: Array},
      media: {type: Array},
      dialogContent: {type: String},
      edit: {type: Boolean},
      editRect: {type: Boolean},
      _lightboxSelected: {type: Number},
    }
  }

  constructor() {
    super()
    this.mediaRef = []
    this.media = []
    this.edit = false
    this.editRect = false
    this.dialogContent = ''
    this._lightboxSelected = 0
  }

  render() {
    return html`
      <div class="gallery">
        ${this.media.map((mediaObj, i) => this._renderThumbnail(i))}
      </div>

      ${renderSectionCreateActions(this, {
        add: true,
        attach: true,
        newObject: true,
        addLabel: 'Add photo or document',
        onAdd: () => this._handleAddClick(),
        onAttach: () => this._handleShareClick(),
      })}

      <grampsjs-view-media-lightbox
        active
        ?editRect="${this.editRect}"
        id="gallery-lightbox-view"
        @lightbox:left="${this._handleLeft}"
        @lightbox:right="${this._handleRight}"
        @rect:clicked="${this._handleRectClick}"
        handle="${this.media[this._lightboxSelected]?.handle}"
        .index="${this._lightboxSelected}"
        ?hideLeftArrow="${this._lightboxSelected === 0}"
        ?hideRightArrow="${this._lightboxSelected === this.media.length - 1}"
        .appState="${this.appState}"
      ></grampsjs-view-media-lightbox>

      ${this.dialogContent}
    `
  }

  _renderThumbnail(i) {
    const {handle, mime, checksum} = this.media[i]
    const {rect} = this.mediaRef[i]
    return html`
      <div class="tile">
        <grampsjs-img
          square
          cover
          handle="${handle}"
          size="300"
          .rect="${rect || []}"
          mime="${mime}"
          checksum="${checksum}"
          @click="${() => this._handleClick(i)}"
        ></grampsjs-img>
        ${this.edit || this.appState.permissions?.canEdit
          ? html`
              <div class="tile-overlay">
                ${this._renderContextActions(i)}
                ${this.edit && i > 0
                  ? html`
                      <md-icon-button
                        @click="${e => {
                          e.stopPropagation()
                          this._handleMediaRefLeft(i)
                        }}"
                      >
                        <grampsjs-icon
                          path="${mdiArrowLeft}"
                          color="var(--mdc-theme-secondary)"
                        ></grampsjs-icon>
                      </md-icon-button>
                    `
                  : ''}
                ${this.edit && i < this.media.length - 1
                  ? html`
                      <md-icon-button
                        @click="${e => {
                          e.stopPropagation()
                          this._handleMediaRefRight(i)
                        }}"
                      >
                        <grampsjs-icon
                          path="${mdiArrowRight}"
                          color="var(--mdc-theme-secondary)"
                        ></grampsjs-icon>
                      </md-icon-button>
                    `
                  : ''}
                ${this.edit
                  ? html`<md-icon-button
                      aria-label="${this._('Remove from card')}"
                      @click="${e => {
                        e.stopPropagation()
                        this._handleMediaRefDel(i)
                      }}"
                    >
                      <grampsjs-icon
                        path="${mdiDelete}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>`
                  : ''}
              </div>
            `
          : ''}
      </div>
    `
  }

  _renderContextActions(index) {
    if (!this.appState.permissions?.canEdit) return ''
    return html`
      <md-icon-button
        aria-label="${this._('Edit media details')}"
        title="${this._('Edit media details')}"
        @click="${e => {
          e.stopPropagation()
          this._handleContextEdit(index)
        }}"
        ><grampsjs-icon path="${mdiPencil}"></grampsjs-icon
      ></md-icon-button>
      ${index > 0
        ? html`<md-icon-button
            aria-label="${this._('Make primary photo')}"
            title="${this._('Make primary photo')}"
            @click="${e => {
              e.stopPropagation()
              fireEvent(this, 'edit:action', {
                action: 'makePrimaryMedia',
                index,
              })
            }}"
            ><grampsjs-icon path="${mdiStarOutline}"></grampsjs-icon
          ></md-icon-button>`
        : ''}
    `
  }

  _handleContextEdit(index) {
    const obj = this.media[index]
    if (!obj?.handle) return
    this.dialogContent = html`<grampsjs-form-context-object
      endpoint="media"
      handle="${obj.handle}"
      dialogTitle="${this._('Edit media details')}"
      .data="${structuredClone(obj)}"
      .appState="${this.appState}"
      @object:saved="${this._handleMediaRefCancel}"
      @object:cancel="${this._handleMediaRefCancel}"
    ></grampsjs-form-context-object>`
  }

  _handleRectClick(event) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {path: event.detail.target},
      })
    )
  }

  _handleClick(i) {
    const lightBoxView = this.shadowRoot.getElementById('gallery-lightbox-view')
    if (lightBoxView) {
      this._lightboxSelected = i
      lightBoxView.open()
    }
  }

  _handleLeft(event) {
    if (event.detail?.id === 'gallery-lightbox') {
      if (this._lightboxSelected > 0) {
        this._lightboxSelected -= 1
      }
    }
  }

  _handleRight(event) {
    if (event.detail?.id === 'gallery-lightbox') {
      if (this._lightboxSelected < this.media.length - 1) {
        this._lightboxSelected += 1
      }
    }
  }

  _handleMediaRefDel(index) {
    fireEvent(this, 'edit:action', {action: 'delMediaRef', index})
  }

  _handleMediaRefLeft(index) {
    fireEvent(this, 'edit:action', {action: 'upMediaRef', index})
  }

  _handleMediaRefRight(index) {
    fireEvent(this, 'edit:action', {action: 'downMediaRef', index})
  }

  _handleAddClick() {
    this.dialogContent = html`
      <grampsjs-form-new-media
        @object:save="${this._handleNewMediaSave}"
        @object:cancel="${this._handleMediaRefCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new media object')}"
      ></grampsjs-form-new-media>
    `
  }

  _handleShareClick() {
    this.dialogContent = html`
      <grampsjs-form-mediaref
        new
        @object:save="${this._handleMediaRefSave}"
        @object:cancel="${this._handleMediaRefCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Select an existing media object')}
      ></grampsjs-form-mediaref>
    `
  }

  _handleNewMediaSave(e) {
    e.preventDefault()
    e.stopPropagation()
    const uploadForm = this.renderRoot.querySelector('grampsjs-form-new-media')
    uploadForm.upload(e.detail.data).then(data => {
      if ('data' in data) {
        fireEvent(this, 'edit:action', {
          action: 'addMediaRef',
          data: {ref: data.data.handle},
        })
      }
    })
    this.dialogContent = ''
  }

  _handleMediaRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addMediaRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleMediaRefCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-gallery', GrampsjsGallery)
