# ADR Review: M1 Prerequisites

## Date

2026-08-14

## Scope

Reviewed:

- `AGENTS.md`
- `ADR-0001: MVP Plugin Package Boundary`
- `ADR-0002: DSH Version Compatibility Target`
- `ADR-0003: Marketplace / Index Target`
- `ADR-0004: Engineering Skeleton and Mock DSH Host`

## Experts Consulted

| Expert View | Verdict |
| --- | --- |
| Task analysis | Block batch acceptance if ADR-0002 is treated as a concrete version claim; allow mock-only skeleton. |
| DSH/plugin integration | Accept with follow-ups. |
| Engineering/backend architecture | Accept with follow-ups. |
| Security release/DevOps | Accept with follow-ups. |
| Test certification | Accept with follow-ups. |

## Decision

Accepted ADR-0001, ADR-0003, and ADR-0004 with follow-ups.

Accepted ADR-0002 only as a compatibility strategy:

- Accepted: pinned-preview strategy, fail-closed activation, capability checks.
- Not accepted as complete: concrete DSH version range, public API stability, or provider reuse claim.
- Real DSH integration remains blocked until compatibility spike evidence exists.

## Follow-Ups Added to ADRs

- `packages/protocol` is pure contract only.
- `packages/marketplace-preflight` is dev/release tooling only, not runtime.
- Production packages must not depend on `packages/mock-dsh-host`.
- UI must not bypass authenticated transport and policy.
- Policy plugin produces decisions and leases; host/tool boundaries enforce them.
- Mock host is never a production DSH replacement.
- M1 cannot call real DSH, real shell, arbitrary filesystem, or real DeepSeek API.

## Allowed Next Step

Create the TypeScript monorepo engineering skeleton and mock-only test harness defined by ADR-0004.

## Still Blocked

Do not begin these until later ADRs and tests exist:

- Real DSH integration.
- Real LAN control plane.
- Real shell execution.
- Real filesystem mutation.
- Real DeepSeek provider call.
- Relay.
- Marketplace publishing.
- Provider compatibility claim.
