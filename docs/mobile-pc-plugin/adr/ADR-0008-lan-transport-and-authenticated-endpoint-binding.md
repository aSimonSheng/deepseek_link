# ADR-0008: LAN Transport and Authenticated Endpoint Binding

## Status

Accepted

## Date

2026-08-17

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

- GAP-039
- GAP-040
- GAP-041
- GAP-042
- GAP-087
- GAP-088

## Context

ADR-0006 defines protocol validation and ADR-0007 defines pairing/session authentication. The next M1 blocker is the transport boundary: how mobile-originated RPC and event streams are carried without allowing unauthenticated localhost or LAN control.

The project must avoid a common unsafe shortcut: exposing a local RPC server and relying on network location as trust. `AGENTS.md` explicitly forbids unauthenticated localhost/LAN RPC and default `0.0.0.0` control-plane listeners.

M1 is still mock-only. Real LAN sockets, TLS, certificate pinning, QR scanning, and DSH runtime integration remain blocked until later compatibility work.

## Decision

Define an M1 transport contract with three protocol records:

- `TransportEndpointConfig`
- `TransportEndpointBinding`
- `EventStreamCursor`

Default transport behavior:

1. Endpoints bind to loopback only by default.
2. LAN exposure requires explicit `enableLan: true`.
3. `0.0.0.0` is not a valid bind host in protocol schema.
4. Every endpoint must require authentication.
5. Every endpoint must require a session.
6. CSRF protection must be enabled.
7. Allowed origins are explicit metadata.
8. Session binding is per endpoint, session, device, and principal.
9. Event stream resume uses `fromSeq` plus a gap policy.

M1 implements these rules in the mock `dsh-mobile-bridge.transport` package. It does not open a real port. The package validates endpoint configuration and binding objects through `packages/protocol`.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | Keep transport as a placeholder | Fast | Leaves unauthenticated local RPC risk undefined |
| B | Define mock endpoint/binding schema now | Testable, keeps M1 mock-only, blocks unsafe defaults | Not a real LAN transport |
| C | Implement real LAN WebSocket now | Higher fidelity | Too early before endpoint security and DSH compatibility are stable |
| D | Add relay transport now | Useful later | Relay is explicitly out of MVP scope |

## Rationale

Option B is the right M1 step. It makes the security boundary executable before real LAN implementation exists.

The transport package can now prove:

- loopback is the default;
- LAN cannot appear accidentally;
- authenticated session binding is required before use;
- event resume has explicit replay and fail-closed modes.

This reduces later rework for LAN, mobile UI, approval policy, and event stream work.

## Security and Privacy Impact

The schema rejects unsafe transport defaults:

- no `0.0.0.0` bind host;
- no unauthenticated endpoint;
- no endpoint without session binding;
- no endpoint without CSRF protection;
- no LAN binding unless LAN is explicitly enabled.

Transport endpoint bindings must include:

- endpoint ID;
- session ID;
- device ID;
- principal;
- authentication marker;
- binding timestamps;
- event acknowledgement sequence;
- gap policy.

Event stream cursors must include:

- endpoint ID;
- session ID;
- device ID;
- run ID;
- `fromSeq`;
- gap policy;
- session proof.

Secrets, prompts, workspace paths, raw shell capability, and provider credentials remain outside the transport endpoint contract.

## Compatibility Impact

M1 adds TypeScript protocol records and validators only. There is no real LAN compatibility promise yet.

Future real LAN transport work must either implement this contract or supersede this ADR. Changes that affect bind hosts, LAN enablement, authentication requirements, session binding, origin policy, or event resume semantics require ADR review.

## Testing Requirements

Add tests for:

- valid loopback endpoint config;
- LAN bind rejected unless explicitly enabled;
- unauthenticated endpoint rejected;
- valid endpoint/session binding;
- principal/device mismatch rejected;
- valid event stream cursor;
- invalid event stream `fromSeq` rejected;
- transport default endpoint is loopback-only;
- explicit LAN endpoint sets LAN metadata;
- invalid ports rejected;
- binding before start rejected;
- event resume from known sequence works;
- fail-closed gap policy rejects missing event sequences.

## Implementation Notes

Expected files:

```text
docs/mobile-pc-plugin/adr/ADR-0008-lan-transport-and-authenticated-endpoint-binding.md
docs/mobile-pc-plugin/adr/README.md
packages/protocol/src/types.ts
packages/protocol/src/schema.ts
packages/mobile-bridge-transport/src/index.ts
tests/contract/protocol.test.ts
tests/security/transport.test.ts
tests/recovery/transport-resume.test.ts
tsconfig.base.json
tests/tsconfig.json
vitest.config.ts
```

The mock transport may expose deterministic test APIs:

- `start`
- `stop`
- `endpoint`
- `bindSession`
- `resumeEvents`

These are not production socket APIs.

## Open Questions

- Should real LAN use WebSocket, HTTPS, or SSE plus RPC?
- Should endpoint identity use mTLS, pinned local certificate, or DSH-provided session keys?
- How should browser/PWA origin policy differ from native mobile shell policy?
- Which PC-admin action enables LAN exposure in the final UI?

## Consequences

### Positive

- Unsafe default LAN exposure becomes schema-visible.
- Transport work can proceed without weakening pairing/session auth.
- Event resume behavior is testable before real streams exist.

### Negative

- The transport package remains mock-only.
- Real LAN security design still needs a later ADR or extension.
- Origin/CSRF policy is represented as metadata, not enforced by a real HTTP layer yet.

### Follow-Up Work

- ADR-0009: Policy, lease enforcement, and approval digest canonicalization.
- Add real LAN transport implementation only after compatibility and endpoint identity are settled.
- Add mobile surface tests for LAN enablement and session resume UX.
