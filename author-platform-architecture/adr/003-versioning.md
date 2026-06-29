# ADR 003: Versioning Strategy — URL-Path Major, Schema Minor/Patch

## Status

Accepted

## Context

The bench-spec schema will evolve. prompt-bench APIs and prompt-viz consumers need clear rules about when changes are breaking, how clients discover supported versions, and how multiple versions coexist during migration periods.

## Decision

We use a **two-layer versioning model**:

1. **API major version in the URL path**: `/v1/`, `/v2/`, etc.
2. **Schema minor and patch versions in the `version` field of every JSON payload** (semver: `MAJOR.MINOR.PATCH`).

### Rules

- **Breaking changes** (field removal, type change, semantic redefinition) bump the API major version and introduce a new path prefix.
- **Additive changes** (new optional fields, new enum values) bump the schema minor version only—no new URL path.
- **Bug fixes** (clarifications, constraint tightening) bump the patch version only.
- At most **two consecutive major API versions** are served simultaneously. The older version is deprecated for ≥ 90 days before removal.
- Every response includes a header `X-Bench-Spec-Version: <MAJOR.MINOR.PATCH>` identifying the exact schema version used.
- The OpenAPI spec for each major version is published at `/v1/openapi.json`, `/v2/openapi.json`.

### Schema Version in Payloads

```json
{
  "$schema": "https://bench-spec.dev/schemas/v1.2.0/run-config.json",
  "version": "1.2.0",
  "benchmark": { ... }
}
```

- Consumers MUST check `version` minimum minor for features they require.
- Unknown optional fields MUST be ignored (forward compatibility).

## Consequences

- URL-based major versioning is explicit and cache-friendly.
- Additive evolution within a major version avoids API proliferation.
- Clients must implement minor-version-aware feature detection for new fields.
- Migration between major versions is a deliberate, planned event with a deprecation window.