# DeepSeek Link Mobile-PC Plugin Docs

## Purpose

This folder contains detailed development archives for the DeepSeek Harness mobile-PC linkage plugin.

Top-level development rules live in `../../AGENTS.md`. This docs folder stores the concrete protocol, interface, sandbox, testing, and ADR-level details.

## Active Document

| Document | Purpose |
| --- | --- |
| `08-mobile-pc-plugin-constitution.md` | Detailed mobile-PC plugin specification covering core protocols, plugin interfaces, pairing/authentication, permission leases, sandbox policy, event evidence, testing gates, and MVP plugin scope. |
| `09-marketplace-ready-plugin-analysis.md` | Expert analysis for turning the mobile-PC plugin into a marketplace-ready, externally serviceable mature plugin. |
| `10-m0-gap-audit.md` | M0 gap audit listing concrete missing items, priorities, blocking stages, required evidence, and the recommended M1 backlog. |
| `adr/` | Architecture Decision Records for M1 prerequisites and later implementation decisions. |

## Current Product Boundary

The target is not a full mobile IDE and not a generic desktop shell.

```text
Mobile side = intent submission, approval, status, logs, result summary
PC side = DSH runtime, tools, sandbox, DeepSeek provider, secrets, artifacts
Plugin layer = pairing, authenticated transport, policy, event stream, mobile UI surface
```

## Operating Rule

Future project documents should be mobile-PC plugin specific.

Use `AGENTS.md` for concise constitutional rules. Use this docs folder for implementation details, schemas, ADRs, and verification records.
