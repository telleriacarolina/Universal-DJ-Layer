# Publishing Guide

This document describes how to publish the Universal-DJ-Layer package to npm.

## Prerequisites

- Node.js >= 18.0.0
- npm account with publish permissions
- All tests passing
- Clean git working directory

## Publishing Process

### 1. Pre-publish Checks

Run the pre-publish validation script:

```bash
npm run prepublishOnly
```

This will verify:
- README.md exists
- LICENSE exists
- Build artifacts are present (dist/cjs, dist/esm, dist/types)
- Package.json configuration is correct
- All tests pass

### 2. Build the Package

```bash
npm run build
```

This creates three build outputs:
- `dist/cjs/` - CommonJS build
- `dist/esm/` - ES Module build
- `dist/types/` - TypeScript declarations

### 3. Test the Package Locally

Test the package locally before publishing:

```bash
npm pack
```

This creates a `.tgz` file you can install in a test project:

```bash
npm install /path/to/universal-dj-layer-0.0.0-development.tgz
```

### 4. Verify Bundle Sizes

Check that bundle sizes are within limits:

```bash
npm run size
```

### 5. Publish to npm

For manual publishing:

```bash
npm publish
```

For scoped packages:

```bash
npm publish --access public
```

## Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Breaking changes
- **MINOR** version (0.X.0): New features, backwards compatible
- **PATCH** version (0.0.X): Bug fixes, backwards compatible

### Version Bump Commands

```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Release Checklist

Before each release:

- [ ] All tests passing (`npm test`)
- [ ] Code linted and formatted
- [ ] CHANGELOG.md updated with changes
- [ ] Version bumped appropriately
- [ ] README.md up to date
- [ ] Build artifacts generated (`npm run build`)
- [ ] Bundle sizes checked (`npm run size`)
- [ ] Package tested locally (`npm pack`)
- [ ] Git tag created for version
- [ ] Changes pushed to GitHub

## Automated Publishing

This repository uses semantic-release for automated publishing. Commits following the [Conventional Commits](https://www.conventionalcommits.org/) specification will automatically:

- Determine the next version number
- Generate release notes
- Publish to npm
- Create a GitHub release

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature (triggers MINOR version bump)
- `fix`: Bug fix (triggers PATCH version bump)
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Breaking Changes:**
Add `BREAKING CHANGE:` in the footer to trigger a MAJOR version bump.

## Deprecating Versions

To deprecate a version:

```bash
npm deprecate universal-dj-layer@1.0.0 "Critical bug, please upgrade to 1.0.1"
```

## Unpublishing

⚠️ **Warning:** Only unpublish within 72 hours of publishing.

```bash
npm unpublish universal-dj-layer@1.0.0
```

## Troubleshooting

### "You do not have permission to publish"

Ensure you're logged in to npm:

```bash
npm login
```

And that you have publish permissions for the package.

### "Version already exists"

You cannot republish the same version. Bump the version:

```bash
npm version patch
```

### Build Failures

If builds fail, check:
- TypeScript configuration is correct
- All source files compile without errors
- Dependencies are installed (`npm install`)

### Tests Failing

Run tests with verbose output:

```bash
npm test -- --verbose
```

Fix any failing tests before publishing.

### Bundle Size Exceeded

If bundle sizes exceed limits:
- Review and optimize imports
- Check for accidentally included dependencies
- Use tree-shaking friendly code patterns
- Consider code splitting

## GitHub Package Registry (Optional)

To publish to GitHub Packages instead of npm:

1. Create/update `.npmrc`:
```
@telleriacarolina:registry=https://npm.pkg.github.com
```

2. Update `package.json`:
```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

3. Authenticate with GitHub:
```bash
npm login --registry=https://npm.pkg.github.com
```

4. Publish:
```bash
npm publish
```

## Support

For publishing issues, contact:
- Package maintainers
- Open an issue on GitHub
- npm support (for npm-specific issues)
