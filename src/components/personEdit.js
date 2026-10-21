// Only these fields belong to the basic person form. Everything else is retained.
export function getPersonEditFields(person) {
  return {
    firstName: person.primary_name?.first_name || '',
    surnames: (person.primary_name?.surname_list?.length
      ? person.primary_name.surname_list
      : [{}]
    ).map(surname => surname.surname || ''),
    gender: person.gender ?? 2,
  }
}

export function buildPersonEditPayload(person, fields) {
  const storedPerson = {...person}
  delete storedPerson.extended
  delete storedPerson.profile
  delete storedPerson.backlinks
  delete storedPerson.formatted
  const primaryName = person.primary_name || {_class: 'Name'}
  const surnameList = primaryName.surname_list || []
  if (![0, 1, 2, 3].includes(fields.gender)) {
    throw new Error('Invalid gender')
  }
  if (fields.surnames.length !== Math.max(surnameList.length, 1)) {
    throw new Error('Invalid surname list')
  }
  return {
    ...storedPerson,
    _class: 'Person',
    gender: fields.gender,
    primary_name: {
      ...primaryName,
      first_name: fields.firstName,
      surname_list: fields.surnames.map((surname, index) => ({
        ...(surnameList[index] || {_class: 'Surname', primary: true}),
        surname,
      })),
    },
  }
}

export async function savePersonEdit(appState, originalPerson, fields) {
  if (!appState.permissions?.canEdit) return {error: 'Not authorized'}
  const url = `/api/people/${originalPerson.handle}`
  const latest = await appState.apiGet(url)
  if (latest.error) return latest
  if (!latest.data) return {error: 'Unable to load person'}
  // Avoid replacing changes made by a relative while this form was open.
  // This check is not an atomic server-side lock.
  if (JSON.stringify(latest.data) !== JSON.stringify(originalPerson)) {
    return {conflict: true}
  }
  return appState.apiPut(url, buildPersonEditPayload(latest.data, fields))
}
