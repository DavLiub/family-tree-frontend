import {html} from 'lit'
import {GrampsjsViewObject} from '../../src/views/GrampsjsViewObject.js'
import {GrampsjsViewSearch} from '../../src/views/GrampsjsViewSearch.js'

// Keep real Lit lifecycle and request methods; omit unrelated child widgets.
class NavigationObject extends GrampsjsViewObject {
  constructor() {
    super()
    this._className = 'person'
    this._url = '/api/people/'
  }

  getUrl() {
    return `/api/people/?gramps_id=${this.grampsId}`
  }

  renderContent() {
    return html``
  }
}
class NavigationSearch extends GrampsjsViewSearch {
  renderContent() {
    return html`<input id="search-field" />`
  }
}
customElements.define('test-navigation-object', NavigationObject)
customElements.define('test-navigation-search', NavigationSearch)

export function deferred() {
  let complete
  let fail
  const promise = new Promise((resolve, reject) => {
    complete = resolve
    fail = reject
  })
  return {promise, resolve: complete, reject: fail}
}

export async function mountNavigation(kind, apiGet, state = {}) {
  const view = document.createElement(`test-navigation-${kind}`)
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    permissions: {},
    apiGet,
    ...state,
  }
  view.active = true
  document.body.append(view)
  await view.updateComplete
  return view
}

export function setQuery(view, query) {
  view.shadowRoot.getElementById('search-field').value = query
}
