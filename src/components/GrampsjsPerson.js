import {html, css} from 'lit'
import '@material/web/button/outlined-button'
import '@material/web/iconbutton/outlined-icon-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/filter-chip'
import {
  mdiFamilyTree,
  mdiDna,
  mdiSearchWeb,
  mdiTimelineOutline,
  mdiMap,
  mdiPencil,
} from '@mdi/js'
import {GrampsjsObject} from './GrampsjsObject.js'
import {getSymbols} from '../symbols.js'
import {getPersonNameDisplay} from './nameHistory.js'
import {getSummaryEvent} from './personEventEdit.js'
import {renderContextEventEditor} from './GrampsjsFormContextEvent.js'
import './GrampsjsImg.js'
import './GrampsjsEditGender.js'
import './GrampsjsPersonRelationship.js'
import './GrampsjsFormExternalSearch.js'
import {fireEvent, objectIconPath} from '../util.js'

export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        span.event {
          display: inline-block;
          color: var(--md-sys-color-on-surface);
        }

        .events-chips {
          margin-bottom: 16px;
        }

        .events-chips md-filter-chip {
          --md-sys-color-secondary-container: var(
            --md-sys-color-surface-variant
          );
          --md-sys-color-on-secondary-container: var(
            --md-sys-color-on-surface-variant
          );
        }

        .profile-navigation {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }

        .profile-navigation md-outlined-button {
          --md-outlined-button-container-height: 40px;
          --md-outlined-button-label-text-size: 14px;
        }

        p.button-list.labeled {
          display: none;
        }

        p.button-list.icon-only md-outlined-icon-button {
          --md-outlined-icon-button-container-width: 48px;
          --md-outlined-icon-button-container-height: 48px;
        }

        @container (min-width: 600px) {
          p.button-list.labeled {
            display: flex;
          }

          p.button-list.icon-only {
            display: none;
          }
        }

        @container (min-width: 1200px) {
          .profile-navigation .profile-toc {
            display: none;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
      timelineData: {type: Array},
      _showFamilyEvents: {type: Boolean},
      _showRelatedEvents: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this._objectsName = 'People'
    this._objectEndpoint = 'people'
    this._objectIcon = objectIconPath.person
    this._showReferences = false
    this.timelineData = []
    this._showFamilyEvents = false
    this._showRelatedEvents = false
  }

  renderProfile() {
    return html`
      <h2>
        <grampsjs-edit-gender
          .appState=${this.appState}
          ?edit="${this.edit}"
          gender="${this.data.gender}"
        ></grampsjs-edit-gender>
        ${this._displayName()}
        ${this.edit && this.appState.permissions?.canEdit && !this.preview
          ? html`
              <md-outlined-button
                hidden
                style="display: none"
                @click=${() => fireEvent(this, 'person:edit-card')}
              >
                ${this._('Edit card')}
              </md-outlined-button>
            `
          : ''}
      </h2>
      ${this._renderBirth()} ${this._renderDeath()} ${this._renderRelation()}
      ${this.preview ? '' : this._renderProfileNavigation()}
      ${this.preview ? '' : this._renderButtons()}
    `
  }

  _renderProfileNavigation() {
    const visibleSections = new Set(this._getTabs(this.edit))
    if (visibleSections.size <= 1) return ''

    const shortcuts = [
      {key: 'relationships', label: 'Relationships'},
      {key: 'names', label: '_Names'},
      {key: 'gallery', label: 'Gallery'},
      {key: 'sources', label: 'Sources'},
      {key: 'sourceCitations', label: '_Source Citations'},
    ].filter(section => visibleSections.has(section.key))

    return html`
      <nav class="profile-navigation" aria-label=${this._('Table Of Contents')}>
        ${shortcuts.map(
          ({key, label}) => html`
            <md-outlined-button
              @click=${() =>
                this._handleTocItemClick({detail: {sectionKey: key}})}
            >
              ${this._(label)}
            </md-outlined-button>
          `
        )}
        <md-outlined-button class="profile-toc" @click=${this._openTocDialog}>
          ${this._('Table Of Contents')}
        </md-outlined-button>
      </nav>
    `
  }

  _displayName() {
    const {main, birth} = getPersonNameDisplay(this.data, value =>
      this._(value)
    )
    const call = this.data.primary_name?.call
    const index = call
      ? (this.data.primary_name?.first_name || '').indexOf(call)
      : -1
    const heading =
      index >= 0
        ? html`${main.slice(0, index)}<span class="given-name">${call}</span
            >${main.slice(index + call.length)}`
        : main || this._('Name not recorded')
    return html`${heading}${birth ? html` (${birth})` : ''}`
  }

  _renderBirth() {
    const obj = this.data?.profile?.birth
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    const {birthSymbol} = getSymbols(this.appState.settings, s => this._(s))
    return html`
      <span class="event">
        <i>${birthSymbol}</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
        ${this._renderSummaryEventEdit('birth')}
      </span>
    `
  }

  _renderDeath() {
    const obj = this.data?.profile?.death
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    const {deathSymbol} = getSymbols(this.appState.settings, s => this._(s))
    return html`
      <span class="event">
        <i>${deathSymbol}</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
        ${this._renderSummaryEventEdit('death')}
      </span>
    `
  }

  _renderSummaryEventEdit(kind) {
    const event = getSummaryEvent(this.data, kind)
    if (!event || !this.appState.permissions?.canEdit || this.preview) return ''
    const label = this._(
      kind === 'birth' ? 'Edit birth details' : 'Edit death details'
    )
    return html`<md-icon-button
      aria-label=${label}
      title=${label}
      @click=${() => this._editSummaryEvent(event)}
    >
      <grampsjs-icon
        path=${mdiPencil}
        color="var(--mdc-theme-secondary)"
      ></grampsjs-icon>
    </md-icon-button>`
  }

  _editSummaryEvent(event) {
    if (!this.appState.permissions?.canEdit) return
    this.dialogContent = renderContextEventEditor(
      this.appState,
      event,
      this._('Edit event'),
      () => {
        this.dialogContent = ''
      }
    )
  }

  _renderRelation() {
    if (!this.homePersonDetails.handle) {
      // no home person set
      return ''
    }
    return html`
      <dl>
        <dt>${this._('Relationship to home person')}</dt>
        <dd>
          <grampsjs-person-relationship
            person1="${this.homePersonDetails.handle}"
            person2="${this.data.handle}"
            .appState="${this.appState}"
          ></grampsjs-person-relationship>
        </dd>
      </dl>
    `
  }

  _getButtons() {
    const hasDna = this.data?.person_ref_list?.some(ref => ref.rel === 'DNA')
    return [
      {
        label: 'Show in tree',
        path: mdiFamilyTree,
        handler: this._handleTreeButtonClick,
      },
      {
        label: 'Show on timeline',
        path: mdiTimelineOutline,
        handler: this._handleTimelineButtonClick,
      },
      {label: 'Open in map', path: mdiMap, handler: this._handleMapButtonClick},
      ...(hasDna
        ? [
            {
              label: 'DNA matches',
              path: mdiDna,
              handler: this._handleDnaButtonClick,
            },
          ]
        : []),
      {
        label: 'External Search',
        path: mdiSearchWeb,
        handler: this._handleExternalSearchClick,
      },
    ]
  }

  _renderButtons() {
    const buttons = this._getButtons()
    return html`
      <p class="button-list labeled">
        ${buttons.map(
          btn => html`
            <md-outlined-button @click="${btn.handler}">
              ${this._(btn.label)}
              <grampsjs-icon
                path="${btn.path}"
                color="var(--mdc-theme-primary)"
                slot="icon"
              ></grampsjs-icon>
            </md-outlined-button>
          `
        )}
      </p>
      <p class="button-list icon-only">
        ${buttons.map(
          btn => html`
            <md-outlined-icon-button
              @click="${btn.handler}"
              aria-label="${this._(btn.label)}"
              title="${this._(btn.label)}"
            >
              <grampsjs-icon
                path="${btn.path}"
                color="var(--mdc-theme-primary)"
              ></grampsjs-icon>
            </md-outlined-icon-button>
          `
        )}
      </p>
    `
  }

  _handleTreeButtonClick() {
    this.dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        bubbles: true,
        composed: true,
        detail: {grampsId: this.data.gramps_id},
      })
    )
    fireEvent(this, 'nav', {path: 'tree'})
  }

  _handleTimelineButtonClick() {
    window.dispatchEvent(
      new CustomEvent('timeline:person-selected', {
        detail: {object: this.data},
      })
    )
    fireEvent(this, 'nav', {path: 'timeline'})
  }

  _handleMapButtonClick() {
    window.dispatchEvent(
      new CustomEvent('map:person-selected', {
        detail: {person: this.data},
      })
    )
    fireEvent(this, 'nav', {path: 'map'})
  }

  _handleExternalSearchClick() {
    // Helper to extract year from date string (format: "YYYY-MM-DD" or "YYYY")
    const extractYear = dateStr => {
      if (!dateStr) return ''
      const match = dateStr.match(/^\d{4}/)
      return match ? match[0] : ''
    }
    const data = {
      name_given: this.data?.profile?.name_given,
      name_surname: this.data?.profile?.name_surname,
      name_middle: this.data?.profile?.name_given?.split(' ')[1] || '',
      place_name:
        this.data?.profile?.birth?.place_name ||
        this.data?.profile?.birth?.place ||
        this.data?.profile?.death?.place_name ||
        this.data?.profile?.death?.place ||
        '',
      birth_year: extractYear(this.data?.profile?.birth?.date),
      death_year: extractYear(this.data?.profile?.death?.date),
    }
    this.dialogContent = html`
      <div>
        <grampsjs-form-external-search
          @object:cancel=${this._handleCancelDialog}
          .appState="${this.appState}"
          .data=${data}
          .dialogTitle=${this._('External Search')}
          .hideSaveButton=${true}
        >
        </grampsjs-form-external-search>
      </div>
    `
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleDnaButtonClick() {
    fireEvent(this, 'nav', {path: `dna-matches/${this.data.gramps_id}`})
  }

  _handleFamilyEventsToggle(e) {
    this._showFamilyEvents = e.target.selected
    if (this._showFamilyEvents || this._showRelatedEvents) {
      fireEvent(this, 'person:timeline-needed')
    }
  }

  _handleRelatedEventsToggle(e) {
    this._showRelatedEvents = e.target.selected
    if (this._showFamilyEvents || this._showRelatedEvents) {
      fireEvent(this, 'person:timeline-needed')
    }
  }

  // Build a single combined ordered list from the timeline. Personal events
  // are always included; family/related are gated by their toggle. The
  // timeline API returns events in chronological order, so we preserve that
  // ordering.
  _getCombinedTimelineEvents() {
    const personalHandles = new Set(
      (this.data?.extended?.events || []).map(e => e.handle)
    )
    const familyEventHandles = new Set(
      (this.data?.extended?.families || [])
        .flatMap(f => f.event_ref_list || [])
        .map(er => er.ref)
    )

    // The timeline API returns events in chronological order. Use each
    // event's position in that array as a sort key so we can interleave
    // personal and family/related events correctly.
    const timelineOrder = new Map(
      this.timelineData.map((te, i) => [te.handle, i])
    )
    const timelineAge = new Map(
      this.timelineData.map(te => [te.handle, te.age || ''])
    )

    const entries = []

    // Personal events: always from main data (timeline may omit undated ones).
    for (const [i, event] of (this.data?.extended?.events || []).entries()) {
      const sortKey = timelineOrder.has(event.handle)
        ? timelineOrder.get(event.handle)
        : event.date?.sortval ?? Infinity
      const baseProfile = (this.data?.profile?.events || [])[i] || {}
      entries.push({
        sortKey,
        data: event,
        profile: {...baseProfile, age: timelineAge.get(event.handle) || ''},
      })
    }

    // Family/related events: only from timeline.
    for (const te of this.timelineData) {
      if (personalHandles.has(te.handle)) continue
      if (familyEventHandles.has(te.handle)) {
        if (!this._showFamilyEvents) continue
      } else {
        if (!this._showRelatedEvents) continue
      }
      const isRelated = !familyEventHandles.has(te.handle)
      const personName = isRelated
        ? [te.person?.name_given, te.person?.name_surname]
            .filter(Boolean)
            .join(' ')
        : ''
      entries.push({
        sortKey: timelineOrder.get(te.handle),
        data: {
          gramps_id: te.gramps_id,
          handle: te.handle,
          type: te.type,
          description: te.description || '',
          media_list: (te.media || []).map(h => ({ref: h})),
        },
        profile: {
          type: this._(te.type),
          date: te.date || '',
          place: te.place?.name || '',
          place_name: te.place?.name || '',
          role: isRelated ? te.person?.relationship || '' : '',
          summary: te.label || te.type || '',
          context: isRelated ? personName : this._('Family'),
          age: te.age || '',
        },
      })
    }

    entries.sort((a, b) => a.sortKey - b.sortKey)

    return {
      data: entries.map(e => e.data),
      profile: entries.map(e => e.profile),
    }
  }

  renderSectionContent(sectionKey) {
    if (
      sectionKey !== 'events' ||
      this.edit ||
      this._addedSections.includes('events')
    ) {
      return super.renderSectionContent(sectionKey)
    }

    const hasFamilies =
      (this.data?.family_list?.length || 0) +
        (this.data?.parent_family_list?.length || 0) >
      0

    const chips = hasFamilies
      ? html`
          <div class="events-chips">
            <md-chip-set>
              <md-filter-chip
                label="${this._('Personal')}"
                selected
                @click="${e => {
                  e.target.selected = true
                }}"
              ></md-filter-chip>
              <md-filter-chip
                label="${this._('Family')}"
                ?selected="${this._showFamilyEvents}"
                @click="${this._handleFamilyEventsToggle}"
              ></md-filter-chip>
              <md-filter-chip
                label="${this._('Relatives')}"
                ?selected="${this._showRelatedEvents}"
                @click="${this._handleRelatedEventsToggle}"
              ></md-filter-chip>
            </md-chip-set>
          </div>
        `
      : ''

    // While neither toggle is active (or timeline not yet loaded), show
    // the normal personal events list with full edit capability.
    if (
      (!this._showFamilyEvents && !this._showRelatedEvents) ||
      !this.timelineData.length
    ) {
      return html`
        ${chips}
        <grampsjs-events
          hasShare
          hasAdd
          hasEdit
          defaultRole="Primary"
          .appState="${this.appState}"
          .data=${this.data?.extended?.events}
          .profile=${this.data?.profile?.events}
          .eventRef=${this.data?.event_ref_list}
        ></grampsjs-events>
      `
    }

    // Combined chronological view using the timeline endpoint.
    const {data, profile} = this._getCombinedTimelineEvents()
    return html`
      ${chips}
      <grampsjs-events
        hasAdd
        hasShare
        .appState="${this.appState}"
        .data=${data}
        .profile=${profile}
        .hasReorder=${false}
        .referenceIndices=${data.map(event =>
          (this.data.event_ref_list || []).findIndex(
            ref => ref.ref === event.handle
          )
        )}
        .eventRef=${data.map(event =>
          (this.data.event_ref_list || []).find(ref => ref.ref === event.handle)
        )}
      ></grampsjs-events>
    `
  }
}

window.customElements.define('grampsjs-person', GrampsjsPerson)
