import {html} from 'lit'
import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import '@material/web/button/text-button.js'
import '@material/web/dialog/dialog.js'
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

// Confirm detachment without deleting the shared source object.
export function confirmSectionRemoval(
  host,
  onConfirm,
  label = 'Detach from person',
  shared = true
) {
  if (!host.appState.permissions?.canEdit) return
  const close = () => {
    host.dialogContent = ''
  }
  host.dialogContent = html`<md-dialog open @cancel=${close}>
    <span slot="headline">${host._('Are you sure?')}</span>
    <div slot="content">
      ${host._(label)}
      ${shared
        ? html`<p>
            ${host._('The record will remain in the tree and on other cards.')}
          </p>`
        : ''}
    </div>
    <div slot="actions">
      <md-text-button @click=${close}>${host._('Cancel')}</md-text-button>
      <md-text-button
        @click=${() => {
          close()
          onConfirm()
        }}
        >${host._(label)}</md-text-button
      >
    </div>
  </md-dialog>`
}
