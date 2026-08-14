# ADR Index

This directory stores Architecture Decision Records for the DSH Mobile-PC Plugin.

Top-level rules live in `../../../AGENTS.md`. ADRs must not weaken those rules. If an ADR needs to change a top-level rule, update `AGENTS.md` in the same change.

## Status Values

| Status | Meaning |
| --- | --- |
| `Proposed` | Draft decision, not yet binding. |
| `Accepted` | Binding decision for implementation. |
| `Superseded` | Replaced by a newer ADR. |
| `Rejected` | Explicitly not selected. |

## Numbering

Use monotonically increasing numbers:

```text
ADR-0001-short-title.md
ADR-0002-short-title.md
```

Do not renumber existing ADRs. If a decision changes, create a new ADR and mark the old one `Superseded`.

## Current ADRs

| ADR | Title | Status | Covers |
| --- | --- | --- | --- |
| [ADR-0001](./ADR-0001-mvp-plugin-package-boundary.md) | MVP Plugin Package Boundary | Accepted | GAP-001, GAP-013, GAP-014, GAP-015, GAP-016, GAP-017, GAP-018, GAP-020 |
| [ADR-0002](./ADR-0002-dsh-version-compatibility-target.md) | DSH Version Compatibility Target | Accepted | GAP-002, EXT-002 |
| [ADR-0003](./ADR-0003-marketplace-index-target.md) | Marketplace / Index Target | Accepted | GAP-003, GAP-004, EXT-001 |
| [ADR-0004](./ADR-0004-engineering-skeleton-and-mock-host.md) | Engineering Skeleton and Mock DSH Host | Accepted | GAP-007, GAP-008, GAP-009, GAP-010, GAP-011, GAP-012 |
| [ADR-0005](./ADR-0005-manifest-schema-and-permission-model.md) | Manifest Schema and Permission Model | Accepted | GAP-013, GAP-014, GAP-015, GAP-016, GAP-017, GAP-019, GAP-020, GAP-085 |
| [ADR-0006](./ADR-0006-core-protocol-schema.md) | Core Protocol Schema | Accepted | GAP-022, GAP-023, GAP-024, GAP-025, GAP-026, GAP-027, GAP-028, GAP-030, GAP-031, GAP-086 |
| [ADR-0007](./ADR-0007-pairing-and-session-authentication.md) | Pairing and Session Authentication | Accepted | GAP-032, GAP-033, GAP-034, GAP-035, GAP-036, GAP-038, GAP-087, GAP-088 |

## Reviews

| Review | Summary |
| --- | --- |
| [2026-08-14 M1 prerequisites](./ADR-REVIEW-2026-08-14-m1-prereqs.md) | Expert review of ADR-0001 through ADR-0004; accepts mock-only engineering skeleton while keeping real DSH integration blocked pending compatibility spike. |

## Required ADRs Before M1

The current M0 audit also requires later ADRs for:

- LAN transport.
- Policy, lease, and approval digest.
- Provider strategy.
- Artifact visibility and redaction.

These should be added before moving into M1 implementation.
