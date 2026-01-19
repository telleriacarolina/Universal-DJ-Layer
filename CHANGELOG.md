# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-01-19

### Added
- Initial release
- DJEngine orchestration layer with pluggable disc system
- StateManager with snapshot/rollback capabilities
- AuditLog with comprehensive logging and change history
- 5 core disc types (Feature, Permission, Flow, UI, Behavior)
- RBAC with 6-tier role system (Creator, Admin, Moderator, Collaborator, User, AI Agent)
- PolicyEvaluator with 4 policy types (Creator Lock, Safety, Anti-Abuse, Compliance)
- Public API layer with apply, revert, preview, and list operations
- Guardrails for safety enforcement
- DiffEngine for change tracking
- Full TypeScript support with comprehensive type definitions
- Dual build system (CommonJS + ESM)
- Bundle size monitoring
