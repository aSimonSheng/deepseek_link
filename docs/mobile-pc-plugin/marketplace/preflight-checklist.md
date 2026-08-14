# Marketplace Preflight Checklist

## M1 Mock Checks

- Manifest exists.
- Manifest has plugin ID, display name, type, version fields, and protocol version.
- Manifest declares permissions explicitly.
- Metadata does not contain API keys, bearer tokens, workspace paths, prompt content, raw logs, or artifact contents.
- Metadata reserves checksum, signature, SBOM, and provenance fields.

## M3 Real Checks

- Package checksum is generated and verified.
- Plugin package is signed.
- SBOM is generated.
- Provenance is generated.
- Dependency and license scans pass.
- Permission delta review is required for upgrades.
