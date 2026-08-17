import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "@dsh-mobile/protocol";

const pluginManifestPaths = [
  "packages/local-artifact-storage/plugin.manifest.json",
  "packages/mobile-approval-policy/plugin.manifest.json",
  "packages/mobile-bridge-transport/plugin.manifest.json",
  "packages/mobile-surface-web/plugin.manifest.json",
  "packages/token-usage-observer/plugin.manifest.json"
] as const;

interface PackageJson {
  name: string;
  version: string;
  private: boolean;
  dependencies?: Record<string, string>;
}

describe("plugin package manifest alignment", () => {
  it.each(pluginManifestPaths)("keeps %s aligned with package metadata", (manifestPath) => {
    const manifest = readJson<Record<string, unknown>>(manifestPath);
    const packageJson = readJson<PackageJson>(join(dirname(manifestPath), "package.json"));

    expect(validatePluginManifest(manifest).ok).toBe(true);
    expect(packageJson.name).toMatch(/^@dsh-mobile\//);
    expect(packageJson.private).toBe(true);
    expect(manifest.pluginVersion).toBe(packageJson.version);
    expect(String(manifest.id)).toMatch(new RegExp(`\\.${String(manifest.type)}$`));
  });

  it.each(pluginManifestPaths)("keeps runtime plugin packages dependent on protocol: %s", (manifestPath) => {
    const packageJson = readJson<PackageJson>(join(dirname(manifestPath), "package.json"));

    expect(packageJson.dependencies?.["@dsh-mobile/protocol"]).toBe("workspace:*");
  });

  it.each(pluginManifestPaths)("keeps MVP plugin secret permissions empty: %s", (manifestPath) => {
    const manifest = readJson<{ permissions: Record<string, unknown> }>(manifestPath);

    expect(manifest.permissions["secret.read"]).toEqual([]);
    expect(manifest.permissions["secret.write"]).toEqual([]);
  });
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8")) as T;
}
