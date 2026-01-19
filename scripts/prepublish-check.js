#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'README exists',
    test: () => fs.existsSync('README.md')
  },
  {
    name: 'LICENSE exists',
    test: () => fs.existsSync('LICENSE')
  },
  {
    name: 'Dist folder exists',
    test: () => fs.existsSync('dist')
  },
  {
    name: 'CJS build exists',
    test: () => fs.existsSync('dist/cjs/index.js')
  },
  {
    name: 'ESM build exists',
    test: () => fs.existsSync('dist/esm/index.js')
  },
  {
    name: 'Type definitions exist',
    test: () => fs.existsSync('dist/types/index.d.ts')
  },
  {
    name: 'Package.json has correct main',
    test: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json'));
      return pkg.main === './dist/cjs/index.js';
    }
  },
  {
    name: 'Tests pass',
    test: () => {
      try {
        require('child_process').execSync('npm test', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  }
];

console.log('Pre-publish checks:\n');

let allPassed = true;
for (const check of checks) {
  const passed = check.test();
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
  if (!passed) allPassed = false;
}

if (!allPassed) {
  console.error('\n❌ Some checks failed. Fix issues before publishing.');
  process.exit(1);
}

console.log('\n✅ All checks passed! Ready to publish.');
