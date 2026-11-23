import {afterEach, expect, it} from 'vitest'
import {render} from 'lit'
import '../../src/components/GrampsjsPerson.js'
import {overviewPerson} from '../fixtures/personOverview.js'

afterEach(() => document.body.replaceChildren())

it('passes original facts and linked records to the existing card sections', async () => {
  const card = document.createElement('grampsjs-person')
  card.appState = {
    i18n: {lang: 'en', strings: {}},
    settings: {},
    permissions: {canViewPrivate: false, canEdit: false, canAdd: false},
    dbInfo: {api: {version: '3.17.0'}},
  }
  card.data = structuredClone(overviewPerson)

  const root = document.createElement('div')
  render(card.render(), root)

  const names = root.querySelector('grampsjs-names')
  const relationships = root.querySelector('grampsjs-relationships')
  const gallery = root.querySelector('grampsjs-gallery')
  const citations = root.querySelector('grampsjs-view-source-citations')
  for (const section of [names, relationships, gallery, citations])
    expect(section).not.toBeNull()

  expect(card.data.profile.birth.date).toBe('about 1900')
  expect(card.data.profile.death.date).toBe('after 1970')
  await names.updateComplete
  await relationships.updateComplete
  await gallery.updateComplete
  await citations.updateComplete
  expect(names.data[1].first_name).toBe('Synthetic Alias')
  expect(relationships.primaryParentFamily.father.gramps_id).toBe('TEST-I0002')
  expect(relationships.families[0].children[0].gramps_id).toBe('TEST-I0005')
  expect(gallery.media[0].gramps_id).toBe('TEST-M0001')
  expect(citations.grampsIds).toEqual(['TEST-C0001'])
})
