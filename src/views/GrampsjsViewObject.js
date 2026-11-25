/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import {css, html} from 'lit'

import {mdiPencil} from '@mdi/js'
import '@material/web/fab/fab.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'
import '../components/GrampsjsIcon.js'

import {GrampsjsView} from './GrampsjsView.js'

import {fireEvent, objectIconPath, objectTypeToEndpoint} from '../util.js'
import {clearDraftsWithPrefix} from '../api.js'
import {saveContextObject} from '../components/contextEdit.js'
import '../components/GrampsjsBreadcrumbs.js'

const BREADCRUMB_META = {
  person: {
    objectsName: 'People',
    objectIcon: objectIconPath.person,
    objectEndpoint: 'people',
  },
  family: {
    objectsName: 'Families',
    objectIcon: objectIconPath.family,
    objectEndpoint: 'families',
  },
  place: {
    objectsName: 'Places',
    objectIcon: objectIconPath.place,
    objectEndpoint: 'places',
  },
  event: {
    objectsName: 'Events',
    objectIcon: objectIconPath.event,
    objectEndpoint: 'events',
  },
  citation: {
    objectsName: 'Citations',
    objectIcon: objectIconPath.citation,
    objectEndpoint: 'citations',
  },
  source: {
    objectsName: 'Sources',
    objectIcon: objectIconPath.source,
    objectEndpoint: 'sources',
  },
  repository: {
    objectsName: 'Repositories',
    objectIcon: objectIconPath.repository,
    objectEndpoint: 'repositories',
  },
  media: {
    objectsName: 'Media Objects',
    objectIcon: objectIconPath.media,
    objectEndpoint: 'media',
  },
  note: {
    objectsName: 'Notes',
    objectIcon: objectIconPath.note,
    objectEndpoint: 'notes',
  },
}

