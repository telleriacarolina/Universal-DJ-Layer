module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/core', '<rootDir>/audit', '<rootDir>/tests', '<rootDir>/api'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'core/**/*.ts',
    'audit/**/*.ts',
    'api/**/*.ts',
    '!src/**/*.test.ts',
    '!core/**/*.test.ts',
    '!audit/**/*.test.ts',
    '!api/**/*.test.ts',
    '!src/**/__tests__/**',
    '!core/**/__tests__/**',
    '!audit/**/__tests__/**'
  ]
};
