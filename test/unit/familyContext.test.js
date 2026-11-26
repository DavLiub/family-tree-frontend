import {describe, expect, it} from 'vitest'
import {familyContextChanges} from '../../src/components/familyContext.js'

const family = () => ({
  handle: 'synthetic-family',
  father_handle: 'synthetic-father',
  mother_handle: 'synthetic-mother',
  type: 'Married',
  child_ref_list: [
    {
      ref: 'synthetic-child',
      frel: 'Birth',
      mrel: 'Adopted',
      note_list: ['note-a'],
    },
    {ref: 'synthetic-sibling', frel: 'Birth', mrel: 'Birth'},
  ],
})
const draft = initial => ({
  father_handle: initial.father_handle,
  mother_handle: initial.mother_handle,
  type: initial.type,
  frel: initial.child_ref_list[0].frel,
  mrel: initial.child_ref_list[0].mrel,
})

describe('contextual family changes', () => {
  it('preserves fresh children and hidden fields while editing one child relationship', () => {
    const initial = family()
    const fresh = family()
    fresh.child_ref_list[0].citation_list = ['new-citation']
    fresh.child_ref_list.push({
      ref: 'new-sibling',
      frel: 'Foster',
      mrel: 'Birth',
    })
    const changes = familyContextChanges(
      fresh,
      initial,
      {...draft(initial), frel: 'Foster'},
      'synthetic-child',
      false
    )
    expect(changes.child_ref_list).toEqual([
      {...fresh.child_ref_list[0], frel: 'Foster'},
      ...fresh.child_ref_list.slice(1),
    ])
    expect(fresh.child_ref_list[0].frel).toBe('Birth')
    expect(changes).not.toHaveProperty('father_handle')
  })

  it('disconnects only the selected child and preserves siblings', () => {
    const initial = family()
    const changes = familyContextChanges(
      initial,
      initial,
      {},
      'synthetic-child',
      true
    )
    expect(changes).toEqual({child_ref_list: [initial.child_ref_list[1]]})
  })

  it('disconnects one partner without deleting people or family events', () => {
    const initial = family()
    expect(
      familyContextChanges(initial, initial, {}, 'synthetic-father', true)
    ).toEqual({father_handle: ''})
  })

  it('rejects detaching a parent position reassigned since the editor opened', () => {
    const initial = family()
    expect(() =>
      familyContextChanges(
        {...initial, father_handle: 'different-parent'},
        initial,
        {},
        'synthetic-father',
        true
      )
    ).toThrow('The family relationship has changed')
  })

  it('does not overwrite an unrelated parent change when only the relationship type is edited', () => {
    const initial = family()
    const fresh = {...family(), father_handle: 'new-father'}
    expect(
      familyContextChanges(
        fresh,
        initial,
        {...draft(initial), type: 'Unmarried'},
        '',
        false
      )
    ).toEqual({type: 'Unmarried'})
  })

  it('rejects conflicting edits to the same child relationship', () => {
    const initial = family()
    const fresh = family()
    fresh.child_ref_list[0].frel = 'Stepchild'
    expect(() =>
      familyContextChanges(
        fresh,
        initial,
        {...draft(initial), frel: 'Foster'},
        'synthetic-child',
        false
      )
    ).toThrow('The family relationship has changed')
  })

  it('prevents the same person occupying both parent positions', () => {
    const initial = family()
    expect(() =>
      familyContextChanges(
        initial,
        initial,
        {...draft(initial), mother_handle: initial.father_handle},
        '',
        false
      )
    ).toThrow('Select different people')
  })

  it('prevents putting an existing child in a parent position', () => {
    const initial = family()
    expect(() =>
      familyContextChanges(
        initial,
        initial,
        {...draft(initial), father_handle: 'synthetic-child'},
        '',
        false
      )
    ).toThrow('both a parent and a child')
  })

  it('keeps a custom relationship type unchanged when editing another field', () => {
    const initial = {...family(), type: {string: 'Custom relationship'}}
    expect(
      familyContextChanges(
        initial,
        initial,
        {
          ...draft(initial),
          type: 'Custom relationship',
          mother_handle: 'replacement',
        },
        '',
        false
      )
    ).toEqual({mother_handle: 'replacement'})
  })
})
