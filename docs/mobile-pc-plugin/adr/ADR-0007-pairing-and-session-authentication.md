# ADR-0007: Pairing and Session Authentication

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

- GAP-032
- GAP-033
- GAP-034
- GAP-035
- GAP-036
- GAP-038
- GAP-087
- GAP-088

## Context

ADR-0006 defines the core protocol schema, but it does not decide how a mobile device becomes trusted or how each RPC envelope is authenticated.

The mobile-PC linkage plugin needs a pairing and session model before LAN transport or mobile UI work can proceed. Without this decision, later work may accidentally normalize unsafe shortcuts such as long-lived QR tokens, unauthenticated local RPC, mobile-side secrets, or replayable session messages.

`AGENTS.md` requires:

- PC is the trust root;
- mobile submits intent, not commands;
- transport is replaceable and authenticated;
- secrets never cross the mobile boundary;
- pairing QR codes do not contain API keys, long-lived session tokens, workspace paths, prompts, or secrets;
- unauthenticated localhost/LAN RPC is forbidden;
- important actions emit append-only evidence events.

## Decision

Use a two-phase model:

1. Pairing establishes a trusted mobile device identity.
2. Session authentication establishes a short-lived authenticated session for RPC envelopes.

Pairing uses a PC-created `PairingOffer`:

- `pairingId`
- one-time `pairingCode`
- `createdAt`
- `expiresAt`
- `entropyBits`
- `oneTime: true`
- PC display metadata
- authenticated transport hint
- allowed trust levels

The mobile responds with `PairingCompletion`:

- `pairingId`
- `pairingCode`
- requested trust level
- device registration with device ID, display name, public key, and platform
- nonce
- signature

The pairing code is allowed to appear in a QR code only because it is short-lived and one-time. It is not a session token and does not grant direct tool, shell, filesystem, provider, or artifact access.

Session authentication uses a challenge-response flow:

1. PC creates `SessionChallenge` for a paired, non-revoked device.
2. Mobile sends `SessionOpenRequest` with challenge, nonce, and signature.
3. PC creates a short-lived session bound to device ID, principal, trust level, sequence counter, expiry, and seen nonces.
4. Every `RpcEnvelope.auth` uses `SessionProof`.

Each RPC envelope must pass:

- core schema validation;
- session active check;
- session expiry check;
- device revocation check;
- session/device principal match;
- monotonic sequence check;
- nonce replay check;
- session proof verification.

M1 implements this as deterministic mock-only authentication in `packages/mock-dsh-host`. It does not implement production cryptography, OS key storage, real QR scanning, real LAN transport, or real DSH session APIs.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | Directly trust mobile after scanning a static token | Simple | Long-lived token risk, replayable, violates pairing QR constraints |
| B | One-time pairing code plus per-session challenge-response | Secure enough for M1, testable, transport-agnostic | Requires more state and negative tests |
| C | Full mTLS/device cert model in M1 | Strong production direction | Too heavy before LAN and DSH compatibility are settled |
| D | OAuth/device-code style relay pairing | Familiar | Relay is out of MVP scope |

## Rationale

Option B preserves the intended trust boundary while staying mock-only. It gives the project executable tests for replay rejection, pairing reuse rejection, session expiry, device revocation, and PC restart behavior before implementing LAN transport.

This also keeps transport replaceable: LAN, relay, or future P2P can carry the same typed pairing/session records without changing mobile execution semantics.

## Security and Privacy Impact

Pairing payloads must not include:

- API keys;
- provider credentials;
- long-lived session tokens;
- workspace paths;
- prompts;
- shell/cwd/env fields;
- raw filesystem or tool capability.

Session state is PC-side. Mobile stores only its own device identity/key material and short-lived session state. Provider credentials and DSH runtime secrets remain PC-side.

Replay protections:

- pairing code is one-time;
- pairing offer has TTL;
- session challenge has TTL;
- RPC sequence numbers must increase;
- RPC nonces cannot be reused within a session.

Revocation behavior:

- revoked devices cannot open new sessions;
- active sessions for revoked devices become unusable;
- old sessions after PC restart are invalid and require a new challenge-response.

## Compatibility Impact

The protocol records are added to `packages/protocol` and remain mock-only for M1. Production cryptographic details may evolve once the LAN transport ADR and real DSH compatibility spike are complete.

Future changes that affect QR contents, trust levels, device identity, signature canonicalization, session expiry, replay rules, or revocation semantics require a new ADR or a superseding ADR.

## Testing Requirements

Add tests for:

- valid pairing offer and completion schema;
- forbidden fields in pairing payloads;
- valid session challenge, session open request, and session proof schema;
- pairing offer expiry rejection;
- pairing code one-time reuse rejection;
- invalid pairing signature rejection;
- invalid session open signature rejection;
- RPC sequence replay rejection;
- RPC nonce replay rejection;
- invalid RPC session proof rejection;
- session expiry rejection;
- device revocation rejection;
- PC restart invalidating existing sessions while preserving paired device trust for a new session.

## Implementation Notes

Expected files:

```text
docs/mobile-pc-plugin/adr/ADR-0007-pairing-and-session-authentication.md
docs/mobile-pc-plugin/adr/README.md
packages/protocol/src/types.ts
packages/protocol/src/schema.ts
packages/mock-dsh-host/src/mock-dsh-host.ts
tests/contract/protocol.test.ts
tests/security/mock-host.test.ts
tests/recovery/event-resume.test.ts
```

The mock host may expose deterministic helper methods for tests:

- `createPairingOffer`
- `createPairingCompletion`
- `completePairing`
- `createSessionChallenge`
- `createSessionOpenRequest`
- `completeSessionOpen`
- `expirePairing`
- `expireSession`
- `revokeDevice`
- `getControlEvents`

These helpers are test APIs, not production APIs.

## Open Questions

- Which production signature algorithm should be used for device keys?
- Where should mobile private keys be stored for mobile web/PWA versus native shell?
- Should pairing require PC-admin approval in MVP or only authenticated local user presence?
- How should LAN endpoint identity be authenticated before real LAN transport is implemented?

## Consequences

### Positive

- LAN transport can build on typed, authenticated session semantics.
- Replay and revocation behavior becomes test-visible.
- Pairing QR contents are constrained before UI work starts.
- PC restart recovery semantics are explicit.

### Negative

- Mock-only signatures are not production cryptography.
- More state must be carried in the mock host.
- Real device key storage remains unresolved until mobile surface ADR/work.

### Follow-Up Work

- ADR-0008: LAN transport and authenticated endpoint binding.
- ADR-0009: Policy, lease enforcement, and approval digest canonicalization.
- Add production cryptographic verification after DSH and LAN compatibility decisions.
- Add mobile key storage tests once mobile surface shape is decided.
