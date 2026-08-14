# AGENTS.md

## Scope

This repository is currently scoped to the DeepSeek Harness mobile-PC linkage plugin.

The product boundary is:

```text
Mobile side = intent submission, approval, status, logs, result summary
PC side = DSH runtime, tools, sandbox, DeepSeek provider, secrets, artifacts
Plugin layer = pairing, authenticated transport, policy, event stream, mobile UI surface
```

Do not reintroduce generic desktop migration work unless it is explicitly required by the mobile-PC plugin.

## Authority

This file is the top-level development constitution for agents working in this repository.

Detailed development specifications live under:

- `docs/mobile-pc-plugin/README.md`
- `docs/mobile-pc-plugin/08-mobile-pc-plugin-constitution.md`
- `docs/mobile-pc-plugin/adr/README.md`

If this file conflicts with a detailed docs file, this file wins. Update both in the same change when a rule changes.

## Non-Negotiable Rules

1. Everything is a plugin.
   DSH kernel behavior must stay minimal. DeepSeek provider, mobile bridge, tools, policy, transport, observers, reports, and UI surfaces are plugins or plugin contributions.

2. PC is the trust root.
   DSH runtime, tool execution, sandboxing, secrets, and artifacts stay on the PC side. Mobile never receives raw secrets or raw filesystem/shell capability.

3. Mobile submits intent, not commands.
   Mobile may request tasks, approve actions, view status, inspect redacted logs, and read result summaries. It must not directly execute shell, mutate files, or call provider APIs.

4. Headless reproducibility is mandatory.
   Any mobile-triggered task must be reproducible through an equivalent headless DSH input. Mobile is a surface, not a separate execution semantics.

5. Transport is replaceable and authenticated.
   LAN, relay, or future P2P transports must share typed protocol contracts. Unauthenticated localhost/LAN RPC is forbidden.

6. Policy precedes capability.
   Plugin capability declarations do not grant permission. High-risk actions require policy evaluation and usually explicit approval.

7. Secrets never cross the mobile boundary.
   API keys and credentials may only exist in PC-side secret storage, startup environment, or short-lived PC process memory. They must not appear in mobile storage, RPC payloads, events, artifacts, crash reports, diagnostics, WebView cache, localStorage, or ordinary config.

8. Events are append-only evidence.
   Important actions must emit structured events with run IDs, plugin IDs, principals, sequence numbers, and redaction metadata. Corrections are new events, not in-place mutation.

9. Artifacts are referenced before accessed.
   Mobile receives artifact references and redacted summaries by default. Full artifact access requires policy control and may require approval.

10. Unsafe convenience is not acceptable.
    Do not trade authentication, sandboxing, secret hygiene, or evidence integrity for faster UI flow.

## Permission Defaults

Default policy posture:

- `task.submit`: allowed for authenticated operator devices.
- `task.cancel`: allowed for authenticated operator devices within scope.
- `run.events.read`: allowed only for redacted/mobile-safe event streams.
- `artifact.read.summary`: allowed for mobile-safe summaries.
- `artifact.read.full`: approval required.
- `tool.fs.write.workspace`: approval required.
- `tool.shell.execute`: approval required.
- `tool.fs.read.external`: denied by default.
- `tool.fs.write.external`: denied by default.
- `secret.read`: denied for mobile.
- `plugin.install`, `plugin.enable`, `settings.credentials.write`, `relay.enable`: PC-admin only.

All high-risk permission grants must be represented as scoped, revocable leases with TTL and max-use limits.

## Required Development Flow

Before implementing a feature:

1. Confirm it belongs to the mobile-PC plugin scope.
2. Identify the plugin type and affected protocol.
3. Add or update the detailed docs entry in `docs/`.
4. Define manifest permissions, policy decisions, audit events, recovery behavior, and tests.
5. Create an ADR when the change affects transport, pairing/authentication, permission policy, artifact visibility, event schema, provider secret handling, or upstream compatibility.

Before marking a feature done:

1. Contract tests pass for schema and plugin interfaces.
2. Security tests pass for authentication, replay rejection, permissions, approvals, and secret redaction.
3. Recovery tests pass for disconnects, PC restart, worker crash, approval timeout, and transport failure.
4. Logs and artifacts are redacted and reproducible.
5. Documentation is updated.

## Forbidden Designs

The following designs are not allowed:

- Mobile directly accesses DSH's unauthenticated local RPC.
- PC listens on `0.0.0.0` for the control plane by default.
- Pairing QR codes contain API keys, long-lived session tokens, workspace absolute paths, prompts, or secrets.
- Mobile stores DeepSeek API keys or provider credentials.
- Approval is not bound to an exact action digest.
- A plugin uses capabilities not declared in its manifest.
- A tool runs outside policy and sandbox checks.
- Relay can read prompt/code/log content or forge either endpoint.
- Token/cache metrics are fabricated when provider data is unavailable.
- Generic desktop shell work is mixed into this project without mobile-PC linkage justification.

## MVP Scope

The MVP plugin set is:

- `dsh-mobile-bridge.transport`
- `dsh-mobile-approval.policy`
- `dsh-mobile-surface.ui`
- `dsh-deepseek-provider.provider` or an upstream-compatible provider plugin
- `dsh-token-usage.observer`
- `dsh-local-artifact.storage`

MVP excludes relay, plugin marketplace, mobile code editing, mobile credential management, arbitrary remote shell, and multi-PC orchestration.

## Documentation Split

Keep this file concise and normative.

Keep detailed development material in docs:

- protocol schemas
- plugin TypeScript interfaces
- pairing flows
- session authentication
- permission lease formats
- sandbox policy details
- event catalog
- mobile UI rules
- test matrices
- ADRs

Do not duplicate long protocol definitions in this file.
