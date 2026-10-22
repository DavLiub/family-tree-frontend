// Entirely fictional records. Never load exports from a real family tree here.
export const person = {
  _class: 'Person',
  handle: 'synthetic-person',
  gramps_id: 'TEST-I0001',
  gender: 1,
  private: false,
  change: 1700000000,
  primary_name: {
    _class: 'Name',
    first_name: 'Alexandria Synthetic',
    surname_list: [{surname: 'Example', primary: true}],
    type: 'Birth Name',
    citation_list: ['synthetic-name-citation'],
    note_list: ['synthetic-name-note'],
    date: {
      _class: 'Date',
      calendar: 0,
      modifier: 0,
      quality: 0,
      dateval: [1, 1, 1900, false],
      sortval: 0,
      text: '',
    },
  },
  alternate_names: [
    {
      type: 'Also Known As',
      first_name: 'Alex',
      surname_list: [{surname: 'Example'}],
    },
  ],
  event_ref_list: [],
  family_list: [],
  parent_family_list: [],
  media_list: [],
  citation_list: [],
  note_list: [],
  attribute_list: [],
  address_list: [],
  urls: [],
  tag_list: [],
  person_ref_list: [],
  // profile=all&backlinks=true exposes both summaries and extended records.
  // The object view inspects this top-level map even when References is hidden.
  backlinks: {},
  profile: {
    name_given: 'Alexandria Synthetic',
    name_surname: 'Example',
    name_suffix: '',
    sex: 'M',
    birth: {},
    death: {},
    events: [],
    families: [],
    references: {},
  },
  extended: {
    events: [],
    families: [],
    parent_families: [],
    media: [],
    citations: [],
    notes: [],
    tags: [],
    backlinks: {},
  },
}

// Unsigned JWT used only by the isolated client: no actual credentials.
export function token(tree = 'synthetic-tree') {
  const encode = value => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({alg: 'none'})}.${encode({
    exp: Math.floor(Date.now() / 1000) + 3600,
    tree,
    permissions: ['AddObject', 'EditObject'],
    sub: 'synthetic-user',
    fresh: true,
  })}.synthetic`
}
