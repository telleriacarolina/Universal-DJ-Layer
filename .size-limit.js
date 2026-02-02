module.exports = [
  {
    name: 'Core (CJS)',
    path: 'dist/cjs/index.js',
    limit: '50 KB',
    ignore: ['events', 'util']
  },
  {
    name: 'Core (ESM)',
    path: 'dist/esm/index.js',
    limit: '50 KB',
    ignore: ['events', 'util']
  }
];
