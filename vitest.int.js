import {defineConfig} from 'vitest/config'
import unit from './vitest.config.js'

export default defineConfig({
  ...unit,
  test: {
    ...unit.test,
    include: ['test/integration/**/*.test.js'],
    coverage: {enabled: false},
  },
})
