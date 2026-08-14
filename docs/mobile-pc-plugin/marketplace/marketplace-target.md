# Marketplace Target

## Status

M1 uses a local mock marketplace/index for preflight validation.

## Staged Target

1. M1: mock marketplace/index.
2. M3: community-index-compatible metadata.
3. M5: revisit official marketplace requirements if stable rules exist.

## Runtime Boundary

Marketplace metadata and preflight tooling are not runtime plugin capabilities.

Runtime packages must not depend on marketplace-specific field names.
