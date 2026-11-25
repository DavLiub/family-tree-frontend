import {mdiPencil} from '@mdi/js'
import {fireEvent} from '../util.js'

// This action is independent of the chart's relationship editing mode.
export function updatePhotoButtons(
  nodes,
  {canEditPhoto, handle, boxWidth, boxHeight, photoLabel, editLabel, palette}
) {
  const radius = Math.min(30, (boxHeight - 20) / 2)
  const photoX = -boxWidth / 2 + 10 + radius
  const buttons = nodes
    .selectAll('.person-photo-button')
    .data(d => (canEditPhoto && handle(d) ? [d] : []))
    .join('g')
    .attr('class', 'person-photo-button')
    .attr('transform', `translate(${photoX + radius - 7}, ${radius - 7})`)

  bindCardAction(buttons, handle, photoLabel, 'person:photo-edit')
  buttons
    .selectAll('rect')
    .data(d => [d])
    .join('rect')
    .attr('x', -12)
    .attr('y', -12)
    .attr('width', 24)
    .attr('height', 24)
    .attr('fill', 'transparent')
  buttons
    .selectAll('circle')
    .data(d => [d])
    .join('circle')
    .attr('r', 8)
    .attr('fill', palette.addButton)
  buttons
    .selectAll('path')
    .data(d => [d])
    .join('path')
    .attr('d', 'M-3,0 H3 M0,-3 V3')
    .attr('fill', 'none')
    .attr('stroke', palette.addButtonIcon)
    .attr('stroke-width', 2)
    .style('pointer-events', 'none')
  const targets = nodes
    .selectAll('.person-photo-target')
    .data(d => (canEditPhoto && handle(d) ? [d] : []))
    .join('g')
    .attr('class', 'person-photo-target')
    .attr('transform', `translate(${-boxWidth / 2 + 10 + radius}, 0)`)
  targets
    .selectAll('circle')
    .data(d => [d])
    .join('circle')
    .attr('r', radius)
    .attr('fill', 'transparent')
    .attr('pointer-events', 'all')
  bindCardAction(targets, handle, photoLabel, 'person:photo-edit')
  buttons.raise()
  const edit = nodes
    .selectAll('.person-edit-button')
    .data(d => (canEditPhoto && handle(d) ? [d] : []))
    .join('g')
    .attr('class', 'person-edit-button')
    .attr(
      'transform',
      `translate(${boxWidth / 2 - 22}, ${-boxHeight / 2 + 22})`
    )
  bindCardAction(edit, handle, editLabel, 'person:basic-edit')
  edit
    .selectAll('rect')
    .data(d => [d])
    .join('rect')
    .attr('x', -22)
    .attr('y', -22)
    .attr('width', 44)
    .attr('height', 44)
    .attr('fill', 'transparent')
  edit
    .selectAll('path')
    .data(d => [d])
    .join('path')
    .attr('d', mdiPencil)
    .attr('transform', 'translate(-10,-10) scale(0.8333)')
    .attr('fill', palette.addButton)
    .style('pointer-events', 'none')
}

function bindCardAction(buttons, handle, label, action) {
  buttons
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', label)
    .style('cursor', 'pointer')
    .on('pointerdown mousedown touchstart', event => event.stopPropagation())
    .on('pointerenter', () => fireEvent(window, 'object:preview-hide'))
    .on('click', function (event, d) {
      event.stopPropagation()
      event.preventDefault()
      fireEvent(this, action, {handle: handle(d)})
    })
    .on('keydown', function (event) {
      if (!['Enter', ' '].includes(event.key)) return
      event.stopPropagation()
      event.preventDefault()
      this.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    })
}
