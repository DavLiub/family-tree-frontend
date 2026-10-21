import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {modelGlobals} from './globals.mjs'
import {
  BASE_REF,
  longNames,
  additions,
  violationKeys,
  layerKeys,
  cloneKeys,
} from './policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
function run(command, args, cwd = root, allowed = [0]) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120000,
  })
  if (result.error || !allowed.includes(result.status)) {
    throw new Error(
      `${command} failed (${result.status}): ${
        result.error || result.stderr || result.stdout
      }`
    )
  }
  return result.stdout
}
function bin(pkg, command) {
  const dir = path.join(root, 'node_modules', pkg)
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
  )
  return path.join(
    dir,
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin[command]
  )
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'family-guards-'))
const artifactDir = path.join(root, 'artifacts', 'guards')
fs.mkdirSync(artifactDir, {recursive: true})
try {
  const files = run('git', [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ])
    .split('\0')
    .filter(Boolean)
  const names = longNames(files)
  const base = path.join(temp, 'baseline')
  fs.mkdirSync(base)
  const baseFiles = run('git', ['ls-tree', '-r', '--name-only', BASE_REF])
    .trim()
    .split('\n')
  for (const file of baseFiles.filter(
    file =>
      file.startsWith('src/') ||
      ['package.json', 'tsconfig.json'].includes(file)
  )) {
    const target = path.resolve(base, file)
    if (!target.startsWith(base + path.sep))
      throw new Error('Unsafe baseline path')
    fs.mkdirSync(path.dirname(target), {recursive: true})
    fs.writeFileSync(target, run('git', ['show', `${BASE_REF}:${file}`]))
  }
  fs.symlinkSync(
    path.join(root, 'node_modules'),
    path.join(base, 'node_modules'),
    'dir'
  )
  const cruise = bin('dependency-cruiser', 'depcruise')
  const jscpd = bin('jscpd', 'jscpd')
  function scan(cwd, label) {
    // The JSON reporter exits 0 even for rule violations; CLI errors must fail.
    const graph = JSON.parse(
      run(
        process.execPath,
        [
          cruise,
          'src',
          '--config',
          path.join(root, '.dependency-cruiser.cjs'),
          '--output-type',
          'json',
        ],
        cwd
      )
    )
    const output = path.join(temp, label)
    run(
      process.execPath,
      [
        jscpd,
        'src',
        '--config',
        path.join(root, '.jscpd.json'),
        '--output',
        output,
      ],
      cwd
    )
    const clones = JSON.parse(
      fs.readFileSync(path.join(output, 'jscpd-report.json'), 'utf8')
    )
    return {
      dependencies: violationKeys(graph, cwd),
      layers: layerKeys(graph, cwd),
      globals: modelGlobals(cwd),
      clones: cloneKeys(clones, cwd),
    }
  }
  const baseline = scan(base, 'baseline-clones')
  const current = scan(root, 'current-clones')
  const failures = {names}
  for (const key of Object.keys(current))
    failures[key] = additions(current[key], baseline[key])
  fs.writeFileSync(
    path.join(artifactDir, 'baseline.json'),
    JSON.stringify({ref: BASE_REF, ...baseline}, null, 2)
  )
  fs.writeFileSync(
    path.join(artifactDir, 'current.json'),
    JSON.stringify(current, null, 2)
  )
  fs.writeFileSync(
    path.join(artifactDir, 'failures.json'),
    JSON.stringify(failures, null, 2)
  )
  for (const [key, values] of Object.entries(failures)) {
    console.log(`${key}: ${values.length} new violations`)
    for (const value of values) console.error(value)
  }
  if (Object.values(failures).some(values => values.length))
    process.exitCode = 1
} finally {
  fs.rmSync(temp, {recursive: true, force: true})
}
