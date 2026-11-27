import {describe, it, expect} from 'vitest'
import {personAge} from '../../src/personAge.js'

const today = new Date(2026, 10, 27)
const person = (birth, death) => ({
  profile: {birth: {date: birth}, death: death ? {date: death} : {}},
})

describe('completed person age', () => {
  it.each([
    ['1990-11-26', 36],
    ['1990-11-27', 36],
    ['1990-11-28', 35],
    ['2026-11-27', 0],
    ['2026-11-28', null],
    ['1990', null],
    ['about 1990-11-27', null],
    ['1990-02-30', null],
    ['', null],
  ])('calculates age from %s to today', (birth, age) => {
    expect(personAge(person(birth), today)).toBe(age)
  })

  it('stops at death, including the birthday boundary', () => {
    expect(personAge(person('1990-11-27', '2020-11-26'), today)).toBe(29)
    expect(personAge(person('1990-11-27', '2020-11-27'), today)).toBe(30)
    expect(personAge(person('1990-11-27', '1980-01-01'), today)).toBeNull()
    expect(personAge(person('1990-11-27', '2030-01-01'), today)).toBeNull()
  })

  it('does not treat an undated death or a partial death as living', () => {
    const data = person('1990-11-27')
    data.death_ref_index = 0
    expect(personAge(data, today)).toBeNull()
    expect(personAge(person('1990-11-27', '2020'), today)).toBeNull()
  })

  it('uses referenced native dates rather than positions or stale profile ages', () => {
    const data = person('1990-11-27')
    data.birth_ref_index = 0
    data.death_ref_index = 1
    data.event_ref_list = [{ref: 'birth'}, {ref: 'death'}]
    const date = (year, month, day) => ({
      dateval: [day, month, year, false],
      calendar: 0,
      modifier: 0,
      quality: 0,
    })
    data.extended = {
      events: [
        {handle: 'death', date: date(2020, 11, 26)},
        {handle: 'birth', date: date(1990, 11, 27)},
      ],
    }
    expect(personAge(data, today)).toBe(29)
    data.extended.events[1].date.modifier = 1
    expect(personAge(data, today)).toBeNull()
    data.extended.events[1].date.modifier = 0
    data.extended.events[1].date.calendar = 1
    expect(personAge(data, today)).toBeNull()
  })

  it('handles leap birthdays as completed calendar years', () => {
    expect(personAge(person('2000-02-29'), new Date(2025, 1, 28))).toBe(24)
    expect(personAge(person('2000-02-29'), new Date(2025, 2, 1))).toBe(25)
    expect(personAge(person('2000-02-29'), new Date(2024, 1, 29))).toBe(24)
  })
})
