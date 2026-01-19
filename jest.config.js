module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/core', '<rootDir>/audit', '<rootDir>/tests', '<rootDir>/policies', '<rootDir>/roles'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'core/**/*.ts',
    'audit/**/*.ts',
    'policies/**/*.ts',
    'roles/**/*.ts',
    '!src/**/*.test.ts',
    '!core/**/*.test.ts',
    '!audit/**/*.test.ts',
    '!policies/**/*.test.ts',
    '!roles/**/*.test.ts',
    '!src/**/__tests__/**',
    '!core/**/__tests__/**',
    '!audit/**/__tests__/**',
    '!policies/**/__tests__/**',
    '!roles/**/__tests__/**'
  ]
};
