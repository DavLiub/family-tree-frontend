import {html} from 'lit'
import {loadContextObject} from './contextEdit.js'
import {fireEvent} from '../util.js'

export function renderContextObjectEditor({
  appState,
  record,
  endpoint,
  title,
  onSaved,
  onCancel,
  onChanged,
}) {
  return html`<grampsjs-form-context-object
    .appState=${appState}
    endpoint=${endpoint}
    handle=${record.handle}
    .data=${structuredClone(record)}
    dialogTitle=${title}
    @context:saved=${onChanged}
    @object:saved=${onSaved}
    @object:cancel=${onCancel}
  ></grampsjs-form-context-object>`
}

// A nested shared record saves independently. Hold the outer draft in place
// until it is saved or cancelled, then refresh the card if the nested record changed.
export const GrampsjsNestedContextMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {...super.properties, nestedDialog: {state: true}}
    }

    constructor() {
      super()
      this.nestedDialog = ''
      this._nestedChanged = false
    }

    render() {
      return html`${super.render()}${this.nestedDialog}`
    }

    async openNestedContextEditor(endpoint, handle, title, onChanged) {
      if (this.saving || !handle) return
      this.saving = true
      this.errorMessage = ''
      try {
        const record = await loadContextObject(this.appState, endpoint, handle)
        const close = event => {
          event.stopPropagation()
          this.nestedDialog = ''
        }
        this.nestedDialog = renderContextObjectEditor({
          appState: this.appState,
          record,
          endpoint,
          title,
          onSaved: close,
          onCancel: close,
          onChanged: event => {
            event.stopPropagation()
            this._nestedChanged = true
            onChanged({...record, ...event.currentTarget.data})
          },
        })
      } catch (error) {
        this.errorMessage = this._(error.message)
      } finally {
        this.saving = false
      }
    }

    _handleDialogCancel() {
      if (this.saving) return
      super._handleDialogCancel()
      if (this._nestedChanged) fireEvent(this, 'context:saved')
    }
  }
