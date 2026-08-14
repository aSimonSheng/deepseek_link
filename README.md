# DeepSeek Link

This repository contains the engineering skeleton for the DeepSeek Harness mobile-PC linkage plugin.

## Current Stage

M1 prerequisite skeleton, mock-only.

Allowed:

- TypeScript workspace setup.
- Protocol contracts.
- Mock DSH host.
- Mock contract/security/recovery/e2e tests.
- Marketplace preflight placeholder tooling.

Not allowed in this stage:

- Real DSH integration.
- Real LAN control plane.
- Real shell execution.
- Arbitrary filesystem access.
- Real DeepSeek API calls.
- Relay.
- Marketplace publishing.

See:

- `AGENTS.md`
- `docs/mobile-pc-plugin/adr/README.md`
- `docs/mobile-pc-plugin/10-m0-gap-audit.md`

## Intended Commands

These commands require Node.js and pnpm:

```bash
pnpm install
pnpm verify
pnpm test:e2e
```
