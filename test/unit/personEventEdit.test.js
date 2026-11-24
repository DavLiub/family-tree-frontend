import {describe, expect, it} from 'vitest'
import {getSummaryEvent} from '../../src/components/personEventEdit.js'

describe('summary event identity', () => {
  const first = {handle: 'event-first', gramps_id: 'TEST-E1'}
  const second = {handle: 'event-second', gramps_id: 'TEST-E2'}
  const person = {
    profile: {death: {date: '1900'}},
    extended: {events: [first, second]},
    event_ref_list: [{ref: first.handle}, {ref: second.handle}],
    death_ref_index: 1,
  }

  it('edits the referenced event instead of selecting the first candidate', () => {
    expect(getSummaryEvent(person, 'death')).toBe(second)
  })

  it('uses an explicit profile identity ahead of index', () => {
    expect(
      getSummaryEvent(
        {
          ...person,
          profile: {death: {handle: first.handle}},
        },
        'death'
      )
    ).toBe(first)
  })

  it('does not guess for inferred summaries or unresolved identity', () => {
    expect(
      getSummaryEvent({...person, death_ref_index: -1}, 'death')
    ).toBeNull()
    expect(
      getSummaryEvent(
        {
          ...person,
          profile: {death: {handle: 'not-loaded'}},
        },
        'death'
      )
    ).toBeNull()
  })

  it('does not offer an editor for an absent summary', () => {
    expect(getSummaryEvent({...person, profile: {}}, 'death')).toBeNull()
  })
})
