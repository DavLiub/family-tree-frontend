import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import {fireEvent} from '../util.js'
import '../components/GrampsjsPerson.js'
import '../components/GrampsjsFormEditPerson.js'

export class GrampsjsViewPerson extends GrampsjsViewObject {
  static get properties() {
    return {
      homePersonDetails: {type: Object},
      _timelineData: {type: Array},
      _timelineLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this._className = 'person'
    this._timelineData = []
    this._timelineLoading = false
    this._boundHandleTimelineNeeded = this._handleTimelineNeeded.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener(
      'person:timeline-needed',
      this._boundHandleTimelineNeeded
    )
  }

  disconnectedCallback() {
    this.removeEventListener(
      'person:timeline-needed',
      this._boundHandleTimelineNeeded
    )
    super.disconnectedCallback()
  }

  _clearData() {
    super._clearData()
    this._timelineData = []
    this._timelineLoading = false
  }

  _handleTimelineNeeded() {
    if (!this._timelineData.length && !this._timelineLoading) {
      this._fetchTimeline()
    }
  }

  _fetchTimeline() {
    const handle = this._data?.handle
    if (!handle) return
    this._timelineLoading = true
    const url = `/api/people/${handle}/timeline?locale=${
      this.appState.i18n.lang || 'en'
    }&precision=2`
    this.appState.apiGet(url).then(result => {
      this._timelineLoading = false
      if ('data' in result) {
        this._timelineData = result.data
      } else if ('error' in result) {
        fireEvent(this, 'grampsjs:error', {message: result.error})
      }
    })
  }

  getUrl() {
    return `/api/people/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all&precision=1`
  }

  _openPersonForm() {
    if (!this.active || !this.edit || !this.canEdit || !this._data.handle)
      return
    this.editDialogContent = html`
      <grampsjs-form-edit-person
        .appState=${this.appState}
        .personHandle=${this._data.handle}
        @object:cancel=${this._closePersonForm}
        @object:save=${this._handlePersonSaved}
      ></grampsjs-form-edit-person>
    `
  }

  _closePersonForm() {
    this.editDialogContent = ''
  }

  _handlePersonSaved() {
    this._closePersonForm()
    this._updateData(false)
  }

  _disableEditMode() {
    this._closePersonForm()
    super._disableEditMode()
  }

  update(changed) {
    if (changed.has('grampsId') || (changed.has('active') && !this.active)) {
      this._closePersonForm()
    }
    super.update(changed)
  }

  renderElement() {
    return html`
      <grampsjs-person
        .data=${this._data}
        .appState="${this.appState}"
        .homePersonDetails=${this.homePersonDetails}
        .timelineData=${this._timelineData}
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
        @person:edit-card=${this._openPersonForm}
      ></grampsjs-person>
    `
  }
}

window.customElements.define('grampsjs-view-person', GrampsjsViewPerson)
