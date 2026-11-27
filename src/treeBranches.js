import {FamilyGraph} from './charts/model/FamilyGraph.js'

const extend =
  'event_ref_list,primary_parent_family,family_list,media_list,parent_family_list'

// An expansion is a read-only view of all descendant families. Original cards
// remain visible; each open branch contributes only its reachable descendants.
export class TreeBranches {
  constructor(onChange) {
    this.onChange = onChange
    this.epoch = 0
    this.base = []
    this.loaded = new Map()
    this.open = new Set()
    this.closed = new Set()
    this.busy = new Set()
  }

  cancel() {
    this.epoch += 1
    this.busy.clear()
  }

  reset(people) {
    this.cancel()
    this.base = people
    this.loaded.clear()
    this.open.clear()
    this.closed.clear()
    this.busy.clear()
    this.publish()
  }

  snapshot() {
    const records = new Map(this.base.map(p => [p.handle, p]))
    for (const people of this.loaded.values())
      for (const person of people)
        if (!records.has(person.handle)) records.set(person.handle, person)
    const graph = new FamilyGraph([...records.values()])
    const visible = new Set(this.base.map(p => p.handle))
    const visitedSources = new Set()
    let changed = true
    while (changed) {
      changed = false
      for (const root of this.open) {
        if (!visible.has(root) || visitedSources.has(root)) continue
        visitedSources.add(root)
        const visited = new Set()
        const queue = [root]
        for (let i = 0; i < queue.length; i += 1) {
          const handle = queue[i]
          if (visited.has(handle)) continue
          visited.add(handle)
          if (this.closed.has(handle)) continue
          for (const family of graph.partnerFamilies(handle)) {
            for (const partner of [family.father_handle, family.mother_handle])
              if (records.has(partner)) visible.add(partner)
          }
          for (const child of graph.children(handle)) {
            if (!records.has(child)) continue
            visible.add(child)
            queue.push(child)
          }
        }
        changed = true
      }
    }
    const base = new Set(this.base.map(p => p.handle))
    const states = {}
    for (const handle of visible) {
      const children = graph.children(handle)
      states[handle] = {
        available: children.length > 0,
        expanded:
          !this.closed.has(handle) &&
          (this.open.has(handle) ||
            children.some(child => visible.has(child) && !base.has(child))),
        busy: this.busy.has(handle),
      }
    }
    return {
      people: [...visible].map(h => records.get(h)).filter(Boolean),
      states,
    }
  }

  publish() {
    this.onChange(this.snapshot())
  }

  async toggle(handle, apiGet, lang) {
    const state = this.snapshot().states[handle]
    if (!state?.available || state.busy) return
    if (state.expanded) {
      this.open.delete(handle)
      this.closed.add(handle)
      this.publish()
      return
    }
    const epoch = this.epoch
    this.busy.add(handle)
    this.publish()
    try {
      if (!this.loaded.has(handle)) {
        const person = this.snapshot().people.find(p => p.handle === handle)
        const rules = {
          rules: [
            {name: 'IsDescendantFamilyOf', values: [person.gramps_id, '1']},
          ],
        }
        const people = []
        let page = 1
        let more = true
        while (more) {
          const url = `/api/people/?rules=${encodeURIComponent(
            JSON.stringify(rules)
          )}&locale=${encodeURIComponent(
            lang
          )}&profile=self&extend=${extend}&page=${page}&pagesize=100`
          const result = await apiGet(url)
          if (epoch !== this.epoch) return
          if (result?.error || !Array.isArray(result?.data))
            throw new Error(result?.error || 'Unable to load descendants')
          people.push(...result.data)
          const total =
            result.total_count == null ? null : Number(result.total_count)
          more =
            result.data.length > 0 &&
            (Number.isFinite(total)
              ? people.length < total
              : result.data.length === 100)
          page += 1
        }
        this.loaded.set(handle, people)
      }
      this.closed.delete(handle)
      this.open.add(handle)
    } catch (error) {
      if (epoch === this.epoch) throw error
    } finally {
      if (epoch === this.epoch) {
        this.busy.delete(handle)
        this.publish()
      }
    }
  }
}
