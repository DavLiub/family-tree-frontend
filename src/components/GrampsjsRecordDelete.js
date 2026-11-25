import {LitElement, html, css} from 'lit'
import {mdiDeleteForever} from '@mdi/js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  endpointToObjectClass,
  objectTypeToEndpoint,
  fireEvent,
} from '../util.js'
import {awaitTaskResponse} from '../taskResponse.js'
import {getPersonNameDisplay} from './nameHistory.js'
import './GrampsjsIcon.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/text-button.js'
import '@material/web/dialog/dialog.js'

const endpoints = new Set(['events', 'notes', 'media', 'citations', 'families'])

// A failed or incomplete reference read must never enable global deletion.
export function recordUsage(record) {
  if (
    !record?.backlinks ||
    typeof record.backlinks !== 'object' ||
    Array.isArray(record.backlinks)
  ) {
    throw new Error('Unable to check record usage')
  }
  return Object.entries(record.backlinks)
    .flatMap(([type, handles]) => {
      if (!Array.isArray(handles))
        throw new Error('Unable to check record usage')
      return handles.map(handle => {
        if (typeof handle !== 'string' || !handle)
          throw new Error('Unable to check record usage')
        const details = record.extended?.backlinks?.[type]?.find(
          item => item?.handle === handle
        )
        const profile =
          details?.profile ||
          (details?.gramps_id
            ? record.profile?.references?.[type]?.find(
                item => item?.gramps_id === details.gramps_id
              )
            : null) ||
          {}
        const label =
          [profile.name_given, profile.name_surname]
            .filter(Boolean)
            .join(' ') ||
          (details?.primary_name ? getPersonNameDisplay(details).main : '') ||
          profile.summary ||
          details?.title ||
          details?.description ||
          details?.gramps_id ||
          handle
        return {type, handle, label}
      })
    })
    .sort((a, b) =>
      `${a.type}:${a.handle}`.localeCompare(`${b.type}:${b.handle}`)
    )
}

export class GrampsjsRecordDelete extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return css`
      :host {
        display: inline-flex;
      }
      md-dialog {
        max-inline-size: min(36rem, 90vw);
      }
      li {
        overflow-wrap: anywhere;
      }
    `
  }

  static get properties() {
    return {
      endpoint: {type: String},
      handle: {type: String},
      label: {type: String},
      _open: {state: true},
      _pending: {state: true},
      _error: {state: true},
      _usage: {state: true},
    }
  }

  constructor() {
    super()
    this.endpoint = ''
    this.handle = ''
    this.label = ''
    this._open = false
    this._pending = false
    this._error = ''
    this._usage = null
    this._identity = ''
  }

  get allowed() {
    return (
      this.appState.permissions?.canEdit &&
      this.appState.permissions?.canDelete === true &&
      endpoints.has(this.endpoint) &&
      Boolean(this.handle)
    )
  }

  render() {
    if (!this.allowed) return ''
    return html`<md-icon-button
        aria-label=${this._('Delete from tree')}
        title=${this._('Delete from tree')}
        @click=${e => {
          e.stopPropagation()
          this._prepare()
        }}
      >
        <grampsjs-icon
          path=${mdiDeleteForever}
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>
      ${this._open
        ? html`<md-dialog
            open
            @click=${e => e.stopPropagation()}
            @cancel=${e => {
              if (this._pending) e.preventDefault()
              else this._open = false
            }}
          >
            <span slot="headline"
              >${this._('Delete from tree')}: ${this.label}</span
            >
            <div slot="content">
              <p>
                ${this._(
                  'This record will be deleted everywhere it is used. Related records will remain.'
                )}
              </p>
              ${this._pending
                ? html`<p role="status">${this._('Loading...')}</p>`
                : ''}
              ${this._error
                ? html`<p role="alert">${this._(this._error)}</p>`
                : ''}
              ${this._usage !== null
                ? html`<p>
                      ${this._('Used by records')}: ${this._usage.length}
                    </p>
                    <ul>
                      ${this._usage.map(
                        item =>
                          html`<li>
                            ${this._(
                              endpointToObjectClass[
                                objectTypeToEndpoint[item.type] || item.type
                              ] || item.type
                            )}:
                            ${item.label}
                          </li>`
                      )}
                    </ul>`
                : ''}
            </div>
            <div slot="actions">
              <md-text-button
                ?disabled=${this._pending}
                @click=${() => {
                  this._open = false
                }}
                >${this._('Cancel')}</md-text-button
              >
              ${this._usage === null
                ? html`<md-text-button
                    ?disabled=${this._pending}
                    @click=${this._prepare}
                    >${this._('Retry')}</md-text-button
                  >`
                : html`<md-text-button
                    ?disabled=${this._pending}
                    @click=${this._confirm}
                    >${this._('Delete from tree')}</md-text-button
                  >`}
            </div>
          </md-dialog>`
        : ''}`
  }

  async _read() {
    if (this.appState.permissions?.canViewPrivate !== true)
      throw new Error(
        'Full record usage requires permission to view private records'
      )
    const result = await this.appState.apiGet(
      `/api/${this.endpoint}/${this.handle}?backlinks=true&profile=all&extend=all`
    )
    if (result?.error || result?.data?.handle !== this.handle)
      throw new Error(result?.error || 'Unable to check record usage')
    return recordUsage(result.data)
  }

  async _prepare() {
    if (!this.allowed || this._pending) return
    this._open = true
    this._pending = true
    this._error = ''
    this._usage = null
    this._identity = `${this.endpoint}/${this.handle}`
    try {
      this._usage = await this._read()
    } catch (error) {
      this._error = error.message
    } finally {
      this._pending = false
    }
  }

  async _confirm() {
    if (
      !this.allowed ||
      this._pending ||
      this._usage === null ||
      this._identity !== `${this.endpoint}/${this.handle}`
    )
      return
    this._pending = true
    this._error = ''
    try {
      const current = await this._read()
      const identity = items =>
        JSON.stringify(items.map(({type, handle}) => [type, handle]))
      if (identity(current) !== identity(this._usage)) {
        this._usage = current
        this._error = 'Record usage changed. Review the list and confirm again.'
        return
      }
      if (!this.allowed || this._identity !== `${this.endpoint}/${this.handle}`)
        return
      const response = await this.appState.apiDelete(
        `/api/${this.endpoint}/${this.handle}`,
        {dbChanged: false}
      )
      if (!response) throw new Error('Unable to delete record')
      const result = await awaitTaskResponse(this.appState, response, {
        prog: {setError() {}, setComplete() {}},
        label: `${this._('Delete from tree')}: ${this.label}`,
        taskName: 'delete-record',
      })
      if (result?.error || !result || !('data' in result))
        throw new Error(result?.error || 'Unable to delete record')
      this._open = false
      fireEvent(window, 'db:changed')
    } catch (error) {
      this._error = error.message
    } finally {
      this._pending = false
    }
  }
}

window.customElements.define('grampsjs-record-delete', GrampsjsRecordDelete)

export function renderRecordDelete(host, endpoint, record) {
  return html`<grampsjs-record-delete
    slot="end"
    .appState=${host.appState}
    endpoint=${endpoint}
    handle=${record?.handle || ''}
    label=${record?.gramps_id || record?.description || record?.desc || ''}
  ></grampsjs-record-delete>`
}
