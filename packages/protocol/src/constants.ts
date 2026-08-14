export const PROTOCOL_NAME = "dsh-mobile-bridge" as const;
export const PROTOCOL_MAJOR = 1 as const;
export const PROTOCOL_MINOR = 0 as const;

export const REDACTED_SECRET = "[REDACTED]" as const;

export const HIGH_RISK_CAPABILITIES = [
  "tool.fs.write.workspace",
  "tool.fs.read.external",
  "tool.fs.write.external",
  "tool.shell.execute",
  "artifact.read.full",
  "settings.credentials.write",
  "plugin.install",
  "plugin.enable",
  "relay.enable"
] as const;
