# Contributing to Universal DJ Layer

Thank you for your interest in contributing to the Universal DJ Layer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)

## Development Setup

### Prerequisites

- Node.js 18, 20, or 22
- npm (comes with Node.js)
- Git

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/telleriacarolina/Universal-DJ-Layer.git
   cd Universal-DJ-Layer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Git hooks**
   ```bash
   npm run prepare
   ```
   This will install Husky hooks that run linting and formatting checks before each commit.

### Development Workflow

- **Build the project**: `npm run build`
- **Run in watch mode**: `npm run dev`
- **Run tests**: `npm test`
- **Run tests in watch mode**: `npm run test:watch`
- **Check types**: `npm run typecheck`
- **Lint code**: `npm run lint`
- **Fix linting issues**: `npm run lint:fix`
- **Format code**: `npm run format`
- **Check formatting**: `npm run format:check`

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Organization

- Unit tests are located alongside source files with the `.test.ts` extension
- Integration tests are in the `tests/integration/` directory
- Test files should follow the naming convention: `*.test.ts`

## Code Style Guidelines

### TypeScript

- **Strict typing**: Avoid using `any` except when absolutely necessary
- **Interfaces and types**: Use interfaces for object structures and type aliases for unions/primitives
- **Async/await**: Use async/await patterns consistently instead of raw Promises
- **Error handling**: Always use try/catch blocks and throw meaningful error messages
- **Documentation**: Document all public methods with JSDoc comments
- **Naming conventions**:
  - PascalCase for classes and interfaces
  - camelCase for methods, variables, and functions
  - UPPER_SNAKE_CASE for constants

### Disc Modules

When creating new disc modules:

1. Extend the `Disc` base class
2. Implement all required lifecycle hooks: `initialize`, `execute`, `cleanup`, `validate`
3. Check RBAC roles before executing logic
4. Emit events via DJEngine hooks
5. Keep discs stateless; use `StateManager` for ephemeral state
6. Validate changes before applying
7. Document required actor roles and side effects
8. Include comprehensive unit tests

### Code Organization

- One class or utility per file
- Keep functions focused and single-purpose
- Minimize side effects
- Return results instead of mutating global state
- Group related functionality in modules

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, whitespace)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Examples

```
feat(discs): Add new theme disc for dark mode support

Added ThemeDisc that allows switching between light and dark themes
with proper validation and rollback support.

Closes #123
```

```
fix(engine): Prevent duplicate disc registration

Fixed issue where discs could be registered multiple times,
causing unexpected behavior during activation.

Fixes #456
```

```
docs(readme): Update installation instructions

Updated the README with clearer installation steps and
added troubleshooting section.
```

### Rules

- Use sentence case for subjects
- Use the imperative mood ("Add feature" not "Added feature")
- Don't end the subject with a period
- Limit the subject line to 72 characters
- Wrap the body at 100 characters
- Use the body to explain what and why, not how

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**: `npm test`
2. **Check linting**: `npm run lint`
3. **Check formatting**: `npm run format:check`
4. **Check type safety**: `npm run typecheck`
5. **Update documentation** if needed
6. **Add tests** for new features

### Submitting a PR

1. **Fork the repository** and create a new branch from `main`

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Commit your changes** with meaningful commit messages

   ```bash
   git commit -m "feat(scope): Add new feature"
   ```

4. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub
   - Use a clear and descriptive title
   - Reference any related issues
   - Describe your changes in detail
   - Include any breaking changes
   - Add screenshots for UI changes

### PR Review Process

- All PRs require at least one approval
- CI checks must pass (linting, tests, build)
- Code must maintain or improve test coverage
- Follow-up on review feedback promptly
- Keep PRs focused and reasonably sized

### After Your PR is Merged

- Delete your feature branch
- Pull the latest changes from main
- Your contribution will be included in the next release!

## Questions?

If you have any questions or need help, please:

- Open an issue on GitHub
- Reach out to the maintainers

Thank you for contributing to Universal DJ Layer! 🎵
