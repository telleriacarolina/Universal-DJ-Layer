module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/core', '<rootDir>/audit', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'core/**/*.ts',
    'audit/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!core/**/*.test.ts',
    '!audit/**/*.test.ts',
    '!tests/**/*.ts'
  ]
};
