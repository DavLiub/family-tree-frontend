const clean = value =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
const typeValue = value =>
  typeof value === 'string' ? value : value?.string || value?.value || ''
const isPatronymic = surname => typeValue(surname?.origintype) === 'Patronymic'

export function getNameType(name) {
  const type = typeValue(name?.type)
  return typeof type === 'string' ? type : ''
}

export function getNameKind(name) {
  const type = getNameType(name)
  if (type === 'Birth Name') return 'birth'
  if (type === 'Married Name') return 'married'
  if (type === 'Name change' || type.startsWith('Name change: '))
    return 'changed'
  return 'other'
}

export function getNameParts(name = {}) {
  const surnames = name.surname_list || []
  return {
    given: name.first_name || '',
    patronymicParts: structuredClone(surnames.filter(isPatronymic)),
    patronymic: surnames
      .filter(isPatronymic)
      .map(part => part.surname || '')
      .filter(Boolean)
      .join(' '),
    surnames: structuredClone(surnames.filter(part => !isPatronymic(part))),
  }
}

// Only explicit edits change the native Name. Existing combined given names
// are never split, and unknown fields on Name/Surname remain intact.
export function updateNameParts(name = {}, changes = {}) {
  const result = structuredClone(name)
  if ('given' in changes) result.first_name = changes.given
  let patronymics = structuredClone(
    (name.surname_list || []).filter(isPatronymic)
  )
  if ('patronymicParts' in changes) {
    patronymics = structuredClone(changes.patronymicParts)
  } else if (
    'patronymic' in changes &&
    changes.patronymic !== getNameParts(name).patronymic
  ) {
    if (patronymics.length > 1)
      throw new Error('Edit the individual patronymic parts in More details.')
    patronymics = changes.patronymic
      ? [
          {
            _class: 'Surname',
            ...patronymics[0],
            surname: changes.patronymic,
            origintype: 'Patronymic',
            primary: false,
          },
        ]
      : []
  }
  if (
    'surnames' in changes ||
    'patronymic' in changes ||
    'patronymicParts' in changes
  ) {
    const surnames = structuredClone(
      changes.surnames ?? getNameParts(name).surnames
    )
    // Keep the original interleaving for existing multi-part names.
    const merged = []
    for (const old of name.surname_list || []) {
      const next = isPatronymic(old) ? patronymics.shift() : surnames.shift()
      if (next) merged.push(next)
    }
    result.surname_list = [...merged, ...surnames, ...patronymics]
  }
  return result
}

const surnameText = parts =>
  parts
    .map(part =>
      [part.prefix, part.surname, part.connector]
        .map(clean)
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' ')

export function formatHistoryName(name = {}) {
  const parts = getNameParts(name)
  const patronymics = (name.surname_list || []).filter(isPatronymic)
  return [
    clean(parts.given),
    surnameText(patronymics),
    surnameText(parts.surnames),
    clean(name.suffix),
  ]
    .filter(Boolean)
    .join(' ')
}

export function getPersonNameDisplay(person = {}, translate = value => value) {
  const primary = person.primary_name
  const main = primary
    ? formatHistoryName(primary)
    : [
        person.profile?.name_given,
        person.profile?.name_surname,
        person.profile?.name_suffix,
      ]
        .map(clean)
        .filter(Boolean)
        .join(' ')
  const candidates = [primary, ...(person.alternate_names || [])].filter(
    name => name && getNameKind(name) === 'birth'
  )
  const unique = [
    ...new Map(
      candidates.map(name => [formatHistoryName(name), name])
    ).values(),
  ].filter(name => formatHistoryName(name))
  if (!primary || unique.length !== 1)
    return {main, birth: '', text: main, ambiguousBirth: unique.length > 1}
  const atBirth = getNameParts(unique[0])
  const selected = getNameParts(primary)
  const differentGiven =
    clean(atBirth.given) && clean(atBirth.given) !== clean(selected.given)
  const oldPatronymic = surnameText(atBirth.patronymicParts)
  const differentPatronymic =
    oldPatronymic && oldPatronymic !== surnameText(selected.patronymicParts)
  const oldSurname = surnameText(atBirth.surnames)
  const differentSurname =
    oldSurname && oldSurname !== surnameText(selected.surnames)
  const birthParts = [
    differentGiven ? clean(atBirth.given) : '',
    differentPatronymic ? oldPatronymic : '',
    differentSurname ? oldSurname : '',
  ]
    .filter(Boolean)
    .join(' ')
  const birth =
    birthParts && (differentGiven || differentPatronymic)
      ? `${translate('At birth')}: ${birthParts}`
      : birthParts
  return {
    main,
    birth,
    text: birth ? `${main} (${birth})` : main,
    ambiguousBirth: false,
  }
}
