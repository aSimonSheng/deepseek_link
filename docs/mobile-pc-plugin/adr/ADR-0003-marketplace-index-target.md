# ADR-0003: Marketplace / Index Target

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

- GAP-003
- GAP-004
- EXT-001
- EXT-003
- EXT-004
- EXT-005

## Context

The project goal is to become a mature plugin that can connect to a DeepSeek Harness plugin marketplace. The exact target marketplace rules are not yet confirmed.

Known ecosystem signals:

- DSH publicly positions itself as "Everything is a plugin".
- Community indexes such as `dsh-index` already list DSH plugins and agents.
- A future official marketplace may have stricter rules than community indexes.

The project needs a target for M1 without pretending the final official marketplace requirements are known.

## Decision

Use a staged marketplace target:

1. M1 uses a local mock marketplace/index for preflight validation.
2. M3 targets community-index-compatible metadata as the first external packaging shape.
3. M5 revisits official marketplace requirements if a stable official process exists.

The project should not build marketplace-specific behavior into runtime code. Marketplace support is packaging, metadata, signing, compatibility, and certification around the plugin packages.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A | Target official marketplace immediately | Best if rules are stable | Rules currently unverified |
| B | Target community dsh-index first | Real ecosystem path | May not match future official requirements |
| C | Build local mock marketplace first, then adapt | Enables M1 progress without false assumptions | Extra adapter work later |

## Rationale

Option C is the safest M1 target. It lets us define and test:

- manifest shape
- package metadata
- permission declaration
- compatibility fields
- checksum/signature placeholders
- marketplace preflight checks

Then M3 can adapt to community index metadata, and M5 can align with official rules if available.

## Security and Privacy Impact

Marketplace metadata must never include:

- API keys
- pairing tokens
- workspace paths
- prompt content
- raw logs
- artifact contents

Marketplace listing should include a permission explanation, privacy summary, and security contact.

If a future marketplace requires relay service metadata, relay must remain a separately approved high-risk capability.

## Compatibility Impact

The plugin packages should emit neutral metadata first, then transform it into marketplace-specific index records.

Expected layers:

```text
plugin.manifest.json
-> marketplace.preflight.json
-> community-index record or official marketplace record
```

Runtime packages must not depend on marketplace-specific field names.

## Testing Requirements

- Mock marketplace install validation.
- Manifest-to-index transform tests.
- Permission risk scoring tests.
- Missing metadata failure tests.
- Signature/checksum placeholder validation.
- Privacy field validation.

## Expert Review Notes

Accepted with follow-ups after M1 expert review:

- M1 marketplace work is limited to mock index metadata and preflight checks.
- Marketplace preflight must never become a runtime plugin or mobile-visible capability.
- Mock index schema should reserve `checksum`, `signature`, `sbom`, and `provenance` fields even if M1 uses placeholders.
- Marketplace metadata must be validated to exclude secrets, workspace paths, prompts, raw logs, and artifact contents.

## Implementation Notes

Expected M1/M3 artifacts:

```text
docs/mobile-pc-plugin/marketplace/
  marketplace-target.md
  preflight-checklist.md
  mock-index-schema.json

packages/marketplace-preflight/
  src/
  tests/
```

## Open Questions

- Which marketplace will be treated as the first real external target?
- Does the target index require package mirroring or direct upstream references?
- Does the target marketplace support plugin bundles?
- Are signatures required by the target marketplace, or only by our own policy?
- Can a plugin listing include an external mobile web surface?

## Consequences

### Positive

- M1 can progress without waiting for official rules.
- Keeps runtime decoupled from marketplace-specific metadata.
- Enables automated preflight early.

### Negative

- A later official marketplace may require metadata migration.
- Mock marketplace may miss real review constraints.

### Follow-Up Work

- Create mock marketplace schema.
- Create marketplace preflight checklist.
- Investigate official marketplace and dsh-index submission requirements.
- Decide M3 external index target.
