import {saveContextObject} from './contextEdit.js'

export async function loadPersonPhotos(appState, handle) {
  if (!appState.permissions?.canEdit) throw new Error('Editing is not allowed')
  const result = await appState.apiGet(
    `/api/people/${handle}?extend=media_list`
  )
  if (result?.error || result?.data?.handle !== handle)
    throw new Error(result?.error || 'Unable to load record')
  const person = result.data
  const media = person.extended?.media || []
  const photos = (person.media_list || []).flatMap(ref => {
    const record = media.find(item => item?.handle === ref.ref)
    return record?.mime?.startsWith('image/') ? [{record, ref}] : []
  })
  return {person, photos}
}

export async function setPrimaryPersonPhoto(
  appState,
  personHandle,
  mediaHandle,
  {existing = true} = {}
) {
  if (!mediaHandle) throw new Error('Record not found')
  if (!existing && appState.permissions?.canAdd !== true)
    throw new Error('Editing is not allowed')
  return saveContextObject(appState, 'people', personHandle, fresh => {
    const refs = fresh.media_list || []
    const selected = refs.find(ref => ref.ref === mediaHandle)
    if (existing && !selected)
      throw new Error('This photo is no longer attached to the person')
    return {
      media_list: [
        selected || {_class: 'MediaRef', ref: mediaHandle},
        ...refs.filter(ref => ref.ref !== mediaHandle),
      ],
    }
  })
}
