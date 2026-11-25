import {describe, expect, it, vi} from 'vitest'
import {create} from 'd3-selection'
import {updatePhotoButtons} from '../../src/charts/photoButton.js'
import {chartPalette} from '../../src/charts/palette.js'

const settings = {
  canEditPhoto: true,
  handle: d => d.handle,
  boxWidth: 250,
  boxHeight: 104,
  photoLabel: 'Add photo',
  palette: chartPalette,
}

describe('tree photo button', () => {
  it('has a keyboard action and does not trigger navigation or dragging', () => {
    const svg = create('svg')
    const nodes = svg
      .selectAll('g')
      .data([{handle: 'synthetic-person'}])
      .join('g')
    updatePhotoButtons(nodes, settings)
    const photo = vi.fn()
    const navigate = vi.fn()
    const drag = vi.fn()
    svg.node().addEventListener('person:photo-edit', photo)
    svg.node().addEventListener('click', navigate)
    svg.node().addEventListener('pointerdown', drag)
    svg.node().addEventListener('mousedown', drag)
    svg.node().addEventListener('touchstart', drag)
    const button = nodes.node().querySelector('.person-photo-button')
    expect(button.getAttribute('role')).toBe('button')
    expect(button.querySelector('rect').getAttribute('width')).toBe('44')
    button.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    button.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})
    )
    button.dispatchEvent(new Event('pointerdown', {bubbles: true}))
    for (const type of ['mousedown', 'touchstart'])
      button.dispatchEvent(new Event(type, {bubbles: true}))
    const target = nodes.node().querySelector('.person-photo-target')
    target.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    target.dispatchEvent(
      new KeyboardEvent('keydown', {key: ' ', bubbles: true})
    )
    for (const type of ['pointerdown', 'mousedown', 'touchstart'])
      target.dispatchEvent(new Event(type, {bubbles: true}))
    expect(photo).toHaveBeenCalledTimes(4)
    expect(photo.mock.calls[0][0].detail).toEqual({handle: 'synthetic-person'})
    expect(navigate).not.toHaveBeenCalled()
    expect(drag).not.toHaveBeenCalled()
  })

  it('removes photo actions for readers and does not offer unknown people', () => {
    const svg = create('svg')
    const nodes = svg
      .selectAll('g')
      .data([{handle: 'p'}, {}])
      .join('g')
    updatePhotoButtons(nodes, settings)
    expect(svg.node().querySelectorAll('.person-photo-button')).toHaveLength(1)
    updatePhotoButtons(nodes, {...settings, canEditPhoto: false})
    expect(
      svg.node().querySelectorAll('.person-photo-button, .person-photo-target')
    ).toHaveLength(0)
  })
})
