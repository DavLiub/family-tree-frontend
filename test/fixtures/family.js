// Entirely fictional records. Never load exports from a real family tree here.
export const person = {
  _class: 'Person',
  handle: 'synthetic-person',
  gramps_id: 'TEST-I0001',
  gender: 1,
  private: false,
  change: 1700000000,
  primary_name: {
    first_name: 'Alexandria Synthetic',
    surname_list: [{surname: 'Example', primary: true}],
    type: 'Birth Name',
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
  profile: {
    name_given: 'Alexandria Synthetic',
    name_surname: 'Example',
    name_suffix: '',
    sex: 'M',
    birth: {},
    death: {},
    events: [],
    families: [],
  },
  extended: {
    events: [],
    families: [],
    parent_families: [],
    media: [],
    citations: [],
    notes: [],
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
