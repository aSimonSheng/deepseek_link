# ADR-0001: MVP Plugin Package Boundary

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

- GAP-001
- GAP-013
- GAP-014
- GAP-015
- GAP-016
- GAP-017
- GAP-018
- GAP-020

## Context

`AGENTS.md` defines the MVP plugin set:

- `dsh-mobile-bridge.transport`
- `dsh-mobile-approval.policy`
- `dsh-mobile-surface.ui`
- `dsh-deepseek-provider.provider` or an upstream-compatible provider plugin
- `dsh-token-usage.observer`
- `dsh-local-artifact.storage`

M0 identified that the project currently has no source structure, no manifests, and no package boundaries. Without package boundaries, the plugin could become a large mixed-responsibility module that is hard to audit, hard to test, and hard to submit to a marketplace.

## Decision

Use a monorepo with separately packaged plugin units and shared protocol libraries.

The MVP should be split into these packages:

| Package | Plugin ID | Type | Responsibility |
| --- | --- | --- | --- |
| `packages/mobile-bridge-transport` | `dsh-mobile-bridge.transport` | `transport` | LAN pairing, authenticated session, RPC envelope, event stream, resume. |
| `packages/mobile-approval-policy` | `dsh-mobile-approval.policy` | `policy` | allow/deny/ask decisions, approval request generation, lease enforcement. |
| `packages/mobile-surface-web` | `dsh-mobile-surface.ui` | `ui` | Mobile web/PWA surface for pairing, task intent, approval, redacted logs, result summary. |
| `packages/token-usage-observer` | `dsh-token-usage.observer` | `observer` | Token, cost, and cache usage events with truthful unavailable/estimated/provider-reported states. |
| `packages/local-artifact-storage` | `dsh-local-artifact.storage` | `storage` | Artifact references, visibility policy, summary retrieval, digest tracking. |
| `packages/deepseek-provider-adapter` | `dsh-deepseek-provider.provider` | `provider` | Optional only if upstream DSH provider cannot be reused directly. |
| `packages/protocol` | none | shared | JSON Schemas, TypeScript types, version constants, error codes. |
| `packages/mock-dsh-host` | none | dev/test | Mock DSH runtime, event bus, policy broker, artifact store for local testing. |

The default provider strategy is to reuse upstream DSH provider capability if available. `packages/deepseek-provider-adapter` remains optional until ADR-0002 and a provider compatibility spike confirm whether it is required.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | One large mobile bridge plugin | Fast to prototype | Hard to audit, oversized permissions, poor marketplace story |
| B | Separate plugin packages with shared protocol package | Strong boundaries, easier testing and review | More package coordination |
| C | Separate repositories per plugin | Maximum isolation | Too much overhead before M1 |

## Rationale

Option B best matches "Everything is a plugin" while keeping early development practical.

The split gives each plugin a narrow manifest and permission surface. It also lets marketplace review reason about transport, policy, UI, observer, storage, and provider risks separately.

## Security and Privacy Impact

- Transport does not receive provider secrets.
- UI does not receive raw filesystem, shell, or secret capabilities.
- Policy becomes the only authority for high-risk approvals.
- Observer consumes usage metadata and redacted events only.
- Artifact storage controls visibility before mobile access.
- Optional provider adapter remains PC-side only.

## Compatibility Impact

- Shared `packages/protocol` becomes the compatibility center.
- Plugin packages can version independently, but M1 should release them as a tested bundle.
- If upstream DSH provider is reused, provider adapter package may be omitted from MVP.
- Package manifests must declare compatible DSH and protocol versions.

## Testing Requirements

- Manifest schema tests for each plugin package.
- Permission declaration consistency tests.
- Cross-package protocol contract tests.
- Mobile E2E through mock host.
- Security tests proving UI cannot call policy-protected capabilities directly.
- Observer tests for `unavailable`, `estimated`, and `provider_reported` usage states.

## Implementation Notes

Expected directories after acceptance:

```text
packages/
  mobile-bridge-transport/
  mobile-approval-policy/
  mobile-surface-web/
  token-usage-observer/
  local-artifact-storage/
  protocol/
  mock-dsh-host/
```

Optional:

```text
packages/deepseek-provider-adapter/
```

## Expert Review Notes

Accepted with follow-ups after M1 expert review:

- `packages/protocol` is a pure contract package. It must not contain policy runtime, transport runtime, provider calls, filesystem access, network calls, or mobile privilege logic.
- `packages/marketplace-preflight`, if added, is a development/release tool only. It is not part of the MVP runtime plugin set.
- The policy plugin produces decisions and leases; host/tool boundaries must enforce those decisions.
- Production packages must not depend on `packages/mock-dsh-host`.

## Open Questions

- Is upstream DSH provider sufficient for MVP?
- Does target marketplace allow a plugin bundle composed of multiple packages?
- Should `mobile-surface-web` be distributed as a DSH UI plugin, a static asset, or both?

## Consequences

### Positive

- Clear reviewable boundaries.
- Smaller permission surfaces.
- Easier contract testing.
- Marketplace metadata can be generated per plugin.

### Negative

- More package coordination.
- Shared protocol versioning must be disciplined.
- Bundle installation story must be designed.

### Follow-Up Work

- Create package manifests.
- Define package dependency graph.
- Decide whether provider adapter is included in MVP.
- Add manifest schema tests.
