module.exports = {
  forbidden: [
    {name: 'no-cycles', severity: 'error', from: {}, to: {circular: true}},
    {
      name: 'production-not-tools',
      severity: 'error',
      from: {path: '^src/'},
      to: {
        path: '(^|/)(test|tests|scripts|tools|fixtures|__tests__|__mocks__)/|\\.(test|spec)\\.[cm]?[jt]sx?$|^[^/]+\\.config\\.[cm]?[jt]s$',
      },
    },
    {
      name: 'production-not-dev-packages',
      severity: 'error',
      from: {path: '^src/'},
      to: {dependencyTypes: ['npm-dev']},
    },
    {
      name: 'components-not-pages',
      severity: 'error',
      from: {path: '^src/components/'},
      to: {path: '^src/views/'},
    },
    {
      name: 'no-unresolved',
      severity: 'error',
      from: {},
      to: {couldNotResolve: true},
    },
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    tsConfig: {fileName: 'tsconfig.json'},
    enhancedResolveOptions: {conditionNames: ['import', 'browser', 'default']},
  },
}
