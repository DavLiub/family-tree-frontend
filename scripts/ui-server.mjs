import {createServer} from 'node:http'
import {readFile, realpath, stat} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const root = await realpath(fileURLToPath(new URL('../dist/', import.meta.url)))
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
}
// Explicit SPA routes only. Never forward API requests to another server.
const routes = new Set([
  '/',
  '/login',
  '/people',
  '/person/TEST-I0001',
  '/tree',
])

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://127.0.0.1').pathname
    )
    if (pathname.startsWith('/api/')) {
      res.writeHead(503, {'Content-Type': 'application/json'})
      res.end(
        JSON.stringify({
          message: 'No backend: a test fixture must handle this request',
        })
      )
      return
    }
    if (req.method !== 'GET') {
      res.writeHead(405)
      res.end()
      return
    }
    const target = path.resolve(
      root,
      `.${routes.has(pathname) ? '/index.html' : pathname}`
    )
    const actual = await realpath(target)
    if (
      !actual.startsWith(`${root}${path.sep}`) ||
      !(await stat(actual)).isFile()
    ) {
      res.writeHead(404)
      res.end()
      return
    }
    const body = await readFile(actual)
    res.writeHead(200, {
      'Content-Type': types[path.extname(actual)] || 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
}).listen(4173, '127.0.0.1')
