import {describe, expect, it} from 'vitest'
import {render} from 'lit'
import {GrampsjsFamily} from '../../src/components/GrampsjsFamily.js'
import {GrampsjsNames} from '../../src/components/GrampsjsNames.js'

function family() {
  const card = new GrampsjsFamily()
  card.appState = {
    permissions: {},
    settings: {},
    i18n: {strings: {'At birth': 'При рождении'}},
  }
  card.data = {
    father_handle: 'synthetic-father',
    mother_handle: 'synthetic-mother',
    profile: {
      father: {
        gramps_id: 'TEST-I1',
        name_given: 'Сергей',
        name_surname: 'Иванов',
      },
      mother: {
        gramps_id: 'TEST-I2',
        name_given: 'Елена',
        name_surname: 'Фёдорова',
      },
    },
    extended: {
      mother: {
        handle: 'synthetic-mother',
        primary_name: {
          first_name: 'Елена',
          type: 'Married Name',
          surname_list: [{surname: 'Фёдорова'}],
        },
        alternate_names: [
          {
            first_name: 'Елена',
            type: 'Birth Name',
            surname_list: [{surname: 'Иванова'}],
          },
        ],
      },
    },
  }
  return card
}

const content = (host, template) => {
  const root = host.createRenderRoot()
  render(template, root, {host})
  return root
}

describe('family names', () => {
  it('uses the same birth-name parentheses in the title and parent link', () => {
    const card = family()
    const root = content(card, card.renderProfile())
    expect(
      root.querySelector('h2').textContent.replace(/\s+/g, ' ').trim()
    ).toBe('Сергей Иванов & Елена Фёдорова (Иванова)')
    expect(root.querySelector('[gramps-id="TEST-I2"]').textContent.trim()).toBe(
      'Елена Фёдорова (Иванова)'
    )
  })

  it('keeps only birth differences and ignores intermediate surnames', () => {
    const card = family()
    card.data.extended.mother.alternate_names.push({
      first_name: 'Елена',
      type: 'Married Name',
      surname_list: [{surname: 'Сидорова'}],
    })
    expect(card._parentName('mother')).toBe('Елена Фёдорова (Иванова)')
    card.data.extended.mother.primary_name.first_name = 'Анна'
    expect(card._parentName('mother')).toBe(
      'Анна Фёдорова (При рождении: Елена Иванова)'
    )
  })

  it('does not invent birth names for profile-only or mismatched parents', () => {
    const card = family()
    card.data.mother_handle = 'another-mother'
    expect(card._parentName('mother')).toBe('Елена Фёдорова')
    card.data.profile.mother = {}
    expect(card._parentName('mother')).toBe('…')
  })
})

it('uses the common action accent for every name creation plus', () => {
  const names = new GrampsjsNames()
  names.appState = {permissions: {canEdit: true}, i18n: {strings: {}}}
  const root = content(names, names._renderCreateActions())
  const icons = [...root.querySelectorAll('grampsjs-icon')]
  expect(icons.length).toBe(2)
  expect(
    icons.every(
      icon => icon.getAttribute('color') === 'var(--mdc-theme-secondary)'
    )
  ).toBe(true)
})
