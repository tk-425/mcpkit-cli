export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['dist/**/*.js'],
  coverageDirectory: 'coverage',
  verbose: true,
  transform: {},
};
