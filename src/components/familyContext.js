const value = item => item?.string || item || ''
const parentKeys = ['father_handle', 'mother_handle']

// Return only the edited fields, applying child changes to the freshly read list.
export function familyContextChanges(
  fresh,
  initial,
  draft,
  personHandle,
  disconnect
) {
  const patch = {}
  if (disconnect) {
    const wasChild = (initial.child_ref_list || []).some(
      ref => ref.ref === personHandle
    )
    if (wasChild) {
      if (!(fresh.child_ref_list || []).some(ref => ref.ref === personHandle)) {
        throw new Error(
          'The family relationship has changed. Reopen the editor.'
        )
      }
      patch.child_ref_list = fresh.child_ref_list.filter(
        ref => ref.ref !== personHandle
      )
    } else {
      const role = parentKeys.find(key => initial[key] === personHandle)
      if (!role || fresh[role] !== personHandle) {
        throw new Error(
          'The family relationship has changed. Reopen the editor.'
        )
      }
      patch[role] = ''
    }
    return patch
  }
  for (const key of [...parentKeys, 'type']) {
    if (value(draft[key]) !== value(initial[key])) {
      if (value(fresh[key]) !== value(initial[key])) {
        throw new Error(
          'The family relationship has changed. Reopen the editor.'
        )
      }
      patch[key] = draft[key] || ''
    }
  }
  const children = fresh.child_ref_list || []
  if (
    parentKeys.some(key => {
      const handle = key in patch ? patch[key] : fresh[key]
      return handle && children.some(ref => ref.ref === handle)
    })
  ) {
    throw new Error(
      'A person cannot be both a parent and a child in this family.'
    )
  }
  const father =
    'father_handle' in patch ? patch.father_handle : fresh.father_handle
  const mother =
    'mother_handle' in patch ? patch.mother_handle : fresh.mother_handle
  if (father && father === mother) {
    throw new Error('Select different people for the two parent positions.')
  }
  const oldRef = (initial.child_ref_list || []).find(
    ref => ref.ref === personHandle
  )
  if (oldRef && ['frel', 'mrel'].some(key => draft[key] !== oldRef[key])) {
    const current = children.find(ref => ref.ref === personHandle)
    if (
      !current ||
      ['frel', 'mrel'].some(key => current[key] !== oldRef[key])
    ) {
      throw new Error('The family relationship has changed. Reopen the editor.')
    }
    patch.child_ref_list = children.map(ref =>
      ref.ref === personHandle
        ? {...ref, frel: draft.frel, mrel: draft.mrel}
        : ref
    )
  }
  return patch
}
