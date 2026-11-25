import {getImageUrl} from '../../src/charts/util.js'
import {describe, expect, it, vi} from 'vitest'
import {
  loadPersonPhotos,
  setPrimaryPersonPhoto,
} from '../../src/components/personPhoto.js'

function state(record) {
  return {
    permissions: {canEdit: true, canAdd: true},
    apiGet: vi.fn(async () => ({data: structuredClone(record)})),
    apiPut: vi.fn(async () => ({data: []})),
  }
}

const person = {
  handle: 'synthetic-person',
  private: true,
  primary_name: {first_name: 'Synthetic', note_list: ['name-note']},
  media_list: [
    {ref: 'first', rect: [1, 2, 80, 90]},
    {ref: 'second', private: true, rect: [4, 5, 60, 70]},
    {ref: 'document'},
  ],
  note_list: ['person-note'],
  extended: {
    media: [
      {handle: 'first', mime: 'image/jpeg'},
      {handle: 'second', mime: 'image/png'},
      {handle: 'document', mime: 'application/pdf'},
      {handle: 'foreign', mime: 'image/jpeg'},
    ],
  },
}

describe('person photo selection', () => {
  it('uses an image rather than a document thumbnail in the reserved photo area', () => {
    expect(
      getImageUrl(
        {...person, media_list: [{ref: 'document'}, {ref: 'first'}]},
        100
      )
    ).toContain('first')
    expect(getImageUrl({...person, media_list: [{ref: 'document'}]}, 100)).toBe(
      ''
    )
  })

  it('offers only images actually attached to this person', async () => {
    const result = await loadPersonPhotos(state(person), person.handle)
    expect(result.photos.map(item => item.record.handle)).toEqual([
      'first',
      'second',
    ])
  })

  it('changes only media ordering, preserving crop, privacy, names and notes', async () => {
    const appState = state(person)
    await setPrimaryPersonPhoto(appState, person.handle, 'second')
    const [url, saved] = appState.apiPut.mock.calls[0]
    expect(url).toBe('/api/people/synthetic-person')
    expect(saved.media_list).toEqual([
      person.media_list[1],
      person.media_list[0],
      person.media_list[2],
    ])
    expect(saved.primary_name).toEqual(person.primary_name)
    expect(saved.note_list).toEqual(person.note_list)
    expect(saved.private).toBe(true)
    expect(saved.extended).toBeUndefined()
  })

  it('does not reattach an existing photo removed while the chooser was open', async () => {
    const appState = state({...person, media_list: []})
    await expect(
      setPrimaryPersonPhoto(appState, person.handle, 'second')
    ).rejects.toThrow('no longer attached')
    expect(appState.apiPut).not.toHaveBeenCalled()
  })

  it('attaches a newly uploaded photo once and makes it primary', async () => {
    const appState = state(person)
    await setPrimaryPersonPhoto(appState, person.handle, 'uploaded', {
      existing: false,
    })
    expect(appState.apiPut.mock.calls[0][1].media_list).toEqual([
      {_class: 'MediaRef', ref: 'uploaded'},
      ...person.media_list,
    ])
    await setPrimaryPersonPhoto(appState, person.handle, 'first', {
      existing: false,
    })
    expect(appState.apiPut.mock.calls[1][1].media_list).toHaveLength(3)
  })

  it('does not write for a reader', async () => {
    const appState = state(person)
    appState.permissions.canEdit = false
    await expect(
      setPrimaryPersonPhoto(appState, person.handle, 'first')
    ).rejects.toThrow('not allowed')
    expect(appState.apiPut).not.toHaveBeenCalled()
  })
})
