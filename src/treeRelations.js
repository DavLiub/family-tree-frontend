// The server resolves the most direct relationship using the complete tree.
// Limit requests so a large visible tree does not flood the API.
export async function loadTreeRelations(people, root, apiGet, lang, cache) {
  const targets = [...new Set(people.map(p => p.handle))].filter(
    h => h && h !== root
  )
  const result = {}
  let next = 0
  async function worker() {
    while (next < targets.length) {
      const handle = targets[next++]
      const key = JSON.stringify([lang, root, handle])
      if (!cache.has(key)) {
        const url = `/api/relations/${encodeURIComponent(
          root
        )}/${encodeURIComponent(handle)}?depth=20&locale=${encodeURIComponent(
          lang
        )}`
        cache.set(
          key,
          Promise.resolve()
            .then(() => apiGet(url))
            .then(response => {
              if (response?.error) throw new Error('Relationship unavailable')
              return response?.data?.relationship_string || ''
            })
            .catch(() => {
              cache.delete(key)
              return ''
            })
        )
      }
      result[handle] = await cache.get(key)
    }
  }
  await Promise.all(Array.from({length: Math.min(4, targets.length)}, worker))
  return result
}
