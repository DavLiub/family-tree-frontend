import {describe, expect, it} from 'vitest'
import {
  getNameKind,
  getNameParts,
  getPersonNameDisplay,
  updateNameParts,
} from '../../src/components/nameHistory.js'

const name = (
  given,
  surname,
  type = 'Name change',
  patronymic = 'Исааковна'
) => ({
  _class: 'Name',
  first_name: given,
  type,
  surname_list: [
    {_class: 'Surname', surname, primary: true, prefix: '', connector: ''},
    ...(patronymic
      ? [
          {
            _class: 'Surname',
            surname: patronymic,
            origintype: 'Patronymic',
            primary: false,
          },
        ]
      : []),
  ],
})

describe('selected name and birth name display', () => {
  const birth = name('Анна', 'Левина', 'Birth Name')
  it('shows the selected surname and birth surname, omitting an intermediate marriage', () => {
    const person = {
      primary_name: name('Анна', 'Смирнова', 'Married Name'),
      alternate_names: [birth, name('Анна', 'Коган', 'Married Name')],
    }
    expect(getPersonNameDisplay(person).text).toBe(
      'Анна Исааковна Смирнова (Левина)'
    )
    expect(person.alternate_names).toHaveLength(2)
  })

  it.each([
    [
      name('Мария', 'Смирнова'),
      'Мария Исааковна Смирнова (При рождении: Анна Левина)',
    ],
    [name('Мария', 'Левина'), 'Мария Исааковна Левина (При рождении: Анна)'],
    [
      name('Анна', 'Левина', 'Name change', 'Петровна'),
      'Анна Петровна Левина (При рождении: Исааковна)',
    ],
    [birth, 'Анна Исааковна Левина'],
  ])('includes only changed birth components', (selected, expected) => {
    expect(
      getPersonNameDisplay(
        {primary_name: selected, alternate_names: [birth]},
        () => 'При рождении'
      ).text
    ).toBe(expected)
  })

  it('does not infer a birth name or select the last marriage by array order', () => {
    const selected = name('Анна', 'Смирнова', 'Married Name')
    const person = {
      primary_name: selected,
      alternate_names: [name('Анна', 'Коган', 'Married Name')],
    }
    expect(getPersonNameDisplay(person).text).toBe('Анна Исааковна Смирнова')
    expect(
      getPersonNameDisplay({
        ...person,
        alternate_names: [birth, name('Анна', 'Другая', 'Birth Name')],
      })
    ).toMatchObject({
      birth: '',
      ambiguousBirth: true,
    })
  })

  it('uses profile-only records without pretending to know name history', () => {
    expect(
      getPersonNameDisplay({
        profile: {name_given: 'Synthetic', name_surname: 'Example'},
      }).text
    ).toBe('Synthetic Example')
  })
})

describe('native name edits', () => {
  it('preserves hidden fields, surname metadata and unedited patronymic parts', () => {
    const original = {
      ...name('Synthetic Given', 'Example', 'Synthetic custom type'),
      citation_list: ['synthetic-citation'],
      note_list: ['synthetic-note'],
      date: {text: 'Synthetic date'},
      private: true,
      custom_future_field: 'keep',
    }
    original.surname_list[0].prefix = 'van'
    original.surname_list[0].custom_future_field = 'keep surname'
    const before = structuredClone(original)
    const changed = updateNameParts(original, {given: 'Changed given'})
    expect(changed).toEqual({...before, first_name: 'Changed given'})
    expect(original).toEqual(before)
    const parts = getNameParts(original)
    parts.surnames[0].surname = 'Revised'
    const revised = updateNameParts(original, {surnames: parts.surnames})
    expect(revised.surname_list[0]).toEqual({
      ...before.surname_list[0],
      surname: 'Revised',
    })
    expect(revised.surname_list[1]).toEqual(before.surname_list[1])
  })

  it('does not split an existing combined given name and stores an explicit patronymic natively', () => {
    const original = name('Анна Исааковна', 'Левина', 'Birth Name', '')
    expect(getNameParts(original).given).toBe('Анна Исааковна')
    const updated = updateNameParts(original, {
      given: 'Анна',
      patronymic: 'Исааковна',
    })
    expect(updated.first_name).toBe('Анна')
    expect(updated.surname_list[1]).toMatchObject({
      surname: 'Исааковна',
      origintype: 'Patronymic',
      primary: false,
    })
  })

  it('preserves multiple native patronymic parts until each is edited explicitly', () => {
    const original = name('Synthetic', 'Example')
    original.surname_list.push({
      surname: 'Additional',
      origintype: 'Patronymic',
      custom_field: 'keep',
    })
    expect(updateNameParts(original, {given: 'Revised'}).surname_list).toEqual(
      original.surname_list
    )
    expect(() =>
      updateNameParts(original, {patronymic: 'Combined replacement'})
    ).toThrow('individual patronymic')
    const parts = getNameParts(original).patronymicParts
    parts[1].surname = 'Revised additional'
    const updated = updateNameParts(original, {patronymicParts: parts})
    expect(updated.surname_list[2]).toEqual({
      ...original.surname_list[2],
      surname: 'Revised additional',
    })
  })

  it('distinguishes recorded aliases from an explicitly recorded name change', () => {
    expect(getNameKind({type: 'Also Known As'})).toBe('other')
    expect(getNameKind({type: 'Synthetic legacy custom type'})).toBe('other')
    expect(getNameKind({type: 'Name change'})).toBe('changed')
    expect(getNameKind({type: {string: 'Name change: Synthetic reason'}})).toBe(
      'changed'
    )
  })
})
