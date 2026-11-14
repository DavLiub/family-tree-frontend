/* Main navigation for the family site. */

import {html, css, LitElement, nothing} from 'lit'
import {
  mdiFamilyTree,
  mdiCreation,
  mdiDna,
  mdiHome,
  mdiImage,
  mdiRss,
  mdiFormatListBulleted,
  mdiMap,
  mdiHistory,
  mdiBookmark,
  mdiFormatListChecks,
  mdiDownload,
  mdiFileExportOutline,
  mdiSourceCommit,
  mdiBell,
  mdiBellBadge,
  mdiTimelineOutline,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'

const BASE_DIR = ''

const primaryItems = [
  {path: 'tree', label: 'Family Tree', icon: mdiFamilyTree, pages: ['tree']},
  {
    path: 'people',
    label: 'People',
    icon: mdiFormatListBulleted,
    pages: ['people', 'person', 'new_person'],
  },
  {
    path: 'medialist',
    label: 'Photos and documents',
    icon: mdiImage,
    pages: ['medialist', 'media', 'new_media'],
  },
]

const secondaryItems = [
  {path: '', label: 'Home', icon: mdiHome, pages: ['home']},
  {
    path: 'bookmarks',
    label: '_Bookmarks',
    icon: mdiBookmark,
    pages: ['bookmarks'],
  },
  {
    path: 'notifications',
    label: 'Notifications',
    icon: mdiBell,
    pages: ['notifications'],
  },
]

const additionalItems = [
  {path: 'blog', label: 'Blog', icon: mdiRss, pages: ['blog']},
  {
    path: 'timeline',
    label: 'Timeline',
    icon: mdiTimelineOutline,
    pages: ['timeline'],
  },
  {path: 'map', label: 'Map', icon: mdiMap, pages: ['map']},
  {
    path: 'dna-matches',
    label: 'DNA',
    icon: mdiDna,
    pages: ['dna-matches', 'dna-chromosome', 'ydna'],
  },
  {
    path: 'families',
    label: 'Lists',
    icon: mdiFormatListBulleted,
    pages: [
      'families',
      'family',
      'new_family',
      'events',
      'event',
      'new_event',
      'places',
      'place',
      'new_place',
      'citations',
      'citation',
      'new_citation',
      'sources',
      'source',
      'new_source',
      'repositories',
      'repository',
      'new_repository',
      'notes',
      'note',
      'new_note',
      'tags',
    ],
  },
  {path: 'chat', label: 'Assistant', icon: mdiCreation, pages: ['chat']},
  {path: 'recent', label: 'History', icon: mdiHistory, pages: ['recent']},
  {
    path: 'tasks',
    label: 'Tasks',
    icon: mdiFormatListChecks,
    pages: ['tasks', 'task', 'new_task'],
  },
  {
    path: 'reports',
    label: '_Reports',
    icon: mdiFileExportOutline,
    pages: ['reports', 'report'],
  },
  {path: 'export', label: 'Export', icon: mdiDownload, pages: ['export']},
  {
    path: 'revisions',
    label: 'Revisions',
    icon: mdiSourceCommit,
    pages: ['revisions', 'revision'],
  },
]

class GrampsjsMainMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          min-width: 0;
        }

        nav {
          color: var(--grampsjs-color-drawer-text);
          padding-block: 0.5rem;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        a:any-link,
        summary {
          box-sizing: border-box;
          min-height: 44px;
          margin-inline: 0.5rem;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          color: inherit;
          font-size: 1rem;
          line-height: 1.5;
          text-decoration: none;
          cursor: pointer;
          overflow-wrap: anywhere;
        }

        a {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        a:hover,
        summary:hover {
          background: var(--md-sys-color-surface-container-highest);
        }

        a:focus-visible,
        summary:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: -2px;
        }

        a[aria-current='page'] {
          color: var(--grampsjs-color-icon-selected);
          background: var(--md-sys-color-secondary-container);
          font-weight: 500;
        }

        grampsjs-icon {
          flex: 0 0 24px;
          pointer-events: none;
        }

        .label {
          min-width: 0;
          flex: 1;
        }

        .secondary,
        details {
          border-top: 1px solid var(--md-sys-color-outline-variant);
          margin-top: 0.5rem;
          padding-top: 0.5rem;
        }

        summary {
          display: list-item;
          padding-inline-start: 1rem;
          list-style-position: inside;
        }

        summary.active {
          color: var(--grampsjs-color-icon-selected);
          font-weight: 500;
        }

        .unread-badge {
          flex: 0 0 auto;
          min-width: 18px;
          padding: 0 4px;
          border-radius: 9px;
          background: var(--md-sys-color-error, #b00020);
          color: var(--md-sys-color-on-error, #fff);
          font-size: 11px;
          font-weight: 700;
          line-height: 18px;
          text-align: center;
        }
      `,
    ]
  }

  static get properties() {
    return {
      unreadCount: {type: Number},
      _moreOpen: {state: true},
    }
  }

  constructor() {
    super()
    this.unreadCount = 0
    this._moreOpen = false
    this._lastPage = undefined
    this._boundHandleNotifications = this._handleNotificationsChanged.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    const existing = this.appState?.getNotifications?.() ?? []
    this.unreadCount = existing.filter(n => n?.read === false).length
    window.addEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
  }

  willUpdate(changed) {
    const page = this.appState?.path?.page || 'home'
    if (changed.has('appState') && page !== this._lastPage) {
      this._lastPage = page
      this._moreOpen = this._additionalItems().some(item =>
        item.pages.includes(page)
      )
    }
  }

  _handleNotificationsChanged(e) {
    this.unreadCount = e.detail.unreadCount
  }

  _additionalItems() {
    return additionalItems.filter(item => {
      if (item.path === 'dna-matches')
        return !this.appState.frontendConfig?.hideDNALink
      if (item.path === 'chat') return this.canUseChat
      if (item.path === 'revisions')
        return this.appState.permissions?.canViewPrivate
      return true
    })
  }

  _renderItem(item) {
    const selected = item.pages.includes(this.appState?.path?.page || 'home')
    const notifications = item.path === 'notifications'
    const icon =
      notifications && this.unreadCount > 0 ? mdiBellBadge : item.icon
    return html`<li>
      <a
        href=${`${BASE_DIR}/${item.path}`}
        aria-current=${selected ? 'page' : nothing}
      >
        <grampsjs-icon
          path=${icon}
          color=${selected
            ? 'var(--grampsjs-color-icon-selected)'
            : 'var(--grampsjs-color-icon-default)'}
          aria-hidden="true"
        ></grampsjs-icon>
        <span class="label">${this._(item.label)}</span>
        ${notifications && this.unreadCount > 0
          ? html`<span class="unread-badge">${this.unreadCount}</span>`
          : ''}
      </a>
    </li>`
  }

  render() {
    const extra = this._additionalItems()
    const page = this.appState?.path?.page || 'home'
    const extraSelected = extra.some(item => item.pages.includes(page))
    return html`<nav aria-label=${this._('Main navigation')}>
      <ul class="primary">
        ${primaryItems.map(item => this._renderItem(item))}
      </ul>
      <ul class="secondary">
        ${secondaryItems.map(item => this._renderItem(item))}
      </ul>
      <details
        .open=${this._moreOpen}
        @toggle=${e => {
          this._moreOpen = e.currentTarget.open
        }}
      >
        <summary class=${extraSelected ? 'active' : ''}>
          ${this._('More')}
        </summary>
        <ul>
          ${extra.map(item => this._renderItem(item))}
        </ul>
      </details>
    </nav>`
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsMainMenu)
