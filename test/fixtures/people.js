// Synthetic people only; deliberately includes homonyms and missing dates.
export const people = Array.from({length: 48}, (_, index) => ({
  gramps_id: `TEST-I${String(index + 1).padStart(4, '0')}`,
  handle: index === 0 ? 'synthetic-person' : `synthetic-list-person-${index}`,
  change: 1700000000 - index,
  profile: {
    name_given:
      index < 2
        ? 'Alexandria Synthetic'
        : index === 2
        ? 'Synthetic Extremely Long Given Name With Several Additional Words'
        : `Synthetic Relative ${index + 1}`,
    name_surname: 'Example',
    birth: {date: index === 0 ? 'about 1900' : 'before 1890'},
    death: {date: index === 0 ? 'after 1970' : 'during the winter'},
  },
}))

people[people.length - 1].profile = {birth: {}, death: {}}
