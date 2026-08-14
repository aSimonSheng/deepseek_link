import type { Capability, PolicyDecision } from "@dsh-mobile/protocol";

const highRisk: ReadonlySet<Capability> = new Set([
  "tool.fs.write.workspace",
  "tool.fs.read.external",
  "tool.fs.write.external",
  "tool.shell.execute",
  "artifact.read.full",
  "settings.credentials.write",
  "plugin.install",
  "plugin.enable",
  "relay.enable"
]);

export function defaultPolicyDecision(capability: Capability): PolicyDecision {
  if (highRisk.has(capability)) {
    return {
      effect: "deny",
      reason: "High-risk capability requires an explicit approval request implementation"
    };
  }

  return {
    effect: "deny",
    reason: "M1 skeleton denies capabilities until policy fixtures are implemented"
  };
}
