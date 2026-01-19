const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // roots: ['<rootDir>/__test__'],
  testMatch: [
    '**/__test__/*.test.ts',
    '**/src/routes/**/*.spec.ts' // src 추가
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

export default config;
