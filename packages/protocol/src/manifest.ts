export type PluginType =
  | "provider"
  | "task"
  | "dataset"
  | "evaluator"
  | "tool"
  | "reporter"
  | "transport"
  | "storage"
  | "policy"
  | "observer"
  | "ui";

export type ManifestPermissionName =
  | "network.listen"
  | "network.connect"
  | "secret.read"
  | "secret.write"
  | "artifact.read.summary"
  | "artifact.read.full"
  | "task.submit"
  | "task.cancel"
  | "run.events.read"
  | "tool.fs.read.workspace"
  | "tool.fs.write.workspace"
  | "tool.fs.read.external"
  | "tool.fs.write.external"
  | "tool.shell.execute"
  | "tool.network.connect"
  | "plugin.install"
  | "plugin.enable"
  | "settings.credentials.write"
  | "relay.enable";

export type ManifestPermissionScope = boolean | string[];

export interface PluginManifest {
  id: string;
  displayName: string;
  type: PluginType;
  manifestVersion: string;
  pluginVersion: string;
  apiVersion: string;
  protocolVersion: string;
  minDshVersion: string;
  maxTestedDshVersion: string;
  capabilities: string[];
  permissions: Partial<Record<ManifestPermissionName, ManifestPermissionScope>>;
}

export interface ManifestValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: "error" | "warning";
}

export interface ManifestValidationResult {
  ok: boolean;
  issues: ManifestValidationIssue[];
}

export const PLUGIN_TYPES: readonly PluginType[] = [
  "provider",
  "task",
  "dataset",
  "evaluator",
  "tool",
  "reporter",
  "transport",
  "storage",
  "policy",
  "observer",
  "ui"
] as const;

export const MANIFEST_PERMISSION_NAMES: readonly ManifestPermissionName[] = [
  "network.listen",
  "network.connect",
  "secret.read",
  "secret.write",
  "artifact.read.summary",
  "artifact.read.full",
  "task.submit",
  "task.cancel",
  "run.events.read",
  "tool.fs.read.workspace",
  "tool.fs.write.workspace",
  "tool.fs.read.external",
  "tool.fs.write.external",
  "tool.shell.execute",
  "tool.network.connect",
  "plugin.install",
  "plugin.enable",
  "settings.credentials.write",
  "relay.enable"
] as const;

export const MOBILE_FACING_PLUGIN_TYPES: readonly PluginType[] = ["transport", "ui"] as const;

export const MOBILE_FORBIDDEN_PERMISSIONS: readonly ManifestPermissionName[] = [
  "secret.read",
  "secret.write",
  "tool.fs.write.workspace",
  "tool.fs.read.external",
  "tool.fs.write.external",
  "tool.shell.execute",
  "plugin.install",
  "plugin.enable",
  "settings.credentials.write",
  "relay.enable"
] as const;

const requiredStringFields: readonly (keyof Omit<PluginManifest, "capabilities" | "permissions">)[] = [
  "id",
  "displayName",
  "type",
  "manifestVersion",
  "pluginVersion",
  "apiVersion",
  "protocolVersion",
  "minDshVersion",
  "maxTestedDshVersion"
] as const;

const pluginTypeSet = new Set<string>(PLUGIN_TYPES);
const permissionSet = new Set<string>(MANIFEST_PERMISSION_NAMES);
const mobileTypeSet = new Set<string>(MOBILE_FACING_PLUGIN_TYPES);
const mobileForbiddenSet = new Set<string>(MOBILE_FORBIDDEN_PERMISSIONS);

export function validatePluginManifest(value: unknown): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "manifest_not_object",
          message: "Plugin manifest must be an object.",
          path: "$",
          severity: "error"
        }
      ]
    };
  }

  for (const field of requiredStringFields) {
    if (typeof value[field] !== "string" || value[field].trim() === "") {
      issues.push({
        code: "required_string_missing",
        message: `${String(field)} must be a non-empty string.`,
        path: `$.${String(field)}`,
        severity: "error"
      });
    }
  }

  if (typeof value.id === "string" && !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value.id)) {
    issues.push({
      code: "invalid_plugin_id",
      message: "id must use lowercase letters, digits, dots, or hyphens.",
      path: "$.id",
      severity: "error"
    });
  }

  if (typeof value.type === "string" && !pluginTypeSet.has(value.type)) {
    issues.push({
      code: "unknown_plugin_type",
      message: `Unknown plugin type: ${value.type}.`,
      path: "$.type",
      severity: "error"
    });
  }

  validateCapabilities(value.capabilities, issues);
  validatePermissions(value, issues);

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

export function assertValidPluginManifest(value: unknown): asserts value is PluginManifest {
  const result = validatePluginManifest(value);
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}

function validateCapabilities(value: unknown, issues: ManifestValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({
      code: "capabilities_not_array",
      message: "capabilities must be an array.",
      path: "$.capabilities",
      severity: "error"
    });
    return;
  }

  if (value.length === 0) {
    issues.push({
      code: "capabilities_empty",
      message: "capabilities must contain at least one capability.",
      path: "$.capabilities",
      severity: "error"
    });
  }

  value.forEach((capability, index) => {
    if (typeof capability !== "string" || capability.trim() === "") {
      issues.push({
        code: "capability_not_string",
        message: "capability entries must be non-empty strings.",
        path: `$.capabilities[${index}]`,
        severity: "error"
      });
    }
  });
}

function validatePermissions(manifest: Record<string, unknown>, issues: ManifestValidationIssue[]): void {
  const permissions = manifest.permissions;
  if (!isRecord(permissions)) {
    issues.push({
      code: "permissions_not_object",
      message: "permissions must be an object.",
      path: "$.permissions",
      severity: "error"
    });
    return;
  }

  for (const [permission, scope] of Object.entries(permissions)) {
    if (!permissionSet.has(permission)) {
      issues.push({
        code: "unknown_permission",
        message: `Unknown permission: ${permission}.`,
        path: `$.permissions.${permission}`,
        severity: "error"
      });
      continue;
    }

    if (!isPermissionScope(scope)) {
      issues.push({
        code: "invalid_permission_scope",
        message: "permission scope must be a boolean or an array of strings.",
        path: `$.permissions.${permission}`,
        severity: "error"
      });
    }

    if (mobileTypeSet.has(String(manifest.type)) && mobileForbiddenSet.has(permission) && !isEmptyScope(scope)) {
      issues.push({
        code: "mobile_forbidden_permission",
        message: `${String(manifest.type)} plugins cannot request ${permission}.`,
        path: `$.permissions.${permission}`,
        severity: "error"
      });
    }
  }
}

function isPermissionScope(value: unknown): value is ManifestPermissionScope {
  return typeof value === "boolean" || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

function isEmptyScope(value: unknown): boolean {
  return value === false || (Array.isArray(value) && value.length === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
