import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
function fixture(files, inspect) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-fixture-'))
  try {
    for (const [name, text] of Object.entries(files)) {
      const target = path.join(dir, name)
      fs.mkdirSync(path.dirname(target), {recursive: true})
      fs.writeFileSync(target, text)
    }
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}')
    fs.symlinkSync(
      path.join(root, 'node_modules'),
      path.join(dir, 'node_modules'),
      'dir'
    )
    inspect(dir)
  } finally {
    fs.rmSync(dir, {recursive: true, force: true})
  }
}
function cruise(dir) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(
        root,
        'node_modules/dependency-cruiser/bin/dependency-cruise.mjs'
      ),
      'src',
      '--config',
      path.join(root, '.dependency-cruiser.cjs'),
      '--output-type',
      'json',
    ],
    {cwd: dir, encoding: 'utf8'}
  )
  assert.equal(result.error, undefined)
  assert.ok([0, 1].includes(result.status), result.stderr)
  return JSON.parse(result.stdout).summary.violations
}

test('actual parser detects production->test, component->page and a cycle', () => {
  fixture(
    {
      'src/main.js': "import '../test/helper.js'\nimport './a.js'",
      'test/helper.js': 'export const value = 1',
      'src/components/Button.js': "import '../views/Page.js'",
      'src/views/Page.js': 'export const page = 1',
      'src/a.js': "import './b.js'",
      'src/b.js': "import './a.js'",
    },
    dir => {
      const names = new Set(cruise(dir).map(v => v.rule.name))
      for (const rule of [
        'production-not-tools',
        'components-not-pages',
        'no-cycles',
      ])
        assert.ok(names.has(rule), rule)
    }
  )
})
test('valid page->component->pure helper dependencies are allowed', () => {
  fixture(
    {
      'src/views/Page.js': "import '../components/Button.js'",
      'src/components/Button.js': "import '../pure.js'",
      'src/pure.js': 'export const add = (a, b) => a + b',
    },
    dir => assert.deepEqual(cruise(dir), [])
  )
})
test('real jscpd identifies a substantial copied function', () => {
  const body = Array.from(
    {length: 30},
    (_, i) => `  total += input[${i}] * ${i + 1}`
  ).join('\n')
  const source = `export function calculate(input) {\n  let total = 0\n${body}\n  return total\n}\n`
  fixture({'src/first.js': source, 'src/second.js': source}, dir => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(root, 'node_modules/jscpd/package.json'),
        'utf8'
      )
    )
    const executable =
      typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.jscpd
    const output = path.join(dir, 'report')
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, 'node_modules/jscpd', executable),
        'src',
        '--config',
        path.join(root, '.jscpd.json'),
        '--output',
        output,
      ],
      {cwd: dir, encoding: 'utf8'}
    )
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(
      fs.readFileSync(path.join(output, 'jscpd-report.json'), 'utf8')
    )
    assert.ok(report.duplicates.length > 0)
    assert.ok(report.duplicates[0].fragment.length > 0)
  })
})
