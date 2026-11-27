// Exact completed years; never infer an exact age from a partial date.
function exactDate(value) {
  if (value && typeof value === 'object') {
    if (value.modifier || value.quality || value.calendar) return null
    const [day, month, year, slash] = value.dateval || []
    if (slash) return null
    return validDate(year, month, day)
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  return match ? validDate(+match[1], +match[2], +match[3]) : null
}

function validDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger) || year < 1 || !month || !day)
    return null
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null
}

function lifeEvent(person, kind) {
  const index = person?.[`${kind}_ref_index`]
  const ref = person?.event_ref_list?.[index]?.ref
  const event = person?.extended?.events?.find(item => item.handle === ref)
  const profile = person?.profile?.[kind]
  return {
    known:
      (Number.isInteger(index) && index >= 0) ||
      !!event ||
      !!(profile && Object.keys(profile).length),
    date: event ? event.date : profile?.date,
  }
}

export function personAge(person, today = new Date()) {
  const birth = exactDate(lifeEvent(person, 'birth').date)
  const death = lifeEvent(person, 'death')
  const end = death.known ? exactDate(death.date) : today
  if (
    !birth ||
    !(end instanceof Date) ||
    !Number.isFinite(end.getTime()) ||
    end > today ||
    birth > end
  )
    return null
  let age = end.getFullYear() - birth.getFullYear()
  if (
    end.getMonth() < birth.getMonth() ||
    (end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate())
  )
    age -= 1
  return age
}
