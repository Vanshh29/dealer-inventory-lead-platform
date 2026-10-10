// Integration tests: boot the real Nest app against a real PostgreSQL test database.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '\\.int\\.spec\\.ts$',
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/env.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.spec.ts'],
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Only enforced when run with --coverage (CI). 80% is the target I set for the API.
  coverageThreshold: { global: { statements: 80, branches: 80, functions: 80, lines: 80 } },
};
