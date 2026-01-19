const fs = require('fs');
const path = require('path');

const cjsPackageJson = {
  type: 'commonjs'
};

const distCjsPath = path.join(__dirname, '../dist/cjs');

// Ensure the directory exists
if (!fs.existsSync(distCjsPath)) {
  console.error('Error: dist/cjs directory does not exist. Run build:cjs first.');
  process.exit(1);
}

fs.writeFileSync(
  path.join(distCjsPath, 'package.json'),
  JSON.stringify(cjsPackageJson, null, 2)
);

console.log('✓ Added package.json to CJS build');
