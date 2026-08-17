# Foundation Expanded Test Matrix Report

## Scope

Branch: `feature/foundation-expanded-test-matrix`

Purpose: strengthen the mock-only mobile-PC plugin foundation before adding new runtime capability. This report archives the local verification evidence for the P0 and P1 foundation test expansions.

## P0 Test Expansion

### Added Coverage

- Protocol strictness and secret canaries:
  - approval preview secret-like content rejection
  - mobile-safe event secret-like content rejection
  - artifact and transport sensitive field rejection
- Pairing/session state machine:
  - trust level escalation rejection
  - expired session challenge rejection
  - reused session open request rejection
  - challenge/device mismatch rejection
- Transport binding:
  - resume requires matching endpoint/session/device binding
  - stopped endpoint rejects resume
- Event evidence:
  - control event sequence monotonicity
  - run event append-only behavior
  - session closure audit evidence

### Local Verification

Commands executed:

```text
npm run lint
npm run test:contract
npm run test:security
npm run test:recovery
npm run verify
npm run test:e2e
npm run preflight:marketplace
git diff --check
```

Result:

```text
PASS
```

`npm run test` summary from `npm run verify`:

```text
Test Files: 11 passed
Tests: 48 passed
```

Named test suites:

```text
contract:   2 files, 19 tests passed
security:   5 files, 22 tests passed
recovery:   2 files, 4 tests passed
e2e:        1 file, 1 test passed
preflight:  1 file, 2 tests passed
```

### Notes

- All work remains mock-only.
- No real LAN listener, shell execution, DSH integration, provider call, or mobile runtime was introduced.
- P0 changes include minimal fail-closed validation needed by the new tests.

## P1 Test Expansion

### Added Coverage

- Lightweight protocol fuzz/property matrix:
  - valid fixtures for core schema records
  - non-object root rejection
  - numeric boundary rejection
  - TTL window rejection
- Replay matrix:
  - same sequence rejection
  - lower sequence rejection
  - nonce replay with higher sequence rejection
  - session/device principal mismatch rejection
  - unsupported protocol version rejection
- Recovery fault matrix:
  - `mobile_disconnect` run failure evidence
  - `worker_crash` run failure evidence
  - `approval_timeout` run failure evidence
  - PC restart closes all active sessions
  - transport stop/start preserves endpoint identity and resumes events
- Manifest/package alignment:
  - plugin manifests validate against schema
  - plugin package names use `@dsh-mobile/*`
  - `pluginVersion` matches package version
  - plugin IDs end with declared plugin type
  - runtime plugin packages depend on `@dsh-mobile/protocol`
  - MVP plugin secret permissions remain empty
- Verification gate:
  - `npm run verify` now explicitly includes `test:e2e`
  - `npm run verify` now explicitly includes `preflight:marketplace`

### Local Verification

Commands executed:

```text
npm run lint
npm run test:contract
npm run test:security
npm run test:recovery
npm run verify
git diff --check
```

Result:

```text
PASS
```

Updated `npm run verify` command:

```text
npm run lint &&
npm run test &&
npm run test:contract &&
npm run test:security &&
npm run test:recovery &&
npm run test:e2e &&
npm run preflight:marketplace
```

`npm run test` summary from `npm run verify`:

```text
Test Files: 15 passed
Tests: 94 passed
```

Named test suites:

```text
contract:   4 files, 56 tests passed
security:   6 files, 26 tests passed
recovery:   3 files, 9 tests passed
e2e:        1 file, 1 test passed
preflight:  1 file, 2 tests passed
```

### Notes

- P1 expansion remains mock-only.
- The total suite grew from 48 tests after P0 to 94 tests after P1.
- `git diff --check` passed after the P1 changes.
- No real LAN listener, shell execution, DSH integration, provider call, relay, or mobile runtime was introduced.
