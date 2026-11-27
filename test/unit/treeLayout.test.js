import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {
  layoutAncestors as ancestors,
  layoutDescendants as descendants,
  layoutHourglass as hourglass,
} from '../../src/charts/layout/treeLayout.js'

// Fix geometry for the algorithm examples; product card dimensions can change.
const withGeometry = layout => (graph, root, options) =>
  layout(graph, root, {boxWidth: 250, boxHeight: 104, ...options})
const layoutAncestors = withGeometry(ancestors)
const layoutDescendants = withGeometry(descendants)
const layoutHourglass = withGeometry(hourglass)

const childRef = ref => ({ref, frel: 'Birth', mrel: 'Birth'})

const family = (handle, father, mother, children) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(childRef),
})

const person = (handle, {parentFamily = {}, families = []} = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  profile: {gramps_id: `I_${handle}`, sex: 'U'},
  extended: {primary_parent_family: parentFamily, families},
})

// R has parents F and M, and children K1 and K2 with S. F has parents FF and
// FM, and M only has a mother MM. K1 has a child X who was not fetched.
const fR = family('fR', 'F', 'M', ['R'])
const fF = family('fF', 'FF', 'FM', ['F'])
const fM = family('fM', '', 'MM', ['M'])
const fK = family('fK', 'R', 'S', ['K1', 'K2'])
const fX = family('fX', 'K1', '', ['X'])
const graph = new FamilyGraph([
  person('R', {parentFamily: fR, families: [fK]}),
  person('F', {parentFamily: fF, families: [fR]}),
  person('M', {parentFamily: fM, families: [fR]}),
  person('FF', {families: [fF]}),
  person('FM', {families: [fF]}),
  person('MM', {families: [fM]}),
  person('S', {families: [fK]}),
  person('K1', {parentFamily: fK, families: [fX]}),
  person('K2', {parentFamily: fK}),
])

const positions = layout =>
  layout.nodes.map(({key, handle, generation, x, y}) => ({
    key,
    handle,
    generation,
    x,
    y,
  }))

const linkKeys = layout =>
  layout.links.map(({source, target}) => [source.key, target.key])

describe('layoutAncestors', () => {
  const layout = layoutAncestors(graph, 'R', {depth: 3})

  it('places generations in columns to the right of the root person', () => {
    expect(positions(layout)).toEqual([
      {key: 'p', handle: 'R', generation: 0, x: 0, y: 0},
      {key: 'pf', handle: 'F', generation: 1, x: 280, y: -81.75},
      {key: 'pm', handle: 'M', generation: 1, x: 280, y: 81.75},
      {key: 'pff', handle: 'FF', generation: 2, x: 560, y: -136.25},
      {key: 'pfm', handle: 'FM', generation: 2, x: 560, y: -27.25},
      {key: 'pmm', handle: 'MM', generation: 2, x: 560, y: 81.75},
    ])
  })

  it('links children to their parents', () => {
    expect(linkKeys(layout)).toEqual([
      ['p', 'pf'],
      ['p', 'pm'],
      ['pf', 'pff'],
      ['pf', 'pfm'],
      ['pm', 'pmm'],
    ])
  })

  it('includes the boxes and horizontal padding in the bounds', () => {
    expect(layout.bounds).toEqual({
      xMin: -145,
      xMax: 705,
      yMin: -188.25,
      yMax: 133.75,
    })
  })

  it('keeps the person objects', () => {
    expect(layout.nodes[1].person).toBe(graph.person('F'))
  })

  it('shows the root person for depth 0', () => {
    expect(positions(layoutAncestors(graph, 'R', {depth: 0}))).toEqual([
      {key: 'p', handle: 'R', generation: 0, x: 0, y: 0},
    ])
  })
})

describe('layoutDescendants', () => {
  const layout = layoutDescendants(graph, 'R', {depth: 3, gapX: 60})

  it('places generations in columns to the left of the root person', () => {
    expect(positions(layout)).toEqual([
      {key: 'p', handle: 'R', generation: 0, x: 0, y: 0},
      {key: 'pc0', handle: 'K1', generation: -1, x: -310, y: -54.5},
      {key: 'pc1', handle: 'K2', generation: -1, x: -310, y: 54.5},
      {key: 'pc0c0', handle: undefined, generation: -2, x: -620, y: -54.5},
    ])
  })

  it('places the root person exactly at the origin', () => {
    expect(layout.nodes[0].x).toBe(0)
    expect(layout.nodes[0].generation).toBe(0)
  })

  it('keeps a child that was not fetched as an empty person', () => {
    expect(layout.nodes[3].person).toEqual({})
  })

  it('includes the boxes and horizontal padding in the bounds', () => {
    expect(layout.bounds).toEqual({
      xMin: -765,
      xMax: 145,
      yMin: -106.5,
      yMax: 106.5,
    })
  })
})

describe('layoutHourglass', () => {
  const layout = layoutHourglass(graph, 'R', {
    ancestorDepth: 2,
    descendantDepth: 2,
    gapX: 60,
  })

  it('places ancestors to the right and descendants to the left', () => {
    expect(positions(layout)).toEqual([
      {key: 'p', handle: 'R', generation: 0, x: 0, y: 0},
      {key: 'pf', handle: 'F', generation: 1, x: 310, y: -54.5},
      {key: 'pm', handle: 'M', generation: 1, x: 310, y: 54.5},
      {key: 'pc0', handle: 'K1', generation: -1, x: -310, y: -54.5},
      {key: 'pc1', handle: 'K2', generation: -1, x: -310, y: 54.5},
    ])
  })

  it('shares one root person node between both halves', () => {
    expect(linkKeys(layout)).toEqual([
      ['p', 'pf'],
      ['p', 'pm'],
      ['p', 'pc0'],
      ['p', 'pc1'],
    ])
    expect(layout.links.every(l => l.source === layout.nodes[0])).toBe(true)
  })

  it('includes both halves in the bounds', () => {
    expect(layout.bounds).toEqual({
      xMin: -455,
      xMax: 455,
      yMin: -106.5,
      yMax: 106.5,
    })
  })

  it('keeps the root person when the ancestor depth is 0', () => {
    const shallow = layoutHourglass(graph, 'R', {
      ancestorDepth: 0,
      descendantDepth: 2,
    })
    expect(positions(shallow)).toEqual([
      {key: 'p', handle: 'R', generation: 0, x: 0, y: 0},
      {key: 'pc0', handle: 'K1', generation: -1, x: -280, y: -54.5},
      {key: 'pc1', handle: 'K2', generation: -1, x: -280, y: 54.5},
    ])
    expect(shallow.links.every(l => l.source === shallow.nodes[0])).toBe(true)
  })
})
