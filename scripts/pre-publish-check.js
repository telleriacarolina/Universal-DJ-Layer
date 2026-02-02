const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'package.json exists',
    check: () => fs.existsSync('package.json')
  },
  {
    name: 'README.md exists',
    check: () => fs.existsSync('README.md')
  },
  {
    name: 'LICENSE exists',
    check: () => fs.existsSync('LICENSE')
  },
  {
    name: 'CHANGELOG.md exists',
    check: () => fs.existsSync('CHANGELOG.md')
  },
  {
    name: 'dist/ directory exists',
    check: () => fs.existsSync('dist')
  },
  {
    name: 'CJS build exists',
    check: () => fs.existsSync('dist/cjs/index.js')
  },
  {
    name: 'ESM build exists',
    check: () => fs.existsSync('dist/esm/index.js')
  },
  {
    name: 'Type declarations exist',
    check: () => fs.existsSync('dist/types/index.d.ts')
  },
  {
    name: 'CJS package.json exists',
    check: () => fs.existsSync('dist/cjs/package.json')
  },
  {
    name: 'Discs submodule CJS exists',
    check: () => fs.existsSync('dist/cjs/discs/index.js')
  },
  {
    name: 'Discs submodule ESM exists',
    check: () => fs.existsSync('dist/esm/discs/index.js')
  },
  {
    name: 'Policies submodule CJS exists',
    check: () => fs.existsSync('dist/cjs/policies/index.js')
  },
  {
    name: 'Policies submodule ESM exists',
    check: () => fs.existsSync('dist/esm/policies/index.js')
  }
];

console.log('\n🔍 Running pre-publish checks...\n');

let passed = true;
checks.forEach(({ name, check }) => {
  const result = check();
  console.log(`${result ? '✓' : '✗'} ${name}`);
  if (!result) passed = false;
});

if (!passed) {
  console.error('\n❌ Pre-publish checks failed');
  process.exit(1);
}

console.log('\n✅ All pre-publish checks passed');
