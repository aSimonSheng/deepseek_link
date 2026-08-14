# ADR-0005: Manifest Schema and Permission Model

## Status

Accepted

## Date

2026-08-14

## Decision Owner

TBD

## Reviewers

- Product: TBD
- Architecture: TBD
- Security: TBD
- PC/DSH: TBD
- Mobile: TBD
- QA: TBD
- Release: TBD

## Related Gaps

- GAP-013
- GAP-014
- GAP-015
- GAP-016
- GAP-017
- GAP-019
- GAP-020
- GAP-085

## Context

M1 now has a mock-only TypeScript monorepo, package boundaries, and placeholder `plugin.manifest.json` files. The placeholders are not enough for a marketplace-ready plugin because permissions, capabilities, version fields, and high-risk declarations are not machine-validated.

`AGENTS.md` requires:

- plugin capability declarations do not grant permission;
- policy precedes capability;
- mobile receives no secrets or raw filesystem/shell capability;
- high-risk grants must be scoped, revocable leases.

The manifest schema is therefore a security boundary and marketplace preflight input, not just metadata.

## Decision

Define a strict M1 manifest contract in `packages/protocol`.

The manifest schema is implemented as TypeScript types plus pure validation helpers. M1 does not add a runtime plugin loader and does not grant permissions from manifest declarations.

Required manifest fields:

- `id`
- `displayName`
- `type`
- `manifestVersion`
- `pluginVersion`
- `apiVersion`
- `protocolVersion`
- `minDshVersion`
- `maxTestedDshVersion`
- `capabilities`
- `permissions`

Rules:

1. Unknown plugin types are rejected.
2. Unknown permission keys are rejected.
3. Unknown high-risk permission names are rejected.
4. `secret.read` and `secret.write` must be empty for all current MVP packages.
5. `ui` and `transport` packages cannot request shell, filesystem write, external file read/write, plugin install/enable, credential write, or relay enable.
6. `permissions` declares requested permission surface only; it never grants capability.
7. Any future provider package that needs `secret.read` requires a separate ADR and tests.
8. `packages/protocol` remains pure contract and validation code only.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | No schema, keep JSON placeholders | Fast | Unsafe, not marketplace-reviewable |
| B | JSON Schema only | Tool-friendly | Harder to share TS-level permission semantics without codegen |
| C | TypeScript types plus pure validation helpers | Fast, testable, no runtime dependency | Not a full JSON Schema artifact yet |
| D | Zod or external schema library | Rich validation | Adds dependency before schema stabilizes |

## Rationale

Option C is the right M1 step. It gives immediate machine checks and contract tests without introducing new runtime dependencies. JSON Schema can be generated or hand-authored later once the manifest stabilizes.

## Security and Privacy Impact

The validator blocks:

- mobile-facing packages requesting secret access;
- UI/transport packages requesting shell or filesystem mutation;
- unknown permission keys that could hide dangerous behavior;
- malformed manifest records that cannot be safely reviewed.

It does not grant permissions. Runtime enforcement remains with host/tool boundaries and policy decisions.

## Compatibility Impact

The manifest contract is internal to M1 and can evolve before marketplace RC. Changes to manifest semantics after M1 should be recorded in a new ADR if they affect permission behavior, compatibility fields, or marketplace metadata.

## Testing Requirements

Add contract tests for:

- valid MVP manifests;
- missing required fields;
- unknown plugin type;
- unknown permission key;
- mobile UI requesting `secret.read`;
- transport requesting `tool.shell.execute`;
- manifest capability with non-string value.

## Implementation Notes

Expected files:

```text
packages/protocol/src/manifest.ts
tests/contract/manifest.test.ts
packages/*/plugin.manifest.json
```

Existing `secrets.read` / `secrets.write` keys must be renamed to `secret.read` / `secret.write` to match `AGENTS.md`.

## Open Questions

- Should M2 add a JSON Schema artifact for external marketplace tooling?
- Should provider adapter manifest be added before or after the DSH provider reuse spike?
- Should permission scopes become typed per permission in M2?

## Consequences

### Positive

- MVP manifests become machine-verifiable.
- Permission drift becomes test-visible.
- Marketplace preflight can build on protocol validation.

### Negative

- The M1 schema is intentionally stricter than future provider/plugin needs.
- Future provider secret access requires another ADR.

### Follow-Up Work

- Add JSON Schema artifact before marketplace RC.
- Add permission-risk scoring before M3 packaging.
- Add provider-specific manifest only after provider strategy is accepted.
