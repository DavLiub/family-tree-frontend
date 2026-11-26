// Resolve the event actually used by the person's summary, never the first
// matching type: several conflicting events and inferred dates are possible.
export function getSummaryEvent(person, kind) {
  const summary = person?.profile?.[kind]
  const events = person?.extended?.events || []
  if (!summary || Object.keys(summary).length === 0) return null
  if (summary.handle) {
    return events.find(event => event.handle === summary.handle) || null
  }
  if (summary.gramps_id) {
    return events.find(event => event.gramps_id === summary.gramps_id) || null
  }
  const index = person[`${kind}_ref_index`]
  if (!Number.isInteger(index) || index < 0) return null
  const ref = person.event_ref_list?.[index]?.ref
  return events.find(event => event.handle === ref) || null
}
