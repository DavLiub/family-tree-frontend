import test from 'node:test'
import assert from 'node:assert/strict'
import {
  additions,
  cloneKeys,
  layerKeys,
  longNames,
  violationKeys,
} from '../../scripts/guards/policy.mjs'

import {globalKeys} from '../../scripts/guards/globals.mjs'

const root = '/repo'
const clone = (
  file = 'src/b.js',
  fragment = 'function duplicate() { return 42 }'
) => ({
  firstFile: {name: 'src/a.js'},
  secondFile: {name: file},
  fragment,
})
test('basename limit includes extension and Unicode code points', () => {
  assert.deepEqual(
    longNames([
      'test/' + 'a'.repeat(45) + '.js',
      'test/' + 'б'.repeat(46) + '.js',
    ]),
    ['test/' + 'б'.repeat(46) + '.js']
  )
})
test('an old copy cannot authorize a new location or another occurrence', () => {
  const old = cloneKeys({duplicates: [clone()]}, root)
  assert.deepEqual(additions(old, old), [])
  assert.equal(additions([...old, ...old], old).length, 1)
  assert.equal(
    additions(cloneKeys({duplicates: [clone('src/c.js')]}, root), old).length,
    1
  )
  assert.equal(
    additions(
      cloneKeys(
        {duplicates: [clone(undefined, 'function duplicate() { return 43 }')]},
        root
      ),
      old
    ).length,
    1
  )
})
test('legacy copies tolerate line movement but never an empty/malformed report', () => {
  assert.deepEqual(
    cloneKeys(
      {duplicates: [{...clone(), firstFile: {name: 'src/a.js', start: 22}}]},
      root
    ),
    cloneKeys({duplicates: [clone()]}, root)
  )
  assert.throws(() => cloneKeys({}, root))
  assert.throws(() => cloneKeys({duplicates: [clone('src/a.js', '')]}, root))
})
test('model/layout cannot reach API through an innocent looking helper', () => {
  const graph = {
    modules: [
      {
        source: 'src/charts/layout/new.js',
        dependencies: [{resolved: 'src/helper.js'}],
      },
      {source: 'src/helper.js', dependencies: [{resolved: 'src/api.js'}]},
      {source: 'src/api.js', dependencies: []},
    ],
  }
  assert.deepEqual(layerKeys(graph, root).map(JSON.parse), [
    ['src/charts/layout/new.js', 'src/helper.js', 'src/api.js'],
  ])
})
test('a fresh cycle member does not inherit an old cycle waiver', () => {
  const violation = {
    from: 'src/a.js',
    to: 'src/b.js',
    rule: {name: 'no-cycles'},
    cycle: [{name: 'src/a.js'}, {name: 'src/b.js'}],
  }
  const old = violationKeys({summary: {violations: [violation]}}, root)
  const changed = violationKeys(
    {
      summary: {
        violations: [
          {...violation, cycle: [...violation.cycle, {name: 'src/c.js'}]},
        ],
      },
    },
    root
  )
  assert.equal(additions(changed, old).length, 1)
})

test('aggregate d3 hides DOM adapters and is forbidden in pure layers', () => {
  const graph = {
    modules: [
      {
        source: 'src/charts/model/model.js',
        dependencies: [{resolved: 'node_modules/d3/src/index.js'}],
      },
    ],
  }
  assert.equal(layerKeys(graph, root).length, 1)
})
test('each new route to a previously reachable API is reported', () => {
  const graph = {
    modules: [
      {
        source: 'src/charts/layout/model.js',
        dependencies: [{resolved: 'src/old.js'}, {resolved: 'src/new.js'}],
      },
      {source: 'src/old.js', dependencies: [{resolved: 'src/api.js'}]},
      {source: 'src/new.js', dependencies: [{resolved: 'src/api.js'}]},
    ],
  }
  assert.equal(layerKeys(graph, root).length, 2)
})

test('pure layers cannot call browser globals, including globalThis access', () => {
  for (const source of [
    'document.createElement("div")',
    'fetch("/api/people/")',
    'globalThis.fetch("/api/people/")',
    'globalThis["document"].body',
  ])
    assert.ok(globalKeys(source, 'src/charts/model/new.js').length > 0)
  assert.deepEqual(
    globalKeys(
      'const text = "fetch document"; const value = data.document',
      'src/charts/model/new.js'
    ),
    []
  )
})
