import {person} from './family.js'

const parentFamily = {
  _class: 'Family',
  handle: 'synthetic-parent-family',
  gramps_id: 'TEST-F0001',
  child_ref_list: [],
}

const partnerFamily = {
  _class: 'Family',
  handle: 'synthetic-partner-family',
  gramps_id: 'TEST-F0002',
  child_ref_list: [{ref: 'synthetic-child', frel: 'Birth', mrel: 'Birth'}],
}

export const overviewPerson = {
  ...structuredClone(person),
  alternate_names: [
    {
      type: 'Also Known As',
      first_name: 'Synthetic Alias',
      surname_list: [{surname: 'Example'}],
    },
  ],
  family_list: [partnerFamily.handle],
  parent_family_list: [parentFamily.handle],
  citation_list: ['synthetic-citation'],
  media_list: [{ref: 'synthetic-media'}],
  profile: {
    ...structuredClone(person.profile),
    birth: {
      date: 'about 1900',
      place: 'synthetic-birth-place',
      place_name: 'Synthetic Birth Town',
    },
    death: {
      date: 'after 1970',
      place: 'synthetic-death-place',
      place_name: 'Synthetic Cemetery',
    },
    primary_parent_family: {
      ...parentFamily,
      father: {
        gramps_id: 'TEST-I0002',
        name_given: 'Synthetic Father',
        name_surname: 'Example',
        sex: 'M',
        birth: {date: 'before 1880'},
      },
      mother: {
        gramps_id: 'TEST-I0003',
        name_given: 'Synthetic Mother',
        name_surname: 'Example',
        sex: 'F',
        birth: {date: 'during 1882'},
      },
    },
    families: [
      {
        ...partnerFamily,
        father: {
          gramps_id: 'TEST-I0001',
          name_given: 'Alexandria Synthetic',
          name_surname: 'Example',
          sex: 'M',
        },
        mother: {
          gramps_id: 'TEST-I0004',
          name_given: 'Synthetic Partner',
          name_surname: 'Example',
          sex: 'F',
        },
        children: [
          {
            gramps_id: 'TEST-I0005',
            name_given: 'Synthetic Child',
            name_surname: 'Example',
            sex: 'U',
            birth: {date: 'about 1930'},
          },
        ],
      },
    ],
  },
  extended: {
    ...structuredClone(person.extended),
    families: [partnerFamily],
    parent_families: [parentFamily],
    citations: [{handle: 'synthetic-citation', gramps_id: 'TEST-C0001'}],
    media: [
      {
        _class: 'Media',
        handle: 'synthetic-media',
        gramps_id: 'TEST-M0001',
        mime: 'application/octet-stream',
        checksum: 'synthetic-checksum',
      },
    ],
  },
}

export const overviewCitation = {
  _class: 'Citation',
  handle: 'synthetic-citation',
  gramps_id: 'TEST-C0001',
  page: 'synthetic page 1',
  profile: {source: {title: 'Synthetic Source for Birth'}},
}

export const overviewFamilies = {
  'TEST-F0001': {
    ...parentFamily,
    extended: {
      father: {handle: 'synthetic-father', mime: 'application/octet-stream'},
      mother: {handle: 'synthetic-mother', mime: 'application/octet-stream'},
      children: [],
    },
  },
  'TEST-F0002': {
    ...partnerFamily,
    extended: {
      father: {handle: 'synthetic-person', mime: 'application/octet-stream'},
      mother: {handle: 'synthetic-partner', mime: 'application/octet-stream'},
      children: [{handle: 'synthetic-child', mime: 'application/octet-stream'}],
    },
  },
}
