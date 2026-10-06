import {describe, it, expect} from 'vitest'
import english from '../../lang/en.json'
import russian from '../../lang/ru.json'

describe('person editor translations', () => {
  it.each([
    ['en', english],
    ['ru', russian],
  ])('provides actions, loading and errors in %s', (language, strings) => {
    for (const key of [
      'Edit card',
      'Loading person...',
      'Reload person',
      'Unable to load person',
      'Unable to save person',
      'Not authorized',
      'This person has changed. Reload the card before saving.',
      'Edit dates, places, relatives and additional names in the page sections.',
    ]) {
      expect(strings[key]).toBeTruthy()
      if (language === 'ru') expect(strings[key]).not.toBe(key)
    }
  })
})
