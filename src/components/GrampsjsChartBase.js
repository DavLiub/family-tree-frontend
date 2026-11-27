import {html, css, LitElement} from 'lit'
import {getSymbols} from '../symbols.js'
import {chartTransitionDuration, getImageUrl} from '../charts/util.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTreePhoto.js'
import './GrampsjsFormEditPerson.js'
import {FamilyGraph} from '../charts/model/FamilyGraph.js'

export class GrampsjsChartBase extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div#container {
          display: flex;
          height: calc(100vh - 153px);
        }

        @media (max-width: 599px) {
          div#container {
            height: calc(100vh - 145px);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      relations: {type: Object},
      _photoHandle: {state: true},
      _basicHandle: {state: true},
      containerWidth: {type: Number},
      containerHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.data = []
    this.relations = {}
    this._photoHandle = ''
    this._basicHandle = ''
    this.containerWidth = -1
    this.containerHeight = -1
  }

  get personCardOptions() {
    return {
      getImageUrl: node => getImageUrl(node.person, 100),
      nameDisplayFormat: this.nameDisplayFormat,
      relations: this.relations,
      lang: this.appState.i18n?.lang || 'en',
      ageLabel: this._('Age'),
      deathAgeLabel: this._('Age at death'),
      ...getSymbols(this.appState.settings, s => this._(s)),
      canEdit: this.canEdit,
      canEditPhoto: this.appState.permissions?.canEdit,
      photoLabel: this._('Add or change photo'),
      editLabel: this._('Basic details'),
      duration: chartTransitionDuration(),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
    }
  }

  // The viewport of a chart drawn with `ChartViewport`
  get viewport() {
    return this._chart?.viewport
  }

  willUpdate(changed) {
    if (changed.has('data')) {
      this._graph = new FamilyGraph(this.data)
    }
  }

  render() {
    return html`<div id="container">${this.renderChart()}</div>`
  }

  _openPersonPhoto(event) {
    event.stopPropagation()
    const handle = event.detail?.handle
    if (this.appState.permissions?.canEdit && this._graph?.person(handle))
      this._photoHandle = handle
  }

  _openPersonBasics(event) {
    event.stopPropagation()
    const handle = event.detail?.handle
    if (this.appState.permissions?.canEdit && this._graph?.person(handle))
      this._basicHandle = handle
  }

  renderBasicDialog() {
    return this._basicHandle
      ? html`<grampsjs-form-edit-person
          basic
          .appState=${this.appState}
          personHandle=${this._basicHandle}
          @object:save=${() => {
            this._basicHandle = ''
          }}
          @object:cancel=${() => {
            this._basicHandle = ''
          }}
        ></grampsjs-form-edit-person>`
      : ''
  }

  renderPhotoDialog() {
    return this._photoHandle
      ? html`<grampsjs-tree-photo
          .appState=${this.appState}
          personHandle=${this._photoHandle}
          @object:saved=${() => {
            this._photoHandle = ''
          }}
          @object:cancel=${() => {
            this._photoHandle = ''
          }}
        ></grampsjs-tree-photo>`
      : ''
  }

  firstUpdated() {
    const container = this.renderRoot.getElementById('container')
    this.handleResize()
    new ResizeObserver(() => this.handleResize()).observe(container)
  }

  handleResize() {
    const container = this.renderRoot.getElementById('container')
    if (container) {
      this.containerWidth = container.offsetWidth
      this.containerHeight = container.offsetHeight
    }
  }
}