const editTitle = {
  person: 'Edit Person',
  family: 'Edit Family',
  event: 'Edit Event',
  place: 'Edit Place',
  citation: 'Edit Citation',
  source: 'Edit Source',
  repository: 'Edit Repository',
  media: 'Edit Media Object',
  note: 'Edit Note',
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// move up the element with index i in the array
function moveUp(array, i) {
  if (i <= 0) {
    return array
  }
  return [
    ...array.slice(0, i - 1),
    array[i],
    array[i - 1],
    ...array.slice(i + 1),
  ]
}

// move down the element with index i in the array
function moveDown(array, i) {
  if (i >= array.length - 1) {
    return array
  }
  return [...array.slice(0, i), array[i + 1], array[i], ...array.slice(i + 2)]
}

export class GrampsjsViewObject extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }

        md-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      edit: {type: Boolean},
      editDialogContent: {type: String},
      _data: {type: Object},
      _className: {type: String},
      _saveButton: {type: Boolean},
      _saveStatus: {state: true},
      _deletePending: {state: true},
      _deleteError: {state: true},
      _confirmingDelete: {state: true},
    }
  }

  constructor() {
    super()
    this.edit = false
    this.editDialogContent = ''
    this._data = {}
    this._className = ''
    this._saveButton = false
    this._saveStatus = ''
    this._deletePending = false
    this._deleteError = ''
    this._confirmingDelete = false
    this._requestVersion = 0
    this._boundDisableEditMode = this._disableEditMode.bind(this)
    this._boundDeleteSelf = this._deleteSelf.bind(this)
    this._boundToggleEditMode = this._toggleEditMode.bind(this)
    // Reuse one function reference so disconnectedCallback can release it.
    this._boundHandleEditAction = this.handleEditAction.bind(this)
    this._boundContextSaved = () => this.handleContextSaved()
  }

  get canEdit() {
    return this.appState.permissions.canEdit
  }

  handleContextSaved() {
    if (this.active) {
      this._saveStatus = this._('Saved')
      this._updateData(false)
    }
  }

  getUrl() {
    return ''
  }

  renderBreadcrumbs() {
    const meta = BREADCRUMB_META[this._className]
    if (!meta) return html``
    return html`
      <grampsjs-breadcrumbs
        .data="${this._data}"
        .appState="${this.appState}"
        ?edit="${this.edit}"
        objectsName="${meta.objectsName}"
        .objectIcon="${meta.objectIcon}"
        objectEndpoint="${meta.objectEndpoint}"
      ></grampsjs-breadcrumbs>
    `
  }

  renderContent() {
    if (Object.keys(this._data).length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return html`
      ${this.renderBreadcrumbs()} ${this.renderElement()}
      ${this.canEdit && !this.edit && this._className !== 'person'
        ? this.renderFab()
        : ''}
      ${this.canEdit && this._className === 'person'
        ? this._renderPersonActions()
        : ''}
      ${this.editDialogContent}
      <span role="status" aria-live="polite">${this._saveStatus}</span>
    `
  }

  _renderPersonActions() {
    return html`
      <details>
        <summary>${this._('Other actions')}</summary>
        <md-text-button
          @click=${() => {
            this._deleteError = ''
            this._confirmingDelete = true
          }}
          >${this._('Delete person')}</md-text-button
        >
      </details>
      ${this._confirmingDelete
        ? html`<md-dialog
            open
            @cancel=${e => {
              e.preventDefault()
              if (!this._deletePending) this._confirmingDelete = false
            }}
          >
            <div slot="headline">${this._('Delete person')}</div>
            <div slot="content">
              ${this._('Delete this object?')} ${this._data.gramps_id}
              ${this._deleteError
                ? html`<p role="alert">${this._deleteError}</p>`
                : ''}
            </div>
            <div slot="actions">
              <md-text-button
                ?disabled=${this._deletePending}
                @click=${() => {
                  this._confirmingDelete = false
                }}
                >${this._('Cancel')}</md-text-button
              >
              <md-filled-button
                ?disabled=${this._deletePending}
                @click=${this._confirmPersonDelete}
                >${this._('_Delete')}</md-filled-button
              >
            </div>
          </md-dialog>`
        : ''}
    `
  }

  async _confirmPersonDelete() {
    if (!this.canEdit || !this.active || this._deletePending) return
    this._deletePending = true
    try {
      const result = await this._deleteSelf()
      if (result?.error) this._deleteError = this._(result.error)
      else this._confirmingDelete = false
    } catch (error) {
      this._deleteError = this._(error.message || 'Unable to delete person')
    } finally {
      this._deletePending = false
    }
  }

  renderFab() {
    return html`
      <md-fab variant="secondary" @click="${this._activateEditMode}">
        <grampsjs-icon
          slot="icon"
          .path="${mdiPencil}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  _activateEditMode() {
    if (this._className === 'person') return
    this.edit = true
    fireEvent(this, 'edit-mode:on', {
      title: this._(editTitle[this._className] || 'Edit'),
      saveButton: this._saveButton,
    })
  }

  _disableEditMode() {
    this.edit = false
  }

  _toggleEditMode() {
    if (!this.active || !this.canEdit) {
      return
    }
    if (this.edit) {
      fireEvent(this, 'edit-mode:close-request')
    } else {
      this._activateEditMode()
    }
  }

  renderElement() {
    return html``
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:off', this._boundDisableEditMode)
    window.addEventListener('edit-mode:delete', this._boundDeleteSelf)
    window.addEventListener('edit-mode:toggle', this._boundToggleEditMode)
    this.addEventListener('edit:action', this._boundHandleEditAction)
    this.addEventListener('context:saved', this._boundContextSaved)
  }

  disconnectedCallback() {
    this._invalidateRequest()
    this.removeEventListener('edit:action', this._boundHandleEditAction)
    this.removeEventListener('context:saved', this._boundContextSaved)
    window.removeEventListener('edit-mode:off', this._boundDisableEditMode)
    window.removeEventListener('edit-mode:delete', this._boundDeleteSelf)
    window.removeEventListener('edit-mode:toggle', this._boundToggleEditMode)
    super.disconnectedCallback()
  }

  shouldUpdate(changed) {
    if (changed.has('grampsId') || (changed.has('active') && !this.active)) {
      this._invalidateRequest()
    }
    return super.shouldUpdate(changed)
  }

  update(changed) {
    super.update(changed)
    if (changed.has('grampsId') || (changed.has('active') && !this.active)) {
      this._confirmingDelete = false
      this._deleteError = ''
    }
    const identityChanged = changed.has('grampsId')
    const needsActivation =
      changed.has('active') &&
      (Object.keys(this._data).length === 0 ||
        this._data.gramps_id !== this.grampsId)
    if (this.active && (identityChanged || needsActivation)) {
      this._updateData()
    } else if (
      changed.has('appState') &&
      changed.get('appState')?.i18n?.lang !== this.appState.i18n.lang
    ) {
      this._handleLangChange(this.appState.i18n.lang)
    }
  }

  _invalidateRequest() {
    this._requestVersion += 1
    this.loading = false
  }

  async _updateData(clearData = true) {
    this._invalidateRequest()
    if (this._url === '' || !this.grampsId) return
    if (clearData) this._clearData()
    const version = this._requestVersion
    const grampsId = this.grampsId
    const url = this.getUrl()
    const active = this.active
    this.loading = true
    this.error = false
    let data
    try {
      data = await this.appState.apiGet(url)
    } catch (error) {
      data = {error: error?.message || 'An error occurred'}
    }
    if (
      version !== this._requestVersion ||
      grampsId !== this.grampsId ||
      url !== this.getUrl() ||
      active !== this.active
    )
      return
    this.loading = false
    if ('data' in data) {
      ;[this._data] = data.data
      this.error = false
      if (this._className !== '') {
        this.dispatchEvent(
          new CustomEvent('object:loaded', {
            bubbles: true,
            composed: true,
            detail: {grampsId, className: this._className},
          })
        )
        this._handleObjectLoaded(this._data)
      }
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _handleLangChange(lang) {
    if (this.active && lang === this.appState.i18n.lang) {
      this._updateData(false)
    }
  }

  _clearData() {
    this._data = {}
  }

  _handleObjectLoaded() {}

  // resolves once this element and the components it renders have updated
  async _renderComplete() {
    await this.updateComplete
    await Promise.all(
      [...this.renderRoot.querySelectorAll('*')]
        .map(element => element.updateComplete)
        .filter(promise => promise !== undefined)
    )
  }

  async _deleteSelf() {
    const {handle} = this._data
    const grampsId = this._data.gramps_id
    const endpoint = objectTypeToEndpoint[this._className]
    if (this.active && this.canEdit && endpoint && handle) {
      const url = `/api/${endpoint}/${handle}`
      const data = await this.appState.apiDelete(url, {dbChanged: false})
      if ('data' in data) {
        this.grampsId = ''
        this._data = {}
        // wait for the view and the object component it renders to update
        // before the change is announced - otherwise components still showing
        // the deleted object fetch data for a handle that no longer exists
        await this._renderComplete()
        fireEvent(this, 'db:changed')
        fireEvent(this, 'nav', {path: ''})
        fireEvent(this, 'transaction:undo', {
          message: this._('Object %s deleted.', grampsId),
          transaction: data.data,
          redirect: `${this._className}/${grampsId}`,
        })
      } else if ('error' in data) {
        fireEvent(this, 'grampsjs:error', {message: data.error})
      }
      return data
    }
  }

  async handleEditAction(e) {
    // An embedded context editor owns its write and does not bubble this event.
    if (!this.canEdit) {
      e.detail.complete?.({error: 'Editing is not allowed'})
      return
    }
    try {
      this._saveStatus = ''
      const result = await this._performEditAction(e)
      e.detail.complete?.(result)
      return result
    } catch (error) {
      const result = {error: error.message || 'Unable to save record'}
      e.detail.complete?.(result)
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return result
    }
  }

  _performEditAction(e) {
    if (e.detail.action === 'makePrimaryName') {
      const index = e.detail.index
      return this._updateObject(this._data, 'person', obj => {
        if (
          !Number.isInteger(index) ||
          index < 1 ||
          index > obj.alternate_names.length
        ) {
          throw new Error('Record not found')
        }
        const names = [obj.primary_name, ...obj.alternate_names]
        obj.primary_name = names.splice(index, 1)[0]
        obj.alternate_names = names
        return obj
      })
    } else if (e.detail.action === 'makePrimaryMedia') {
      const index = e.detail.index
      return this._updateObject(this._data, this._className, obj => {
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= obj.media_list.length
        ) {
          throw new Error('Record not found')
        }
        obj.media_list = [...obj.media_list]
        const [photo] = obj.media_list.splice(index, 1)
        obj.media_list.unshift(photo)
        return obj
      })
    } else if (e.detail.action === 'delEvent') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'event_ref_list'
      )
    } else if (e.detail.action === 'addEventRef') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'event_ref_list'
      )
    } else if (e.detail.action === 'updateEventRef') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'event_ref_list'
      )
    } else if (e.detail.action === 'addPlaceRef') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'placeref_list'
      )
    } else if (e.detail.action === 'updatePlaceRef') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'placeref_list'
      )
    } else if (e.detail.action === 'addChildRef') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'child_ref_list'
      )
    } else if (e.detail.action === 'updateChildRef') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'child_ref_list'
      )
    } else if (e.detail.action === 'addNoteRef') {
      return this.addHandle(
        e.detail.data.data[0],
        this._data,
        this._className,
        'note_list'
      )
    } else if (e.detail.action === 'newCitation') {
      return this._postObject(e.detail.data, 'citation').then(data => {
        if ('data' in data) {
          this.addHandle(
            e.detail.data.handle,
            this._data,
            this._className,
            'citation_list'
          )
        }
      })
    } else if (e.detail.action === 'newNote') {
      return this._createLinkedObject(
        e.detail.data,
        'note',
        'note_list',
        handle => handle
      )
    } else if (e.detail.action === 'newParent') {
      const {processedData, parent} = e.detail.data
      const {handle} = processedData.filter(obj => obj._class === 'Person')[0]
      return this._postObject(processedData, 'object').then(data => {
        if ('data' in data) {
          const updatedFamily = {[`${parent}_handle`]: handle}
          this.updateProp(this._data, this._className, updatedFamily)
        }
      })
    } else if (e.detail.action === 'newChild') {
      const {processedData, frel, mrel} = e.detail.data
      const {handle} = processedData.filter(obj => obj._class === 'Person')[0]
      return this._postObject(processedData, 'object').then(data => {
        if ('data' in data) {
          const childRefData = {
            ref: handle,
            frel,
            mrel,
          }
          this.addObject(
            childRefData,
            this._data,
            this._className,
            'child_ref_list'
          )
        }
      })
    } else if (e.detail.action === 'newEvent') {
      const {role, ...eventData} = e.detail.data
      return this._createLinkedObject(
        eventData,
        'event',
        'event_ref_list',
        handle => ({
          _class: 'EventRef',
          ref: handle,
          role,
        })
      )
    } else if (e.detail.action === 'addCitation') {
      return this.addHandle(
        e.detail.data.data[0],
        this._data,
        this._className,
        'citation_list'
      )
    } else if (e.detail.action === 'addAttribute') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'attribute_list'
      )
    } else if (e.detail.action === 'addURL') {
      return this.addObject(e.detail.data, this._data, this._className, 'urls')
    } else if (e.detail.action === 'addAddress') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'address_list'
      )
    } else if (e.detail.action === 'addAssociation') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'person_ref_list'
      )
    } else if (e.detail.action === 'delRepository') {
      return this.delObjectByIndex(
        e.detail.handle,
        this._data,
        this._className,
        'reporef_list'
      )
    } else if (e.detail.action === 'addRepoRef') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'reporef_list'
      )
    } else if (e.detail.action === 'updateRepoRef') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'reporef_list'
      )
    } else if (e.detail.action === 'upRepository') {
      return this.moveObjectByIndex(
        e.detail.handle,
        this._data,
        this._className,
        'reporef_list',
        'up'
      )
    } else if (e.detail.action === 'downRepository') {
      return this.moveObjectByIndex(
        e.detail.handle,
        this._data,
        this._className,
        'reporef_list',
        'down'
      )
    } else if (e.detail.action === 'addMediaRef') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'media_list'
      )
    } else if (e.detail.action === 'updateMediaRef') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'media_list'
      )
    } else if (e.detail.action === 'updateAttribute') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'attribute_list'
      )
    } else if (e.detail.action === 'updateURL') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'urls'
      )
    } else if (e.detail.action === 'updateAddress') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'address_list'
      )
    } else if (e.detail.action === 'updateAssociation') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'person_ref_list'
      )
    } else if (e.detail.action === 'delNoteRef') {
      return this.delHandle(
        e.detail.handle,
        this._data,
        this._className,
        'note_list'
      )
    } else if (e.detail.action === 'delMediaRef') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'media_list'
      )
    } else if (e.detail.action === 'delPlace') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'placeref_list'
      )
    } else if (e.detail.action === 'delAttr') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'attribute_list'
      )
    } else if (e.detail.action === 'delURL') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'urls'
      )
    } else if (e.detail.action === 'delAddress') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'address_list'
      )
    } else if (e.detail.action === 'delAssociation') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'person_ref_list'
      )
    } else if (e.detail.action === 'upMediaRef') {
      return this.moveObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'media_list',
        'up'
      )
    } else if (e.detail.action === 'downMediaRef') {
      return this.moveObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'media_list',
        'down'
      )
    } else if (e.detail.action === 'upName') {
      return this.moveName(e.detail.handle, this._data, 'up')
    } else if (e.detail.action === 'downName') {
      return this.moveName(e.detail.handle, this._data, 'down')
    } else if (e.detail.action === 'delName') {
      return this.delName(e.detail.data, this._data)
    } else if (e.detail.action === 'addName') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'alternate_names'
      )
    } else if (e.detail.action === 'updateName') {
      return this.updateName(e.detail.data, this._data)
    } else if (e.detail.action === 'addPlaceName') {
      return this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'alt_names'
      )
    } else if (e.detail.action === 'updatePlaceName') {
      return this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'alt_names'
      )
    } else if (e.detail.action === 'delPlaceName') {
      return this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'alt_names'
      )
    } else if (e.detail.action === 'delChildRef') {
      return this.delObject(
        e.detail.handle,
        this._data,
        this._className,
        'child_ref_list'
      )
    } else if (e.detail.action === 'delCitation') {
      return this.delHandle(
        e.detail.handle,
        this._data,
        this._className,
        'citation_list'
      )
    } else if (e.detail.action === 'upEvent') {
      return this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'event_ref_list',
        'up'
      )
    } else if (e.detail.action === 'downEvent') {
      return this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'event_ref_list',
        'down'
      )
    } else if (e.detail.action === 'upPlace') {
      return this.moveObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'placeref_list',
        'up'
      )
    } else if (e.detail.action === 'downPlace') {
      return this.moveObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'placeref_list',
        'down'
      )
    } else if (e.detail.action === 'upChildRef') {
      return this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'child_ref_list',
        'up'
      )
    } else if (e.detail.action === 'downChildRef') {
      return this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'child_ref_list',
        'down'
      )
    } else if (e.detail.action === 'upCitation') {
      return this.moveHandle(
        e.detail.handle,
        this._data,
        this._className,
        'citation_list',
        'up'
      )
    } else if (e.detail.action === 'downCitation') {
      return this.moveHandle(
        e.detail.handle,
        this._data,
        this._className,
        'citation_list',
        'down'
      )
    } else if (e.detail.action === 'updateProp') {
      return this.updateProp(
        this._data,
        this._className,
        e.detail.data,
        e.detail.editorDraftPrefix
      )
    } else if (e.detail.action === 'addPersonToExistingFamily') {
      const {familyHandle, frel, mrel} = e.detail.data
      const personHandle = this._data.handle
      return this.appState
        .apiGet(`/api/families/${familyHandle}`)
        .then(result => {
          if ('data' in result) {
            const {extended, profile, backlinks, formatted, ...family} =
              result.data
            // Prevent adding the person as a child to a family where they are already a parent
            if (
              family.father_handle === personHandle ||
              family.mother_handle === personHandle
            ) {
              fireEvent(this, 'grampsjs:error', {
                message:
                  'Cannot add person as child of a family they are already a parent of.',
              })
              return
            }
            // Prevent duplicate child entries
            const alreadyChild = (family.child_ref_list || []).some(
              ref => ref.ref === personHandle
            )
            if (alreadyChild) {
              fireEvent(this, 'grampsjs:error', {
                message: 'Person is already a child in this family.',
              })
              return
            }
            const childRef = {
              _class: 'ChildRef',
              ref: personHandle,
              frel: frel || 'Birth',
              mrel: mrel || 'Birth',
            }
            const updatedFamily = {
              _class: 'Family',
              ...family,
              child_ref_list: [...(family.child_ref_list || []), childRef],
            }
            this.appState
              .apiPut(`/api/families/${familyHandle}`, updatedFamily)
              .then(resultPut => {
                if ('error' in resultPut) {
                  fireEvent(this, 'grampsjs:error', {message: resultPut.error})
                } else {
                  this._updateData(false)
                }
              })
          } else if ('error' in result) {
            fireEvent(this, 'grampsjs:error', {message: result.error})
          }
        })
    } else if (e.detail.action === 'newParentFamily') {
      const {
        father_handle: fatherHandle,
        mother_handle: motherHandle,
        type,
        frel,
        mrel,
      } = e.detail.data
      const personHandle = this._data.handle
      const childRef = {
        _class: 'ChildRef',
        ref: personHandle,
        frel: frel || 'Birth',
        mrel: mrel || 'Birth',
      }
      const familyData = {
        _class: 'Family',
        child_ref_list: [childRef],
        ...(fatherHandle ? {father_handle: fatherHandle} : {}),
        ...(motherHandle ? {mother_handle: motherHandle} : {}),
        ...(type ? {type} : {}),
      }
      return this.appState
        .apiPost('/api/families/', familyData)
        .then(result => {
          if ('error' in result) {
            fireEvent(this, 'grampsjs:error', {message: result.error})
          } else {
            this._updateData(false)
          }
        })
    } else if (e.detail.action === 'newPartnerFamily') {
      const {role, partner_handle: partnerHandle, type} = e.detail.data
      const personHandle = this._data.handle
      const otherRole = role === 'father' ? 'mother' : 'father'
      const familyData = {
        _class: 'Family',
        [`${role}_handle`]: personHandle,
        ...(partnerHandle ? {[`${otherRole}_handle`]: partnerHandle} : {}),
        ...(type ? {type} : {}),
      }
      return this.appState
        .apiPost('/api/families/', familyData)
        .then(result => {
          if ('error' in result) {
            fireEvent(this, 'grampsjs:error', {message: result.error})
          } else {
            this._updateData(false)
          }
        })
    } else {
      // eslint-disable-next-line no-alert
      alert(JSON.stringify(e.detail))
    }
  }

  delObject(handle, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].filter(oRef => oRef.ref !== handle)
      return _obj
    })
  }

  delObjectByIndex(index, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].filter((_el, ind) => ind !== index)
      return _obj
    })
  }

  delHandle(handle, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].filter(_handle => _handle !== handle)
      return _obj
    })
  }

  moveObject(handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, _obj => {
      const i = (_obj[prop].map(oref => oref.ref) || []).indexOf(handle)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  moveObjectByIndex(index, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, _obj => {
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], index)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], index)
      }
      return _obj
    })
  }

  // for this method, 'handle' is the integer index
  // since names don't have handles!
  moveName(handle, obj, upDown) {
    return this._updateObject(obj, 'person', _obj => {
      if (
        (handle === 0 && upDown === 'down') ||
        (handle === 1 && upDown === 'up')
      ) {
        const primaryName = _obj.primary_name
        ;[_obj.primary_name] = _obj.alternate_names
        _obj.alternate_names = [primaryName, ..._obj.alternate_names.slice(1)]
      } else if (handle >= 1) {
        if (upDown === 'up') {
          _obj.alternate_names = moveUp(_obj.alternate_names, handle - 1)
        } else if (upDown === 'down') {
          _obj.alternate_names = moveDown(_obj.alternate_names, handle - 1)
        }
      }
      return _obj
    })
  }

  // for this method, 'handle' is the integer index
  // since names don't have handles!
  delName(data, obj) {
    const {index} = data
    if (!Number.isInteger(index) || index <= 0) return undefined
    return this._updateObject(obj, 'person', _obj => {
      if (index === 1) {
        _obj.alternate_names = [..._obj.alternate_names.slice(1)]
      } else if (index > 1) {
        _obj.alternate_names = [
          ..._obj.alternate_names.slice(0, index - 1),
          ..._obj.alternate_names.slice(index),
        ]
      }
      return _obj
    })
  }

  updateName(data, obj) {
    return this._updateObject(obj, 'person', _obj => {
      if (data.index === 0) {
        _obj.primary_name = data.name
      } else if (data.index === 1) {
        _obj.alternate_names = [data.name, ..._obj.alternate_names.slice(1)]
      } else {
        _obj.alternate_names = [
          ..._obj.alternate_names.slice(0, data.index - 1),
          data.name,
          ..._obj.alternate_names.slice(data.index),
        ]
      }
      return _obj
    })
  }

  // add an object to a list of objects
  // e.g. an event reference to the event_ref_list
  addObject(data, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = [..._obj[prop], data]
      return _obj
    })
  }

  // update an object in a list of objects by list index
  updateObjectByIndex(index, data, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].map((el, i) => {
        if (i === index) {
          return {...el, ...data}
        }
        return el
      })
      return _obj
    })
  }

  // add a handle to a list of handle
  // e.g. an note handle to the note_list
  addHandle(handle, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = [..._obj[prop], handle]
      return _obj
    })
  }

  updateProp(obj, objType, objNew, editorDraftPrefix) {
    return this._updateObject(
      obj,
      objType,
      _obj => ({..._obj, ...objNew}),
      editorDraftPrefix
    )
  }

  moveHandle(handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, _obj => {
      const i = (_obj[prop] || []).indexOf(handle)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  async _createLinkedObject(record, objType, property, reference) {
    // A successful creation and a failed attachment are separate outcomes.
    // Keep the created identity so retry attaches it instead of creating again.
    this._createdContextRecords ??= new Map()
    const key = `${this._data.handle}:${objType}:${record.handle}`
    const draft = JSON.stringify(record)
    if (!this._createdContextRecords.has(key)) {
      const created = await this._postObject(record, objType)
      if (!created || created.error || !('data' in created)) {
        return created || {error: 'Unable to save record'}
      }
      this._createdContextRecords.set(key, draft)
    } else if (this._createdContextRecords.get(key) !== draft) {
      const updated = await saveContextObject(
        this.appState,
        objectTypeToEndpoint[objType],
        record.handle,
        record
      )
      if (
        !updated ||
        updated.error ||
        !('data' in updated || 'task' in updated)
      ) {
        return updated || {error: 'Unable to save record'}
      }
      this._createdContextRecords.set(key, draft)
    }
    const latest = await this.appState.apiGet(
      `/api/${objectTypeToEndpoint[this._className]}/${this._data.handle}`
    )
    if (!latest?.data || latest.error) {
      return {
        error:
          'The record was created but could not be attached. Save again to retry.',
      }
    }
    if (latest.data.handle !== this._data.handle)
      return {error: 'Record not found'}
    const attached = await this._updateObject(
      latest.data,
      this._className,
      owner => {
        const refs = owner[property] || []
        const attached = refs.some(ref =>
          typeof ref === 'string'
            ? ref === record.handle
            : ref.ref === record.handle
        )
        if (!attached) owner[property] = [...refs, reference(record.handle)]
        return owner
      }
    )
    if (attached.error) {
      return {
        error:
          'The record was created but could not be attached. Save again to retry.',
      }
    }
    return attached
  }

  async _postObject(obj, objType) {
    const url = `/api/${objectTypeToEndpoint[objType]}/`
    return this.appState.apiPost(url, obj)
  }

  async _updateObject(obj, objType, updateFunc, editorDraftPrefix) {
    // remove extended, profile, backlinks, formatted keys from object
    // eslint-disable-next-line prefer-const
    let {extended, profile, backlinks, formatted, ...objNew} = obj
    objNew = {_class: capitalize(objType), ...structuredClone(objNew)}
    const url = `/api/${objectTypeToEndpoint[objType]}/${obj.handle}`

    let result
    try {
      result = await this.appState.apiPut(url, updateFunc(objNew))
    } catch (error) {
      result = {error: error?.message || 'An error occurred'}
    }
    if (
      !result ||
      typeof result !== 'object' ||
      !('data' in result || 'task' in result) ||
      'error' in result
    ) {
      const failure = {...result, error: result?.error || 'An error occurred'}
      fireEvent(this, 'grampsjs:error', {message: failure.error})
      return failure
    }
    // A refresh failure must not turn a completed write into a retryable save.
    this._saveStatus = this._('Saved')
    try {
      if (editorDraftPrefix) {
        clearDraftsWithPrefix(editorDraftPrefix)
      }
      this._updateData(false)
    } catch (error) {
      fireEvent(this, 'grampsjs:error', {message: error.message})
    }
    return result
  }
}
