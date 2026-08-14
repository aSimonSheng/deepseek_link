# ADR-0006: Core Protocol Schema

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

- GAP-022
- GAP-023
- GAP-024
- GAP-025
- GAP-026
- GAP-027
- GAP-028
- GAP-030
- GAP-031
- GAP-086

## Context

ADR-0005 established manifest validation. The next M1 blocker is the runtime protocol contract between mobile surfaces, transport plugins, policy plugins, the mock DSH host, and later the real DSH adapter.

The current TypeScript types describe core objects, but the runtime checks are incomplete. A mobile-triggered flow must reject malformed envelopes, unsupported protocol versions, direct command submissions, invalid approvals, unscoped high-risk leases, unsafe artifact references, and unknown error/event values before those values reach plugin logic.

`AGENTS.md` requires:

- mobile submits intent, not commands;
- policy precedes capability;
- high-risk grants use scoped, revocable leases with TTL and max-use limits;
- approval is bound to an exact action digest;
- events are append-only evidence;
- artifacts are referenced before accessed;
- mobile-visible data carries redaction metadata.

## Decision

Define the M1 core protocol schema as TypeScript types plus pure runtime validation helpers in `packages/protocol`.

M1 validates these core records:

- `ProtocolVersion`
- `RpcEnvelope`
- `RpcResponse`
- `RpcError`
- `HarnessEvent`
- `TaskIntent`
- `ApprovalRequest`
- `ApprovalDecision`
- `CapabilityLease`
- `ArtifactReference`
- `RedactionMetadata`

The validation layer returns structured issues with:

- `code`
- `message`
- `path`
- `severity`

Rules:

1. `protocol.name` must be `dsh-mobile-bridge`.
2. `protocol.major` must match the current supported major.
3. `protocol.minor` must be a non-negative integer.
4. RPC envelopes must include session proof auth, sequence number, timestamp, method, and explicit `params`.
5. Task intents must use `workspace:current` and `agent.run`, and must not include direct command, shell, cwd, env, token, API key, or secret fields.
6. Approval requests must include an action digest using `sha256:<digest>`.
7. Approval decisions must include confirmed user presence and a signature.
8. Capability leases must include TTL, max-use, principal, scope, and a known capability.
9. High-risk capability leases must include an `actionDigest`.
10. Events must include typed event names, sequence numbers, source metadata, and redaction metadata.
11. Artifact references must include visibility, digest, redaction state, size, and `artifact.get` as the download method.
12. Mobile-visible artifact references cannot have `redaction: required`.
13. Unknown RPC error codes are rejected.

M1 does not add external JSON Schema artifacts or a schema dependency. JSON Schema can be added later for marketplace tooling once the protocol stabilizes.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | Keep TypeScript types only | Fast | Runtime cannot reject malformed or unsafe payloads |
| B | Add pure TypeScript validators | No dependency, testable, matches current manifest approach | Not directly consumable by external schema tools |
| C | Add JSON Schema now | Tool-friendly | Adds duplicated schema maintenance before protocol stabilizes |
| D | Add Zod or similar | Rich schema ergonomics | Adds dependency and runtime surface before M1 contracts settle |

## Rationale

Option B matches ADR-0005 and keeps `packages/protocol` as the single source of contract truth during M1. It gives immediate contract tests without introducing a schema library or code generation path.

The protocol is still mock-only. Real DSH integration, real LAN control plane, real shell execution, and real provider calls remain blocked until later ADRs and compatibility work.

## Security and Privacy Impact

The schema validation layer blocks:

- mobile payloads that try to submit commands instead of intents;
- malformed session proof envelopes;
- unsupported protocol major versions;
- unknown event and error values;
- high-risk leases without action digests;
- mobile-visible artifact references that still require redaction;
- approval requests without digest binding.

It does not authenticate sessions, verify signatures, evaluate policy, or enforce leases by itself. Those remain runtime responsibilities for later M1/M2 work.

## Compatibility Impact

`ProtocolVersion.major` is the compatibility boundary. A different major is rejected. Minor versions are non-negative integers and may be used later for backward-compatible extension negotiation.

Schema changes that alter security behavior, accepted protocol major versions, task intent semantics, approval digest requirements, lease enforcement, artifact visibility, or event redaction must use a new ADR.

## Testing Requirements

Add contract tests for:

- valid RPC envelope created by the mock host;
- missing RPC auth;
- unsupported protocol major;
- valid task intent;
- task intent with direct command field;
- task intent with provider API key field;
- valid approval request and decision;
- approval request with invalid digest;
- low-risk lease without digest;
- high-risk lease without digest;
- high-risk lease with digest;
- valid event, response, and artifact reference;
- unknown RPC error code;
- mobile-visible artifact with `redaction: required`.

## Implementation Notes

Expected files:

```text
packages/protocol/src/schema.ts
packages/protocol/src/guards.ts
packages/protocol/src/index.ts
tests/contract/protocol.test.ts
```

`hasProtocolEnvelope` should reuse `validateRpcEnvelope` so the mock host and tests share the strict contract.

## Open Questions

- Should M2 publish JSON Schema files for marketplace and external mobile clients?
- Should approval digest canonicalization be defined in ADR-0008 or split into a separate ADR?
- Should mobile-safe event filtering be a schema validator or a transport/policy responsibility?

## Consequences

### Positive

- Core protocol payloads become machine-verifiable.
- Contract tests now catch malformed mobile payloads before transport work starts.
- The mock host uses the same envelope validation path as external callers.

### Negative

- The M1 schema is stricter than plain TypeScript assignment.
- Future protocol extensions may require validator changes and migration tests.

### Follow-Up Work

- ADR-0007: Pairing and session authentication.
- ADR-0008: Policy, lease enforcement, and approval digest canonicalization.
- ADR-0009: Append-only event store and audit catalog.
- Add JSON Schema artifacts before marketplace RC if external tooling requires them.
