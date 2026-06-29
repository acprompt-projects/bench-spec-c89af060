# ADR 005: Schema Governance — Single-Repo Source of Truth with Automated Validation

## Status

Accepted

## Context

The bench-spec JSON Schema is shared across prompt-bench, prompt-viz, and external consumers. Undisciplined changes break interoperability. We need a governance model that ensures schema changes are intentional, validated, and propagated reliably.

## Decision

The **bench-spec repository** is the single source of truth for all JSON Schema files. Schemas are published as a versioned npm package (`@bench-spec/schemas`) and are consumed via package dependency—not duplication.

### Change Control Rules

1. **All schema files live under** `bench-spec/schemas/` with one schema per domain concept (e.g., `run-config.json`, `benchmark-result.json`, `suite-manifest.json`).
2. **Every PR touching a schema file** MUST include a `CHANGELOG.md` entry describing the change and its compatibility impact (major/minor/patch per ADR 003).
3. **CI validates** on every PR:
   - Schema files are valid JSON Schema Draft 2020-12.
   - Existing example fixtures pass validation against modified schemas (no silent regressions).
   - No breaking changewithin a major version without a new major version branch.
4. **Release tags** are semver (`v1.2.0`). The npm package publishes automatically on tag push.
5. **Sibling projects** pin their dependency to `^MAJOR.MINOR` and regenerate types on minor bump.

### Compatibility Matrix

Each release includes a `compatibility.json` manifest:

```json
{
  "specVersion": "1.2.0",
  "minApiVersion": 1,
  "maxApiVersion": 1,
  "breakingChanges": []
}
```

This allows consumers to programmatically verify compatibility.

## Consequences

- Schema drift between projects is eliminated by construction.
- CI gate prevents accidental breaking changes within a major version.
- Publishing cadence is tied to tagging; hotfixes require a patch release.
- External consumers can adopt new minor versions at their own pace while staying on a compatible major version.