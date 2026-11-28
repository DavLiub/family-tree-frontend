import {mdiChevronDown, mdiChevronUp} from '@mdi/js'
import {fireEvent} from '../util.js'

export function updateBranchButtons(
  nodes,
  {branchStates, boxHeight, palette, expandLabel, collapseLabel, loadingLabel}
) {
  const buttons = nodes
    .selectAll('.branch-toggle')
    .data(d => (branchStates && d.person?.handle ? [d] : []))
    .join('g')
    .attr('class', 'branch-toggle')
    .attr('transform', `translate(0,${boxHeight / 2 - 22})`)
    .attr('role', 'button')
    .attr('tabindex', d => (branchStates[d.person.handle]?.available ? 0 : -1))
    .attr('aria-expanded', d =>
      String(!!branchStates[d.person.handle]?.expanded)
    )
    .attr('aria-busy', d => String(!!branchStates[d.person.handle]?.busy))
    .attr('aria-disabled', d =>
      String(
        !branchStates[d.person.handle]?.available ||
          !!branchStates[d.person.handle]?.busy
      )
    )
    .attr('aria-label', d => {
      const state = branchStates[d.person.handle]
      return state?.busy
        ? loadingLabel
        : state?.expanded
        ? collapseLabel
        : expandLabel
    })
    .style('cursor', d =>
      branchStates[d.person.handle]?.available ? 'pointer' : 'default'
    )
    .on('pointerdown mousedown touchstart', event => event.stopPropagation())
    .on('click', activate)
    .on('keydown', function (event, d) {
      if (event.key === 'Enter' || event.key === ' ')
        activate.call(this, event, d)
    })
  function activate(event, d) {
    event.stopPropagation()
    event.preventDefault()
    const state = branchStates[d.person.handle]
    if (state?.available && !state.busy)
      fireEvent(this, 'tree:branch-toggle', {handle: d.person.handle})
  }
  buttons
    .selectAll('rect')
    .data(d => [d])
    .join('rect')
    .attr('x', -22)
    .attr('y', -22)
    .attr('width', 44)
    .attr('height', 44)
    .attr('rx', 12)
    .attr('fill', 'transparent')
  buttons
    .selectAll('path')
    .data(d => [d])
    .join('path')
    .attr('d', d =>
      branchStates[d.person.handle]?.expanded ? mdiChevronUp : mdiChevronDown
    )
    .attr('transform', 'translate(-12,-12)')
    .attr('fill', d =>
      branchStates[d.person.handle]?.available &&
      !branchStates[d.person.handle]?.busy
        ? palette.addButton
        : palette.triangle
    )
    .style('pointer-events', 'none')
}
