# ADR-0002: DSH Version Compatibility Target

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

- GAP-002
- EXT-002
- GAP-018
- GAP-074

## Context

The project targets DeepSeek Harness, but the repository currently contains no installed source snapshot, no direct API integration, and no verified compatibility matrix.

Earlier investigation indicates DSH is in developer preview and may have breaking changes. A marketplace-ready plugin must declare a compatibility range and reject unsupported hosts instead of partially running.

## Decision

Use a conservative compatibility policy for M1:

1. Target one pinned DSH version for development and tests.
2. Treat all DSH host/plugin APIs as unstable until verified.
3. Avoid private/internal API dependencies.
4. Prefer public plugin/manifest/config contracts.
5. Add runtime capability checks before activating any plugin.
6. Refuse to load if required capabilities are missing.

This ADR accepts the compatibility strategy, not a production compatibility claim for a specific DSH version.

For initial planning, manifests may use placeholder compatibility fields:

```json
{
  "minDshVersion": "TBD",
  "maxTestedDshVersion": "TBD",
  "compatibilityMode": "pinned-preview"
}
```

These values block real DSH integration until a local compatibility spike verifies the installed DSH version and API surface. M1 mock-only skeleton work may proceed without that spike.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | Pin exactly one DSH preview version | Safest for M1 | Narrow compatibility |
| B | Support a broad semver range | Better marketplace story | Unsafe without API stability evidence |
| C | Track DSH latest dynamically | Easy early testing | High breakage and support risk |

## Rationale

Option A is safest for M1. The plugin touches transport, policy, events, artifacts, provider usage, and UI surface behavior. A broad compatibility claim would be misleading until contract tests exist.

This ADR does not prevent later widening the range. It requires evidence before widening.

## Security and Privacy Impact

Unsupported DSH hosts could have different sandbox, credential, event, or policy semantics. Loading on unknown hosts risks secret leakage or policy bypass. Capability checks are security controls, not convenience checks.

## Compatibility Impact

All plugin packages must expose:

- `minDshVersion`
- `maxTestedDshVersion`
- `protocolVersion`
- `requiredHostCapabilities`
- `optionalHostCapabilities`

Activation must fail closed when required capabilities are unavailable.

## Testing Requirements

- Compatibility preflight against the pinned DSH version.
- Negative tests for missing capabilities.
- Tests for unsupported DSH version rejection.
- Tests for optional capability fallback.
- Provider compatibility spike: reuse upstream provider or require adapter.

## Expert Review Notes

Accepted with restricted scope after M1 expert review:

- Accepted: conservative pinned-preview strategy, fail-closed activation, and capability checks.
- Not accepted as complete: any specific DSH version range or provider reuse claim.
- Real DSH integration, provider adapter decisions, and marketplace compatibility claims remain blocked until the compatibility spike is complete.
- Every high-risk runtime action must pass four checks: manifest declaration, host capability, policy decision, and scoped approval lease where required.

## Implementation Notes

Expected M1 artifacts:

```text
docs/mobile-pc-plugin/compatibility/dsh-compatibility-matrix.md
packages/protocol/src/compatibility.ts
packages/*/plugin.manifest.json
tests/contract/compatibility.test.ts
```

## Open Questions

- What exact DSH version will be used for first local development?
- Which DSH API is considered public enough for plugin marketplace use?
- Does the target marketplace enforce a compatibility field or install-time engine range?
- Is an upstream DeepSeek provider already available and compatible?

## Consequences

### Positive

- Avoids false compatibility claims.
- Keeps M1 testable.
- Makes unsupported hosts fail closed.

### Negative

- Initial plugin may support only one preview DSH version.
- Marketplace positioning is weaker until compatibility widens.

### Follow-Up Work

- Verify installed DSH version.
- Build compatibility matrix.
- Run provider compatibility spike.
- Revisit range before Marketplace RC.
