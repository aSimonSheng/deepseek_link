import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "@dsh-mobile/protocol";

const manifestPaths = [
  "packages/local-artifact-storage/plugin.manifest.json",
  "packages/mobile-approval-policy/plugin.manifest.json",
  "packages/mobile-bridge-transport/plugin.manifest.json",
  "packages/mobile-surface-web/plugin.manifest.json",
  "packages/token-usage-observer/plugin.manifest.json"
] as const;

function readManifest(path: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
}

function validManifest(): Record<string, unknown> {
  return {
    id: "dsh-mobile-test.transport",
    displayName: "DSH Mobile Test",
    type: "transport",
    manifestVersion: "1.0.0",
    pluginVersion: "0.0.0",
    apiVersion: "1.0",
    protocolVersion: "1.0",
    minDshVersion: "TBD",
    maxTestedDshVersion: "TBD",
    capabilities: ["mobile.pairing"],
    permissions: {
      "network.listen": ["127.0.0.1"],
      "secret.read": [],
      "secret.write": []
    }
  };
}

describe("plugin manifest contract", () => {
  it.each(manifestPaths)("validates %s", (path) => {
    const result = validatePluginManifest(readManifest(path));

    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects missing required fields", () => {
    const manifest = validManifest();
    delete manifest.displayName;

    const result = validatePluginManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "required_string_missing")).toBe(true);
  });

  it("rejects unknown plugin types", () => {
    const manifest = {
      ...validManifest(),
      type: "mobile-root"
    };

    const result = validatePluginManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unknown_plugin_type")).toBe(true);
  });

  it("rejects unknown permissions", () => {
    const manifest = {
      ...validManifest(),
      permissions: {
        "secret.read": [],
        "mobile.root": true
      }
    };

    const result = validatePluginManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unknown_permission")).toBe(true);
  });

  it("rejects mobile UI secret access", () => {
    const manifest = {
      ...validManifest(),
      type: "ui",
      permissions: {
        "secret.read": ["deepseek.api_key"]
      }
    };

    const result = validatePluginManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "mobile_forbidden_permission")).toBe(true);
  });

  it("rejects transport shell execution", () => {
    const manifest = {
      ...validManifest(),
      type: "transport",
      permissions: {
        "tool.shell.execute": true
      }
    };

    const result = validatePluginManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "mobile_forbidden_permission")).toBe(true);
  });

  it("rejects non-string capabilities", () => {
    const manifest = {
      ...validManifest(),
      capabilities: ["mobile.pairing", 42]
    };

    const result = validatePluginManifest(manifest);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "capability_not_string")).toBe(true);
  });
});
