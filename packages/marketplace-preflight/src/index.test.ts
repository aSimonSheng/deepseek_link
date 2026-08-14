import { describe, expect, it } from "vitest";
import { preflightMarketplaceMetadata } from "./index.js";

describe("marketplace preflight", () => {
  it("warns for missing supply-chain fields without failing clean metadata", () => {
    const issues = preflightMarketplaceMetadata({
      id: "dsh-mobile-bridge.transport",
      displayName: "DSH Mobile Bridge Transport",
      pluginVersion: "0.0.0"
    });

    expect(issues.some((issue) => issue.code === "checksum_missing")).toBe(true);
    expect(issues.some((issue) => issue.code === "signature_missing")).toBe(true);
    expect(issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("errors on secret-like metadata", () => {
    const issues = preflightMarketplaceMetadata({
      id: "dsh-mobile-bridge.transport",
      displayName: "Bearer abc.def.ghi",
      pluginVersion: "0.0.0"
    });

    expect(issues.some((issue) => issue.code === "metadata_secret_leak")).toBe(true);
  });
});
