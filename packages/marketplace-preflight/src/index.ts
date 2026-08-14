export interface MarketplaceMetadata {
  id: string;
  displayName: string;
  pluginVersion: string;
  checksum?: string;
  signature?: string;
  sbom?: string;
  provenance?: string;
}

export interface PreflightIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export function preflightMarketplaceMetadata(metadata: MarketplaceMetadata): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const serialized = JSON.stringify(metadata);

  if (!metadata.checksum) {
    issues.push({ code: "checksum_missing", message: "Checksum is required before marketplace submission.", severity: "warning" });
  }
  if (!metadata.signature) {
    issues.push({ code: "signature_missing", message: "Signature is required before marketplace submission.", severity: "warning" });
  }
  if (/sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]+|\/Users\/|SECRET=|TOKEN=|PASSWORD=/i.test(serialized)) {
    issues.push({ code: "metadata_secret_leak", message: "Marketplace metadata contains a secret-like value.", severity: "error" });
  }

  return issues;
}
