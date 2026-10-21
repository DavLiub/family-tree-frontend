import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import ts from 'typescript'

const browser = new Set([
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'navigator',
])

// Conservative policy: these browser names are not part of a pure layer's API.
export function globalKeys(source, file) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const keys = []
  function visit(node) {
    let name
    if (ts.isIdentifier(node) && browser.has(node.text)) {
      if (
        !ts.isPropertyAccessExpression(node.parent) ||
        node.parent.expression === node
      )
        name = node.text
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(tree) === 'globalThis' &&
      browser.has(node.name.text)
    )
      name = node.name.text
    if (
      ts.isElementAccessExpression(node) &&
      node.expression.getText(tree) === 'globalThis' &&
      ts.isStringLiteral(node.argumentExpression) &&
      browser.has(node.argumentExpression.text)
    )
      name = node.argumentExpression.text
    if (name) {
      let context = node.parent
      if (ts.isPropertyAccessExpression(context)) context = context.parent
      const hash = createHash('sha256')
        .update(context.getText(tree))
        .digest('hex')
      keys.push(JSON.stringify({file, name, hash}))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return keys
}

export function modelGlobals(root) {
  const keys = []
  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
      const target = path.join(dir, item.name)
      if (item.isDirectory()) walk(target)
      else if (/\.[jt]s$/.test(item.name))
        keys.push(
          ...globalKeys(
            fs.readFileSync(target, 'utf8'),
            path.relative(root, target).split(path.sep).join('/')
          )
        )
    }
  }
  for (const layer of ['model', 'layout'])
    walk(path.join(root, 'src/charts', layer))
  return keys
}
