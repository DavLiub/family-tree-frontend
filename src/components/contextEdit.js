// Context editors update the existing record, including fields not shown by
// the form. A fresh read avoids writing stale unrelated fields from a profile.
export async function loadContextObject(appState, endpoint, handle) {
  if (!appState.permissions?.canEdit) throw new Error('Editing is not allowed')
  if (!handle) throw new Error('Record not found')
  const result = await appState.apiGet(`/api/${endpoint}/${handle}`)
  if (!result?.data || result.error) {
    throw new Error(result?.error || 'Unable to load record')
  }
  if (result.data.handle !== handle) throw new Error('Record not found')
  return result.data
}

export async function saveContextObject(appState, endpoint, handle, fields) {
  const fresh = await loadContextObject(appState, endpoint, handle)
  const {extended, profile, backlinks, formatted, ...record} = fresh
  const changes = typeof fields === 'function' ? fields(fresh) : fields
  return appState.apiPut(`/api/${endpoint}/${handle}`, {
    ...record,
    ...changes,
    handle,
  })
}
