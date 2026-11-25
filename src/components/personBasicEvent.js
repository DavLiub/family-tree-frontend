import {makeHandle} from '../util.js'
import {saveContextObject} from './contextEdit.js'

// Keep a created event identity across attachment retries.
export async function savePersonBasicEvent(
  appState,
  personHandle,
  kind,
  data,
  draft
) {
  if (!appState.permissions?.canEdit || !appState.permissions?.canAdd)
    return {error: 'Not authorized'}
  if (!['birth', 'death'].includes(kind)) return {error: 'Record not found'}
  draft.handle ||= makeHandle()
  const {role, ...fields} = data
  const record = {
    ...fields,
    _class: 'Event',
    handle: draft.handle,
    type: kind === 'birth' ? 'Birth' : 'Death',
  }
  if (!draft.created) {
    const created = await appState.apiPost('/api/events/', record, {
      dbChanged: false,
    })
    if (created?.error || !created?.data)
      return created || {error: 'Unable to save record'}
    draft.created = true
  } else if (draft.value !== JSON.stringify(record)) {
    const changed = await saveContextObject(
      appState,
      'events',
      draft.handle,
      record
    )
    if (changed?.error) return changed
  }
  draft.value = JSON.stringify(record)
  return saveContextObject(appState, 'people', personHandle, fresh => {
    const refs = fresh.event_ref_list || []
    let index = refs.findIndex(ref => ref.ref === draft.handle)
    const current = fresh[`${kind}_ref_index`]
    if (
      Number.isInteger(current) &&
      current >= 0 &&
      refs[current]?.ref !== draft.handle
    )
      throw new Error('This person has changed. Reload the card before saving.')
    if (index < 0) index = refs.length
    return {
      event_ref_list:
        index === refs.length
          ? [...refs, {_class: 'EventRef', ref: draft.handle, role: 'Primary'}]
          : refs,
      [`${kind}_ref_index`]: index,
    }
  })
}
