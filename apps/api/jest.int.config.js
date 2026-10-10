// Integration tests: boot the real Nest app against a real PostgreSQL test database.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '\\.int\\.spec\\.ts$',
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/env.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
};
