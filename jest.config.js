module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/core', '<rootDir>/audit', '<rootDir>/tests', '<rootDir>/discs'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'core/**/*.ts',
    'audit/**/*.ts',
    'discs/**/*.ts',
    '!src/**/*.test.ts',
    '!core/**/*.test.ts',
    '!audit/**/*.test.ts',
    '!discs/**/*.test.ts',
    '!src/**/__tests__/**',
    '!core/**/__tests__/**',
    '!audit/**/__tests__/**',
    '!discs/**/__tests__/**'
  ]
};
