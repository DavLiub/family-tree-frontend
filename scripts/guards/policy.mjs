import path from 'node:path'
import {createHash} from 'node:crypto'

export const BASE_REF = '62cb08af3a0665a728b288828856e43df26a74d7'
export const MAX_NAME = 48

export function longNames(files) {
  return files.filter(file => [...path.posix.basename(file)].length > MAX_NAME)
}

// A multiset matters: adding another identical clone in the same file must fail.
export function additions(current, baseline) {
  const available = new Map()
  for (const key of baseline) available.set(key, (available.get(key) || 0) + 1)
  return current.filter(key => {
    const count = available.get(key) || 0
    if (!count) return true
    available.set(key, count - 1)
    return false
  })
}

export function normalize(file, root) {
  const absolute = path.resolve(root, file)
  const marker = path.sep + 'node_modules' + path.sep
  const index = absolute.lastIndexOf(marker)
  if (index >= 0)
    return absolute
      .slice(index + 1)
      .split(path.sep)
      .join('/')
  return path.relative(root, absolute).split(path.sep).join('/')
}

export function violationKeys(report, root) {
  if (!Array.isArray(report.summary?.violations)) {
    throw new Error('Invalid dependency-cruiser report: missing violations')
  }
  return report.summary.violations.map(v =>
    JSON.stringify({
      rule: v.rule.name,
      from: normalize(v.from, root),
      to: normalize(v.to, root),
      // Preserve every cycle member; an extra node must not inherit a waiver.
      cycle: (v.cycle || [])
        .map(item => normalize(item.name || item, root))
        .sort(),
    })
  )
}

const pure = /^src\/charts\/(model|layout)\//
const forbidden =
  /^(src\/(components|views|mixins)\/|src\/(api|appState)\.[jt]s$|node_modules\/(lit(?:-html|-element)?\/|@material\/|d3\/|d3-(selection|transition|zoom)\/)|(?:test|tests|scripts|tools)\/)/

// Follow local intermediaries too: layout -> charts/util -> api is a leak.
export function layerKeys(report, root) {
  if (!Array.isArray(report.modules))
    throw new Error('Missing dependency graph')
  const graph = new Map(
    report.modules.map(m => [
      normalize(m.source, root),
      m.dependencies.map(d => normalize(d.resolved || d.module, root)),
    ])
  )
  const keys = []
  for (const source of graph.keys()) {
    if (!pure.test(source)) continue
    const queue = [[source]]
    let cursor = 0
    while (cursor < queue.length) {
      if (queue.length > 20000)
        throw new Error(
          `Layer graph too complex at ${source}; review dependencies`
        )
      const chain = queue[cursor++]
      for (const target of graph.get(chain.at(-1)) || []) {
        if (chain.includes(target)) continue
        const next = [...chain, target]
        if (forbidden.test(target)) keys.push(JSON.stringify(next))
        else queue.push(next)
      }
    }
  }
  return keys
}

export function cloneKeys(report, root) {
  if (!Array.isArray(report.duplicates))
    throw new Error('Missing jscpd duplicates')
  return report.duplicates.map(clone => {
    if (typeof clone.fragment !== 'string' || !clone.fragment.trim()) {
      throw new Error('Missing clone fragment; cannot compare legacy content')
    }
    const files = [clone.firstFile?.name, clone.secondFile?.name]
    if (files.some(file => typeof file !== 'string'))
      throw new Error('Invalid clone paths')
    // Preserve literals and whitespace inside them; only normalize CRLF.
    const hash = createHash('sha256')
      .update(clone.fragment.replace(/\r\n/g, '\n'))
      .digest('hex')
    return JSON.stringify({
      files: files.map(file => normalize(file, root)).sort(),
      hash,
    })
  })
}
