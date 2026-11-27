import {describe, it, expect} from 'vitest'
import {render} from 'lit'
import {renderPersonDates} from '../../src/components/personListUtils.js'

describe('renderPersonDates', () => {
  it('uses the default symbols when none are passed', () => {
    const profile = {birth: {date: '1990'}, death: {date: '2020'}}
    const result = renderPersonDates(profile)
    expect(result.values).toContain('∗ 1990')
    expect(result.values[1]).toContain('† 2020')
  })

  it('recalculates completed years instead of trusting a server age label', () => {
    const root = document.createElement('div')
    render(
      renderPersonDates({
        birth: {date: '1990-11-27'},
        death: {date: '2020-11-26', age: '999 years'},
      }),
      root
    )
    expect(root.textContent).toContain('(29)')
    expect(root.textContent).not.toContain('999')
  })

  it('uses custom symbols when passed', () => {
    const profile = {birth: {date: '1990'}, death: {date: '2020'}}
    const result = renderPersonDates(profile, {
      birthSymbol: 'b.',
      deathSymbol: 'd.',
    })
    expect(result.values).toContain('b. 1990')
    expect(result.values[1]).toContain('d. 2020')
  })
})
