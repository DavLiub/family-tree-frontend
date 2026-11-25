import {fireEvent} from '../util.js'

// This action is independent of the chart's relationship editing mode.
export function updatePhotoButtons(
  nodes,
  {canEditPhoto, handle, boxWidth, boxHeight, photoLabel, palette}
) {
  const buttons = nodes
    .selectAll('.person-photo-button')
    .data(d => (canEditPhoto && handle(d) ? [d] : []))
    .join('g')
    .attr('class', 'person-photo-button')
    .attr(
      'transform',
      `translate(${boxWidth / 2 - 22}, ${-boxHeight / 2 + 22})`
    )

  bindPhotoAction(buttons, handle, photoLabel)
  buttons
    .selectAll('rect')
    .data(d => [d])
    .join('rect')
    .attr('x', -22)
    .attr('y', -22)
    .attr('width', 44)
    .attr('height', 44)
    .attr('fill', 'transparent')
  buttons
    .selectAll('circle')
    .data(d => [d])
    .join('circle')
    .attr('r', 16)
    .attr('fill', palette.addButton)
  buttons
    .selectAll('path')
    .data(d => [d])
    .join('path')
    .attr('d', 'M-5,0 H5 M0,-5 V5')
    .attr('fill', 'none')
    .attr('stroke', palette.addButtonIcon)
    .attr('stroke-width', 2)
    .style('pointer-events', 'none')
  const radius = Math.min(30, (boxHeight - 20) / 2)
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
  bindPhotoAction(targets, handle, photoLabel)
}

function bindPhotoAction(buttons, handle, photoLabel) {
  buttons
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', photoLabel)
    .style('cursor', 'pointer')
    .on('pointerdown mousedown touchstart', event => event.stopPropagation())
    .on('pointerenter', () => fireEvent(window, 'object:preview-hide'))
    .on('click', function (event, d) {
      event.stopPropagation()
      event.preventDefault()
      fireEvent(this, 'person:photo-edit', {handle: handle(d)})
    })
    .on('keydown', function (event) {
      if (!['Enter', ' '].includes(event.key)) return
      event.stopPropagation()
      event.preventDefault()
      this.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    })
}
