import {html} from 'lit'
import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import '@material/web/button/text-button.js'
import './GrampsjsIcon.js'

// Keep creation visible without exposing the full reorder/remove toolbar.
export function renderSectionCreateActions(host, options = {}) {
  const permissions = host.appState.permissions || {}
  if (!permissions.canEdit) return ''
  const add =
    options.add && (!options.newObject || permissions.canAdd !== false)
  const actions = [
    [add, options.addLabel || 'Add', mdiPlus, options.onAdd],
    [
      options.attach,
      options.attachLabel || 'Attach existing',
      mdiLinkPlus,
      options.onAttach,
    ],
  ]
  return html`<div class="section-create-actions">
    ${actions.map(([visible, label, icon, handler]) =>
      visible
        ? html`<md-text-button @click=${handler}>
            <grampsjs-icon
              slot="icon"
              path=${icon}
              color="var(--mdc-theme-secondary)"
            ></grampsjs-icon>
            ${host._(label)}
          </md-text-button>`
        : ''
    )}
  </div>`
}
