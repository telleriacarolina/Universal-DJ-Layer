# Publishing Guide for Universal DJ Layer

## Package Structure

This package is built for npm with dual CommonJS and ESM support, along with full TypeScript declarations.

### Directory Structure
```
dist/
├── cjs/          # CommonJS build (Node.js require)
│   ├── index.js
│   ├── discs/
│   ├── policies/
│   └── package.json (marks as commonjs)
├── esm/          # ESM build (modern import)
│   ├── index.js
│   ├── discs/
│   └── policies/
└── types/        # TypeScript declarations
    ├── index.d.ts
    ├── discs/
    └── policies/
```

## Build Process

### Commands
```bash
npm run build       # Full build (clean + cjs + esm + types + cjs package.json)
npm run build:cjs   # Build CommonJS only
npm run build:esm   # Build ESM only
npm run build:types # Build TypeScript declarations only
npm run clean       # Remove dist directory
```

### Build Steps
1. **Clean**: Removes previous build artifacts
2. **CJS Build**: Compiles to CommonJS using `tsconfig.cjs.json`
3. **ESM Build**: Compiles to ESM using `tsconfig.esm.json`
4. **Types Build**: Generates TypeScript declarations using `tsconfig.types.json`
5. **CJS Package**: Adds `package.json` with `"type": "commonjs"` to CJS output

## Package Exports

The package supports three export paths:

### Main Entry Point
```javascript
// CommonJS
const { DJEngine, StateManager } = require('universal-dj-layer');

// ESM
import { DJEngine, StateManager } from 'universal-dj-layer';

// TypeScript
import type { DJEngineConfig } from 'universal-dj-layer';
```

### Discs Submodule
```javascript
// CommonJS
const { FeatureDisc, UIDisc } = require('universal-dj-layer/discs');

// ESM
import { FeatureDisc, UIDisc } from 'universal-dj-layer/discs';

// TypeScript
import type { FeatureConfig } from 'universal-dj-layer/discs';
```

### Policies Submodule
```javascript
// CommonJS
const { SafetyPolicy, CompliancePolicy } = require('universal-dj-layer/policies');

// ESM
import { SafetyPolicy, CompliancePolicy } from 'universal-dj-layer/policies';

// TypeScript
import type { SafetyPolicyConfig } from 'universal-dj-layer/policies';
```

## Pre-Publish Checklist

Run the pre-publish check script:
```bash
node scripts/pre-publish-check.js
```

This verifies:
- All required files exist (package.json, README, LICENSE, CHANGELOG)
- All builds are present (CJS, ESM, Types)
- Submodule exports are built correctly
- CJS package.json marker exists

## Bundle Size Monitoring

Check bundle sizes:
```bash
npm run size       # Check sizes against limits
npm run size:why   # Analyze why packages are large
```

Current limits:
- Core (CJS): 50 KB
- Core (ESM): 50 KB

Current actual sizes:
- Core (CJS): 7.75 KB (brotlied)
- Core (ESM): 6.43 KB (brotlied)
- Package size: 58.3 KB (gzipped)
- Unpacked size: 355.3 KB

## Publishing Process

### Automated Publishing (Recommended)

This package uses semantic-release for automated versioning and publishing:

```bash
npm run semantic-release
```

This will:
1. Analyze commit messages (conventional commits)
2. Determine version bump (major/minor/patch)
3. Update CHANGELOG.md
4. Update package.json version
5. Build the package
6. Publish to npm
7. Create GitHub release
8. Commit version bump back to git

### Manual Publishing

If you need to publish manually:

1. **Build the package:**
   ```bash
   npm run build
   ```

2. **Run pre-publish checks:**
   ```bash
   node scripts/pre-publish-check.js
   ```

3. **Test package contents (dry run):**
   ```bash
   npm pack --dry-run
   ```

4. **Create tarball for testing:**
   ```bash
   npm pack
   ```

5. **Test installation locally:**
   ```bash
   cd /tmp
   mkdir test-project && cd test-project
   npm init -y
   npm install /path/to/Universal-DJ-Layer/universal-dj-layer-1.0.0.tgz
   ```

6. **Publish to npm:**
   ```bash
   npm publish
   ```

## Commit Message Convention

For semantic-release to work, use conventional commits:

- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `BREAKING CHANGE:` - Breaking API changes (triggers major version bump)

Examples:
```
feat: add new FlowDisc functionality
fix: resolve StateManager memory leak
docs: update API reference
BREAKING CHANGE: rename PolicyEvaluator methods
```

## Files Included in Package

The published package includes only:
- `dist/` - All build outputs
- `README.md` - Documentation
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history

All source files, tests, and development configurations are excluded via `.npmignore`.

## Node.js Compatibility

- **Minimum Node.js version:** 18.0.0
- **Supported platforms:** All platforms (Windows, macOS, Linux)
- **Module systems:** CommonJS and ESM
- **TypeScript:** Full type definitions included

## Troubleshooting

### Build Failures

If builds fail:
1. Clean the dist directory: `npm run clean`
2. Check TypeScript version: `npx tsc --version`
3. Verify all TypeScript files compile: `npx tsc --noEmit`
4. Check for circular dependencies

### Import Issues

If imports fail in consumer projects:
1. Verify package.json exports configuration
2. Check Node.js version (must be >= 18.0.0)
3. Ensure proper module resolution in consumer's tsconfig.json
4. Try clearing npm cache: `npm cache clean --force`

### Size Limit Failures

If bundle sizes exceed limits:
1. Run `npm run size:why` to see what's large
2. Check for accidental inclusion of dev dependencies
3. Review imports for tree-shaking opportunities
4. Consider lazy loading for large modules

## Support

- **Issues:** https://github.com/telleriacarolina/Universal-DJ-Layer/issues
- **Documentation:** https://github.com/telleriacarolina/Universal-DJ-Layer#readme
- **npm Page:** https://www.npmjs.com/package/universal-dj-layer
