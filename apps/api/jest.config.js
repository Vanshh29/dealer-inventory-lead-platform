// Unit tests: no database, no network.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/prisma'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
};
