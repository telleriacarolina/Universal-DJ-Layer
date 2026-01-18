---
applyTo: 
  - "src/**/*.ts"
  - "src/**/*.test.ts"
  - "src/discs/**/*.ts"
---

# Copilot Instructions for Universal-DJ-Layer

## TypeScript Core Files
- Use strict typing; avoid `any` except when absolutely necessary
- Use interfaces and type aliases for reusable structures
- Modular design: one class or utility per file
- Async/await patterns consistently
- Document all public methods with JSDoc
- Handle errors with try/catch and throw meaningful messages
- Minimize side effects; return results instead of mutating globally
- Emit events for disc lifecycle hooks
- Naming conventions: PascalCase for classes, camelCase for methods/variables
- Unit-test all exports

## Unit Tests (Jest)
- Isolate tests; no dependency on other tests
- Descriptive `describe` and `it` names
- Mock dependencies as needed
- Test all public methods, including edge cases
- Use `beforeEach` and `afterEach` for setup/cleanup
- Assert side effects (state changes, event emissions, audit logs)
- Coverage: target 100% on core classes
- Avoid manual waits; use Jest async utilities

## Disc Modules
- Extend `Disc` base class
- Implement `initialize`, `execute`, `cleanup`, `validate` hooks
- Check RBAC roles before executing logic
- Emit events via DJEngine hooks
- Keep discs stateless; use `StateManager` for ephemeral state
- Validate changes before applying
- Document actor roles and effects
- Unit-test all disc logic including snapshots and rollbacks
- PascalCase for disc class names
- Avoid side effects outside sandbox

## Configuration Files
- Keep TypeScript strict mode enabled
- Target ES2020 or newer
- Use `baseUrl` and `paths` for modular imports
- Exclude tests from production builds
- Document any custom compiler options
