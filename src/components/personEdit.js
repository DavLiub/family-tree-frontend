import {getNameParts, updateNameParts} from './nameHistory.js'

// Only these fields belong to the basic person form. Everything else is retained.
export function getPersonEditFields(person) {
  const parts = getNameParts(person.primary_name)
  return {
    firstName: parts.given,
    surnames: parts.surnames.length
      ? parts.surnames.map(part => part.surname || '')
      : [''],
    patronymics: parts.patronymicParts.length
      ? parts.patronymicParts.map(part => part.surname || '')
      : [''],
    gender: person.gender ?? 2,
  }
}

export function nativePerson(person) {
  const {extended, profile, backlinks, formatted, ...record} = person
  return record
}

export function buildPersonEditPayload(person, fields) {
  const storedPerson = nativePerson(person)
  const primaryName = person.primary_name || {_class: 'Name'}
  const parts = getNameParts(primaryName)
  const surnameList = parts.surnames
  if (
    fields.patronymics &&
    fields.patronymics.length !== Math.max(parts.patronymicParts.length, 1)
  )
    throw new Error('Invalid patronymic list')
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
    primary_name: updateNameParts(primaryName, {
      given: fields.firstName,
      surnames: fields.surnames.map((surname, index) => ({
        ...(surnameList[index] || {_class: 'Surname', primary: true}),
        surname,
      })),
      ...(fields.patronymics
        ? {
            patronymicParts: fields.patronymics.flatMap((surname, index) => {
              const stored = parts.patronymicParts[index]
              return stored || surname
                ? [
                    {
                      ...(stored || {
                        _class: 'Surname',
                        origintype: 'Patronymic',
                        primary: false,
                      }),
                      surname,
                    },
                  ]
                : []
            }),
          }
        : {}),
    }),
  }
}

export async function savePersonEdit(appState, originalPerson, fields) {
  if (!appState.permissions?.canEdit) return {error: 'Not authorized'}
  const url = `/api/people/${originalPerson.handle}`
  const latest = await appState.apiGet(url)
  if (latest.error) return latest
  if (!latest.data || latest.data.handle !== originalPerson.handle)
    return {error: 'Unable to load person'}
  // Avoid replacing changes made by a relative while this form was open.
  // This check is not an atomic server-side lock.
  if (
    JSON.stringify(nativePerson(latest.data)) !==
    JSON.stringify(nativePerson(originalPerson))
  ) {
    return {conflict: true}
  }
  return appState.apiPut(url, buildPersonEditPayload(latest.data, fields))
}
