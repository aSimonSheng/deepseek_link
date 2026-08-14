# ADR-0004: Engineering Skeleton and Mock DSH Host

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

- GAP-007
- GAP-008
- GAP-009
- GAP-010
- GAP-011
- GAP-012

## Context

The repository currently contains only documentation and is not a git repository. M1 needs a real engineering skeleton before implementation can start.

The project also needs a mock DSH host because direct integration with live DSH APIs, tools, provider calls, and sandbox behavior is too risky and slow for initial contract testing.

## Decision

Use a TypeScript monorepo with a mock DSH host as the first executable target.

Recommended skeleton:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
packages/
  protocol/
  mock-dsh-host/
  mobile-bridge-transport/
  mobile-approval-policy/
  mobile-surface-web/
  token-usage-observer/
  local-artifact-storage/
  marketplace-preflight/     # dev/release tooling only, not runtime
tests/
  contract/
  security/
  recovery/
  e2e/
```

Use `pnpm` as the default package manager unless an existing DSH ecosystem constraint requires a different choice.

The mock DSH host should simulate:

- plugin registry
- event bus
- policy broker
- artifact store
- run lifecycle
- provider usage events
- tool approval requests
- interrupted run states

The mock host must not call real provider APIs, execute shell commands, access arbitrary files, or store secrets.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | TypeScript monorepo + mock host | Matches DSH/Node ecosystem, easy schema tests | Requires package setup |
| B | Single package prototype | Fast start | Poor package boundaries |
| C | Build directly against live DSH | Higher fidelity | Slower, riskier, harder to test failure paths |
| D | Python/Rust scaffold | Strong tooling in some areas | Misaligned with likely DSH plugin ecosystem |

## Rationale

TypeScript is the safest default because DSH and Cordis plugin ecosystems are JavaScript/TypeScript-oriented. It lets protocol schemas, manifest validation, plugin interfaces, and mobile web code share types.

The mock host lets M1 validate contract and security behavior before relying on unstable DSH preview APIs.

## Security and Privacy Impact

The mock host must enforce the same root security assumptions as production:

- mobile zero secret
- policy before capability
- approval digest required for high-risk actions
- append-only events
- artifact references before access
- no unauthenticated LAN RPC

This prevents tests from normalizing unsafe shortcuts.

## Compatibility Impact

The mock host is not a replacement for DSH compatibility testing. It is a contract test target.

M1 tests should run against mock host. M2/M3 should add a real DSH compatibility test lane once ADR-0002 confirms target API shape.

## Testing Requirements

Initial commands:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contract
pnpm test:security
pnpm test:recovery
pnpm test:e2e
```

M1 minimum:

- protocol schema tests
- manifest schema tests
- pairing/session mock tests
- task submit mock tests
- approval digest mock tests
- event resume mock tests
- mobile surface smoke test

## Expert Review Notes

Accepted with follow-ups after M1 expert review:

- The skeleton may be created now, but only for mock-only development.
- Do not integrate real DSH, real LAN control plane, real shell execution, arbitrary filesystem access, or real DeepSeek API calls in M1.
- Add strict TypeScript settings, package-local unit tests later, and root-level contract/security/recovery/e2e tests now.
- Mock host must expose deterministic fixtures and negative paths for authentication, replay rejection, approval digest, lease TTL/max-use, event resume, and secret redaction.
- Production packages must not depend on mock host.
- `packages/marketplace-preflight` is allowed as dev/release tooling only.

## Implementation Notes

The first engineering skeleton should avoid real DSH integration. It should create enough executable structure to test:

```text
pair -> authenticated session -> submit intent -> run_started event
-> approval_required event -> approve/deny -> artifact summary
```

No relay in M1.

No real shell execution in M1.

No real DeepSeek API call in M1.

## Open Questions

- Does the DSH ecosystem already standardize package manager choice?
- Should schemas be JSON Schema, Zod, or both?
- Should mobile surface start as plain web/PWA or as a DSH UI contribution package?
- How soon should real DSH integration tests be added?

## Consequences

### Positive

- Enables executable tests without waiting for upstream integration.
- Preserves package boundaries from ADR-0001.
- Gives marketplace preflight a concrete package graph.

### Negative

- Mock behavior may diverge from real DSH if compatibility tests are delayed.
- Requires discipline to prevent mock-only assumptions.

### Follow-Up Work

- Create TypeScript monorepo skeleton.
- Add `packages/protocol` first.
- Add mock host event and policy fixtures.
- Add initial contract tests.
- Later add real DSH compatibility lane.
