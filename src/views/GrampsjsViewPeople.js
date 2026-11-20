/*
People list view
*/

import {html, css} from 'lit'

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, personFilter, filterCounts} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  propertiesFilter,
  tagFilter,
  yearsFilter,
} from '../filterDefinitions.js'

function _ageAtDeath(birthDate, deathDate) {
  if (!birthDate || !deathDate) return null
  const by = String(birthDate).match(/\b(\d{4})\b/)
  const dy = String(deathDate).match(/\b(\d{4})\b/)
  if (!by || !dy) return null
  const age = parseInt(dy[1], 10) - parseInt(by[1], 10)
  return age >= 0 ? age : null
}

export class GrampsjsViewPeople extends GrampsjsViewObjectsBase {
  static get styles() {
    return [
      super.styles,
      css`
        .list-state {
          clear: both;
          padding: 1.5rem 0;
          overflow-wrap: anywhere;
        }

        .list-error {
          color: var(--md-sys-color-error);
        }
      `,
    ]
  }

  constructor() {
    super()
    this._columns = [
      {
        name: 'Name',
        key: 'name',
        sortKey: 'surname',
        multiline: true,
        format: value => html`
          <strong class="cell-primary"
            >${value.label || this._('Name not recorded')}</strong
          >
          <small class="cell-secondary"
            >${this._('Gramps ID')}: ${value.grampsId}</small
          >
        `,
      },
      {
        name: 'Gramps ID',
        key: 'grampsId',
        sortKey: 'gramps_id',
        defaultVisible: false,
      },
      {
        name: 'Surname',
        key: 'surname',
        sortKey: 'surname',
        defaultVisible: false,
      },
      {name: 'Given name', key: 'given', defaultVisible: false},
      {
        name: 'Birth Date',
        key: 'birth',
        sortKey: 'birth',
        multiline: true,
        format: value => value || this._('Not recorded'),
      },
      {name: 'Birth Place', key: 'birthPlace', defaultVisible: false},
      {
        name: 'Death Date',
        key: 'death',
        sortKey: 'death',
        multiline: true,
        format: value => value || this._('Not recorded'),
      },
      {name: 'Death Place', key: 'deathPlace', defaultVisible: false},
      {name: 'Age at death', key: 'age', defaultVisible: false},
      {
        name: 'Last changed',
        key: 'change',
        sortKey: 'change',
        defaultVisible: false,
      },
    ]
    this._objectsName = 'people'
    this._requestId = 0
    this._listPosition = null
    this._positionUrl = ''
  }

  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return `/api/people/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&keys=gramps_id,profile,change,handle`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `person/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_person'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const birthDate = row?.profile?.birth?.date
    const deathDate = row?.profile?.death?.date
    return {
      grampsId: row.gramps_id,
      name: {
        label: [row?.profile?.name_given, row?.profile?.name_surname]
          .filter(Boolean)
          .join(' '),
        grampsId: row.gramps_id,
      },
      surname: row?.profile?.name_surname,
      given: row?.profile?.name_given,
      birth: birthDate,
      birthPlace: row?.profile?.birth?.place_name,
      death: deathDate,
      deathPlace: row?.profile?.death?.place_name,
      age: _ageAtDeath(birthDate, deathDate),
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
  }

  _renderTable() {
    if (this.loading) {
      return html`<p class="list-state" role="status" aria-live="polite">
        ${this._('Loading people...')}
      </p>`
    }
    if (this.error) {
      return html`<div class="list-state">
        <p role="alert" class="list-error">
          ${this._('Unable to load people')}${this._errorMessage
            ? `: ${this._(this._errorMessage)}`
            : ''}
        </p>
        <md-outlined-button @click=${this._fetchData}
          >${this._('Retry')}</md-outlined-button
        >
      </div>`
    }
    if (this._totalCount >= 0 && this._data.length === 0) {
      return html`<div class="list-state" role="status">
        <p>${this._('No people found')}</p>
        <p>${this._('Try changing or clearing the filters.')}</p>
      </div>`
    }
    return super._renderTable()
  }

  _renderPagination() {
    return this.loading || this.error || this._totalCount <= 0
      ? ''
      : super._renderPagination()
  }

  async _fetchData() {
    const url = this._fullUrl
    const requestId = ++this._requestId
    this._oldUrl = url
    this._selectedHandles = []
    this._selectionKey += 1
    this.loading = true
    this.error = false
    this._errorMessage = ''
    this._data = []
    this._rawData = []
    this._totalCount = -1
    try {
      const result = await this.appState.apiGet(url)
      if (requestId !== this._requestId) return
      if (result?.error) throw new Error(result.error)
      if (!Array.isArray(result?.data)) throw new Error('Unable to load people')
      this._rawData = result.data
      this._data = result.data.map(row => this._formatRow(row))
      const total = Number(result.total_count)
      const hasTotal =
        result.total_count != null && String(result.total_count).trim() !== ''
      this._totalCount =
        hasTotal && Number.isInteger(total) && total >= 0
          ? Math.max(total, result.data.length)
          : result.data.length
      this._pages = Math.ceil(this._totalCount / this._pageSize)
    } catch (error) {
      if (requestId !== this._requestId) return
      this.error = true
      this._errorMessage = error?.message || 'Unable to load people'
      this._pages = 0
    } finally {
      if (requestId === this._requestId) this.loading = false
    }
  }

  _scrollAncestors() {
    const ancestors = []
    let node = this
    while (node) {
      if (node instanceof HTMLElement) {
        const overflow = getComputedStyle(node).overflowY
        if (
          /(auto|scroll)/.test(overflow) &&
          node.scrollHeight > node.clientHeight
        ) {
          ancestors.push(node)
        }
      }
      node = node.assignedSlot || node.parentNode || node.host
    }
    const root = document.scrollingElement
    if (root && !ancestors.includes(root)) ancestors.push(root)
    return ancestors
  }

  _captureListPosition() {
    this._positionUrl = this._oldUrl
    this._listPosition = this._scrollAncestors().map(node => ({
      node,
      top: node.scrollTop,
      left: node.scrollLeft,
    }))
  }

  _restoreListPosition() {
    if (
      !this._listPosition ||
      this._positionUrl !== this._oldUrl ||
      this.loading ||
      this.error
    )
      return
    const position = this._listPosition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.active || position !== this._listPosition) return
        for (const {node, top, left} of position) {
          if (node.isConnected) {
            node.scrollTop = top
            node.scrollLeft = left
          }
        }
      })
    })
  }

  _resetListPosition() {
    this._listPosition = null
    this._positionUrl = ''
    for (const node of this._scrollAncestors()) node.scrollTop = 0
  }

  _handleTableRowClick(event) {
    this._captureListPosition()
    super._handleTableRowClick(event)
  }

  _handleFiltersChanged() {
    this._resetListPosition()
    super._handleFiltersChanged()
  }

  _handlePageChanged(event) {
    this._resetListPosition()
    super._handlePageChanged(event)
  }

  _handleTableSortChanged(event) {
    this._resetListPosition()
    super._handleTableSortChanged(event)
  }

  updated(changed) {
    super.updated(changed)
    if (this.active && (changed.has('active') || changed.has('loading')))
      this._restoreListPosition()
  }

  disconnectedCallback() {
    this._requestId += 1
    this._oldUrl = ''
    super.disconnectedCallback()
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'}),
      yearsFilter(_, {label: 'Death year', rule: 'HasDeath'}),
      propertiesFilter(_, personFilter),
      associationsFilter(_, filterCounts.people),
      tagFilter(_),
      privacyFilter(_, {
        rule: 'PeoplePrivate',
        publicRule: 'PeoplePublic',
      }),
    ]
  }
}

window.customElements.define('grampsjs-view-people', GrampsjsViewPeople)
