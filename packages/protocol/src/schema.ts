import {
  HIGH_RISK_CAPABILITIES,
  PROTOCOL_MAJOR,
  PROTOCOL_NAME
} from "./constants.js";
import type {
  ApprovalDecision,
  ApprovalRequest,
  ArtifactReference,
  Capability,
  CapabilityLease,
  DeviceIdentity,
  DevicePlatform,
  DeviceRegistration,
  DeviceTrustLevel,
  EventGapPolicy,
  EventStreamCursor,
  HarnessEvent,
  HarnessEventType,
  PairingCompletion,
  PairingOffer,
  Principal,
  PrincipalKind,
  RedactionMetadata,
  RpcEnvelope,
  RpcError,
  SessionChallenge,
  SessionOpenRequest,
  SessionProof,
  TaskIntent,
  TransportBindHost,
  TransportEndpointBinding,
  TransportEndpointConfig,
  TransportKind,
  TransportState
} from "./types.js";

export type CoreProtocolSchemaName =
  | "protocol_version"
  | "device_registration"
  | "device_identity"
  | "pairing_offer"
  | "pairing_completion"
  | "session_challenge"
  | "session_open_request"
  | "session_proof"
  | "transport_endpoint_config"
  | "transport_endpoint_binding"
  | "event_stream_cursor"
  | "rpc_envelope"
  | "rpc_response"
  | "rpc_error"
  | "harness_event"
  | "task_intent"
  | "approval_request"
  | "approval_decision"
  | "capability_lease"
  | "artifact_reference"
  | "redaction_metadata";

export interface ProtocolValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: "error" | "warning";
}

export interface ProtocolValidationResult {
  ok: boolean;
  issues: ProtocolValidationIssue[];
}

export const CAPABILITY_NAMES: readonly Capability[] = [
  "task.submit",
  "task.cancel",
  "run.events.read",
  "artifact.read.summary",
  "artifact.read.full",
  "tool.fs.read.workspace",
  "tool.fs.write.workspace",
  "tool.fs.read.external",
  "tool.fs.write.external",
  "tool.shell.execute",
  "tool.network.connect",
  "secret.read",
  "plugin.install",
  "plugin.enable",
  "settings.credentials.write",
  "relay.enable"
] as const;

const principalKinds: readonly PrincipalKind[] = ["local_user", "mobile_device", "plugin", "system"] as const;
const trustLevels: readonly DeviceTrustLevel[] = ["viewer", "operator", "approver", "admin"] as const;
const devicePlatforms: readonly DevicePlatform[] = ["ios", "android", "web", "desktop", "unknown"] as const;
const transportKinds: readonly TransportKind[] = ["mock", "lan"] as const;
const transportBindHosts: readonly TransportBindHost[] = ["127.0.0.1", "lan"] as const;
const transportStates: readonly TransportState[] = ["stopped", "listening"] as const;
const eventGapPolicies: readonly EventGapPolicy[] = ["replay_from_seq", "fail_closed"] as const;
const redactionPolicies: readonly RedactionMetadata["policy"][] = ["default", "mobile-safe", "pc-only"] as const;
const rpcErrorCodes: readonly RpcError["code"][] = [
  "bad_request",
  "unauthenticated",
  "permission_denied",
  "replay_rejected",
  "session_expired",
  "unsupported_protocol",
  "not_found",
  "internal_error"
] as const;
const eventTypes: readonly HarnessEventType[] = [
  "device_pairing_created",
  "device_pairing_completed",
  "session_opened",
  "session_closed",
  "task_submitted",
  "run_started",
  "approval_required",
  "approval_decided",
  "artifact_written",
  "run_completed",
  "run_failed",
  "security_policy_denied",
  "event_correction"
] as const;
const eventLevels: readonly HarnessEvent["level"][] = ["debug", "info", "warn", "error"] as const;
const taskToolModes: readonly TaskIntent["policy"]["toolMode"][] = ["approval_required", "deny"] as const;
const networkModes: readonly TaskIntent["policy"]["networkMode"][] = ["deny", "allowlist"] as const;
const taskArtifactVisibility: readonly TaskIntent["policy"]["artifactVisibility"][] = ["mobile_summary", "pc_only"] as const;
const approvalRisks: readonly ApprovalRequest["risk"][] = ["low", "medium", "high"] as const;
const approvalDecisions: readonly ApprovalDecision["decision"][] = ["approve", "deny"] as const;
const artifactKinds: readonly ArtifactReference["kind"][] = ["report.html", "log.jsonl", "summary.json", "diagnostic.zip"] as const;
const artifactVisibility: readonly ArtifactReference["visibility"][] = [
  "mobile_summary",
  "mobile_redacted",
  "pc_only",
  "approval_required"
] as const;
const artifactRedaction: readonly ArtifactReference["redaction"][] = ["applied", "not_required", "required"] as const;
const forbiddenIntentKeys = new Set([
  "apiKey",
  "api_key",
  "cmd",
  "command",
  "cwd",
  "env",
  "providerApiKey",
  "secret",
  "secrets",
  "shell",
  "token"
]);
const forbiddenPairingKeys = new Set([
  "apiKey",
  "api_key",
  "cwd",
  "env",
  "path",
  "prompt",
  "providerApiKey",
  "secret",
  "secrets",
  "sessionToken",
  "session_token",
  "shell",
  "token",
  "workspacePath",
  "workspaceRef"
]);

const highRiskCapabilitySet = new Set<string>(HIGH_RISK_CAPABILITIES);

export function validateProtocolVersion(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];
  validateProtocolVersionInto(value, issues, "$");
  return toResult(issues);
}

export function validateDeviceRegistration(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];
  validateDeviceRegistrationInto(value, issues, "$");
  return toResult(issues);
}

export function validateDeviceIdentity(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("device_identity_not_object", "Device identity must be an object.", "$");
  }

  validateDeviceRegistrationInto(value, issues, "$");
  requireEnum(value.trustLevel, trustLevels, "invalid_trust_level", "Invalid trust level.", "$.trustLevel", issues);
  requireIsoTimestamp(value, "pairedAt", "$.pairedAt", issues);

  if (typeof value.revoked !== "boolean") {
    addIssue(issues, "revoked_not_boolean", "revoked must be a boolean.", "$.revoked");
  }

  return toResult(issues);
}

export function validatePairingOffer(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("pairing_offer_not_object", "Pairing offer must be an object.", "$");
  }

  validateNoForbiddenPairingKeys(value, "$", issues);
  requireString(value, "pairingId", "$.pairingId", issues);
  requireMinString(value, "pairingCode", 12, "$.pairingCode", issues);
  requireIsoTimestamp(value, "createdAt", "$.createdAt", issues);
  requireIsoTimestamp(value, "expiresAt", "$.expiresAt", issues);
  validateTtlWindow(value.createdAt, value.expiresAt, 300, "$.expiresAt", issues);
  requireIntegerAtLeast(value, "entropyBits", 128, "$.entropyBits", issues);
  requireLiteral(value.oneTime, true, "pairing_not_one_time", "Pairing offers must be one-time.", "$.oneTime", issues);
  validatePairingPc(value.pc, issues, "$.pc");
  validatePairingTransport(value.transport, issues, "$.transport");
  validateTrustLevelArray(value.allowedTrustLevels, issues, "$.allowedTrustLevels");
  return toResult(issues);
}

export function validatePairingCompletion(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("pairing_completion_not_object", "Pairing completion must be an object.", "$");
  }

  validateNoForbiddenPairingKeys(value, "$", issues);
  requireString(value, "pairingId", "$.pairingId", issues);
  requireMinString(value, "pairingCode", 12, "$.pairingCode", issues);
  requireEnum(
    value.requestedTrustLevel,
    trustLevels,
    "invalid_requested_trust_level",
    "Invalid requested trust level.",
    "$.requestedTrustLevel",
    issues
  );
  validateDeviceRegistrationInto(value.device, issues, "$.device");
  requireString(value, "nonce", "$.nonce", issues);
  requireString(value, "signature", "$.signature", issues);
  return toResult(issues);
}

export function validateSessionChallenge(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("session_challenge_not_object", "Session challenge must be an object.", "$");
  }

  requireString(value, "sessionId", "$.sessionId", issues);
  requireString(value, "deviceId", "$.deviceId", issues);
  requireMinString(value, "challenge", 12, "$.challenge", issues);
  requireIsoTimestamp(value, "issuedAt", "$.issuedAt", issues);
  requireIsoTimestamp(value, "expiresAt", "$.expiresAt", issues);
  validateTtlWindow(value.issuedAt, value.expiresAt, 120, "$.expiresAt", issues);
  requireNonNegativeInteger(value, "seqStart", "$.seqStart", issues);
  return toResult(issues);
}

export function validateSessionOpenRequest(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("session_open_request_not_object", "Session open request must be an object.", "$");
  }

  requireString(value, "sessionId", "$.sessionId", issues);
  requireString(value, "deviceId", "$.deviceId", issues);
  requireMinString(value, "challenge", 12, "$.challenge", issues);
  requireString(value, "nonce", "$.nonce", issues);
  requireString(value, "signature", "$.signature", issues);
  return toResult(issues);
}

export function validateSessionProof(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];
  validateSessionProofInto(value, issues, "$");
  return toResult(issues);
}

export function assertValidSessionProof(value: unknown): asserts value is SessionProof {
  assertValid(validateSessionProof(value));
}

export function validateTransportEndpointConfig(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("transport_endpoint_config_not_object", "Transport endpoint config must be an object.", "$");
  }

  requireString(value, "endpointId", "$.endpointId", issues);
  requireEnum(value.kind, transportKinds, "invalid_transport_kind", "Invalid transport kind.", "$.kind", issues);
  requireEnum(value.bindHost, transportBindHosts, "invalid_bind_host", "Invalid bind host.", "$.bindHost", issues);
  requirePort(value, "port", "$.port", issues);

  if (typeof value.lanEnabled !== "boolean") {
    addIssue(issues, "lan_enabled_not_boolean", "lanEnabled must be a boolean.", "$.lanEnabled");
  }

  requireLiteral(value.authenticated, true, "transport_not_authenticated", "Transport endpoint must require authentication.", "$.authenticated", issues);
  requireLiteral(value.sessionRequired, true, "session_not_required", "Transport endpoint must require sessions.", "$.sessionRequired", issues);
  requireLiteral(value.csrfProtection, true, "csrf_not_enabled", "Transport endpoint must enable CSRF protection.", "$.csrfProtection", issues);
  validateStringArray(value.allowedOrigins, "allowedOrigins must be an array of strings.", "$.allowedOrigins", issues);
  requireEnum(value.state, transportStates, "invalid_transport_state", "Invalid transport state.", "$.state", issues);
  requireIsoTimestamp(value, "createdAt", "$.createdAt", issues);

  if (value.bindHost === "lan" && value.lanEnabled !== true) {
    addIssue(issues, "lan_bind_without_enable", "LAN binding requires lanEnabled: true.", "$.lanEnabled");
  }

  if (value.bindHost === "127.0.0.1" && value.lanEnabled === true) {
    addIssue(issues, "lan_enabled_on_loopback", "lanEnabled must be false for loopback-only binding.", "$.lanEnabled");
  }

  return toResult(issues);
}

export function validateTransportEndpointBinding(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("transport_endpoint_binding_not_object", "Transport endpoint binding must be an object.", "$");
  }

  requireString(value, "bindingId", "$.bindingId", issues);
  requireString(value, "endpointId", "$.endpointId", issues);
  requireString(value, "sessionId", "$.sessionId", issues);
  requireString(value, "deviceId", "$.deviceId", issues);
  validatePrincipal(value.principal, issues, "$.principal");
  requireLiteral(value.authenticated, true, "binding_not_authenticated", "Endpoint binding must be authenticated.", "$.authenticated", issues);
  requireIsoTimestamp(value, "boundAt", "$.boundAt", issues);
  requireIsoTimestamp(value, "expiresAt", "$.expiresAt", issues);
  validateTtlWindow(value.boundAt, value.expiresAt, 3600, "$.expiresAt", issues);
  requireNonNegativeInteger(value, "lastAckSeq", "$.lastAckSeq", issues);
  requireEnum(value.gapPolicy, eventGapPolicies, "invalid_gap_policy", "Invalid event gap policy.", "$.gapPolicy", issues);

  if (isRecord(value.principal) && value.principal.kind === "mobile_device" && value.principal.id !== value.deviceId) {
    addIssue(issues, "binding_principal_mismatch", "Mobile principal id must match deviceId.", "$.principal.id");
  }

  return toResult(issues);
}

export function validateEventStreamCursor(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("event_stream_cursor_not_object", "Event stream cursor must be an object.", "$");
  }

  requireString(value, "endpointId", "$.endpointId", issues);
  requireString(value, "sessionId", "$.sessionId", issues);
  requireString(value, "deviceId", "$.deviceId", issues);
  requireString(value, "runId", "$.runId", issues);
  requireNonNegativeInteger(value, "fromSeq", "$.fromSeq", issues);
  requireEnum(value.gapPolicy, eventGapPolicies, "invalid_gap_policy", "Invalid event gap policy.", "$.gapPolicy", issues);
  validateSessionProofInto(value.auth, issues, "$.auth");
  return toResult(issues);
}

export function validateRpcEnvelope(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("rpc_envelope_not_object", "RPC envelope must be an object.", "$");
  }

  validateProtocolVersionInto(value.protocol, issues, "$.protocol");
  requireString(value, "messageId", "$.messageId", issues);
  requireString(value, "sessionId", "$.sessionId", issues);
  requireString(value, "deviceId", "$.deviceId", issues);
  requirePositiveInteger(value, "seq", "$.seq", issues);
  requireIsoTimestamp(value, "timestamp", "$.timestamp", issues);
  requireString(value, "method", "$.method", issues);

  if (!hasOwn(value, "params")) {
    addIssue(issues, "params_missing", "params must be present, even when empty.", "$.params");
  }

  validateSessionProofInto(value.auth, issues, "$.auth");
  return toResult(issues);
}

export function assertValidRpcEnvelope(value: unknown): asserts value is RpcEnvelope {
  assertValid(validateRpcEnvelope(value));
}

export function validateRpcResponse(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("rpc_response_not_object", "RPC response must be an object.", "$");
  }

  requireString(value, "messageId", "$.messageId", issues);
  requireString(value, "correlationId", "$.correlationId", issues);

  if (value.ok === true) {
    if (!hasOwn(value, "result")) {
      addIssue(issues, "result_missing", "successful responses must include result.", "$.result");
    }
    if (value.error !== null) {
      addIssue(issues, "success_error_not_null", "successful responses must set error to null.", "$.error");
    }
    return toResult(issues);
  }

  if (value.ok === false) {
    if (value.result !== null) {
      addIssue(issues, "failure_result_not_null", "failed responses must set result to null.", "$.result");
    }
    validateRpcErrorInto(value.error, issues, "$.error");
    return toResult(issues);
  }

  addIssue(issues, "ok_not_boolean", "ok must be a boolean.", "$.ok");
  return toResult(issues);
}

export function validateRpcError(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];
  validateRpcErrorInto(value, issues, "$");
  return toResult(issues);
}

export function validateHarnessEvent(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("harness_event_not_object", "Harness event must be an object.", "$");
  }

  requireString(value, "eventId", "$.eventId", issues);
  validateOptionalString(value, "runId", "$.runId", issues);
  validateOptionalString(value, "sessionId", "$.sessionId", issues);
  validateEventSource(value.source, issues, "$.source");
  requireEnum(value.type, eventTypes, "unknown_event_type", "Unknown event type.", "$.type", issues);
  requireEnum(value.level, eventLevels, "invalid_event_level", "Invalid event level.", "$.level", issues);
  requireIsoTimestamp(value, "timestamp", "$.timestamp", issues);
  requirePositiveInteger(value, "seq", "$.seq", issues);

  if (!hasOwn(value, "data")) {
    addIssue(issues, "event_data_missing", "event data must be present.", "$.data");
  }

  validateRedactionMetadataInto(value.redaction, issues, "$.redaction");
  return toResult(issues);
}

export function validateTaskIntent(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("task_intent_not_object", "Task intent must be an object.", "$");
  }

  validateNoForbiddenIntentKeys(value, "$", issues);
  requireLiteral(value.workspaceRef, "workspace:current", "invalid_workspace_ref", "workspaceRef must be workspace:current.", "$.workspaceRef", issues);
  requireLiteral(value.taskKind, "agent.run", "invalid_task_kind", "taskKind must be agent.run.", "$.taskKind", issues);
  requireString(value, "profile", "$.profile", issues);
  validateTaskInput(value.input, issues, "$.input");

  if (value.provider !== undefined) {
    validateTaskProvider(value.provider, issues, "$.provider");
  }

  validateTaskPolicy(value.policy, issues, "$.policy");
  return toResult(issues);
}

export function validateApprovalRequest(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("approval_request_not_object", "Approval request must be an object.", "$");
  }

  requireString(value, "approvalId", "$.approvalId", issues);
  requireString(value, "runId", "$.runId", issues);
  validateRequestedBy(value.requestedBy, issues, "$.requestedBy");
  validateApprovalAction(value.action, issues, "$.action");
  requireEnum(value.risk, approvalRisks, "invalid_approval_risk", "Invalid approval risk.", "$.risk", issues);
  validateApprovalScope(value.scope, issues, "$.scope");
  requireString(value, "explain", "$.explain", issues);
  return toResult(issues);
}

export function validateApprovalDecision(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("approval_decision_not_object", "Approval decision must be an object.", "$");
  }

  requireString(value, "approvalId", "$.approvalId", issues);
  requireEnum(value.decision, approvalDecisions, "invalid_approval_decision", "Invalid approval decision.", "$.decision", issues);
  requireString(value, "deviceId", "$.deviceId", issues);
  requireLiteral(value.userPresence, "confirmed", "invalid_user_presence", "userPresence must be confirmed.", "$.userPresence", issues);
  requireString(value, "signature", "$.signature", issues);
  return toResult(issues);
}

export function validateCapabilityLease(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("capability_lease_not_object", "Capability lease must be an object.", "$");
  }

  requireString(value, "leaseId", "$.leaseId", issues);
  requireEnum(value.capability, CAPABILITY_NAMES, "unknown_capability", "Unknown capability.", "$.capability", issues);
  validateScopeRecord(value.scope, issues, "$.scope");
  requirePositiveInteger(value, "ttlSeconds", "$.ttlSeconds", issues);
  requirePositiveInteger(value, "maxUses", "$.maxUses", issues);
  requireIsoTimestamp(value, "issuedAt", "$.issuedAt", issues);
  validatePrincipal(value.principal, issues, "$.principal");
  validateOptionalDigest(value, "actionDigest", "$.actionDigest", issues);

  if (value.revoked !== undefined && typeof value.revoked !== "boolean") {
    addIssue(issues, "revoked_not_boolean", "revoked must be a boolean when present.", "$.revoked");
  }

  if (typeof value.capability === "string" && highRiskCapabilitySet.has(value.capability) && !isDigest(value.actionDigest)) {
    addIssue(
      issues,
      "high_risk_lease_missing_digest",
      "High-risk capability leases must include an actionDigest.",
      "$.actionDigest"
    );
  }

  return toResult(issues);
}

export function validateArtifactReference(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];

  if (!isRecord(value)) {
    return singleError("artifact_reference_not_object", "Artifact reference must be an object.", "$");
  }

  requireString(value, "artifactId", "$.artifactId", issues);
  requireString(value, "runId", "$.runId", issues);
  requireEnum(value.kind, artifactKinds, "invalid_artifact_kind", "Invalid artifact kind.", "$.kind", issues);
  requireEnum(value.visibility, artifactVisibility, "invalid_artifact_visibility", "Invalid artifact visibility.", "$.visibility", issues);
  requireNonNegativeInteger(value, "sizeBytes", "$.sizeBytes", issues);
  requireDigest(value, "digest", "$.digest", issues);
  requireEnum(value.redaction, artifactRedaction, "invalid_artifact_redaction", "Invalid artifact redaction.", "$.redaction", issues);
  requireLiteral(value.downloadMethod, "artifact.get", "invalid_download_method", "downloadMethod must be artifact.get.", "$.downloadMethod", issues);

  if (
    (value.visibility === "mobile_summary" || value.visibility === "mobile_redacted") &&
    value.redaction === "required"
  ) {
    addIssue(
      issues,
      "mobile_artifact_redaction_required",
      "Mobile-visible artifacts must be redacted before being referenced.",
      "$.redaction"
    );
  }

  return toResult(issues);
}

export function validateRedactionMetadata(value: unknown): ProtocolValidationResult {
  const issues: ProtocolValidationIssue[] = [];
  validateRedactionMetadataInto(value, issues, "$");
  return toResult(issues);
}

function validateProtocolVersionInto(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "protocol_not_object", "protocol must be an object.", path);
    return;
  }

  requireLiteral(value.name, PROTOCOL_NAME, "unsupported_protocol_name", `protocol.name must be ${PROTOCOL_NAME}.`, `${path}.name`, issues);

  if (!Number.isInteger(value.major) || value.major !== PROTOCOL_MAJOR) {
    addIssue(issues, "unsupported_protocol_major", `protocol.major must be ${PROTOCOL_MAJOR}.`, `${path}.major`);
  }

  if (!Number.isInteger(value.minor) || Number(value.minor) < 0) {
    addIssue(issues, "invalid_protocol_minor", "protocol.minor must be a non-negative integer.", `${path}.minor`);
  }
}

function validateDeviceRegistrationInto(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "device_registration_not_object", "Device registration must be an object.", path);
    return;
  }

  validateNoForbiddenPairingKeys(value, path, issues);
  requireString(value, "deviceId", `${path}.deviceId`, issues);
  requireString(value, "displayName", `${path}.displayName`, issues);
  requireString(value, "publicKey", `${path}.publicKey`, issues);
  requireEnum(value.platform, devicePlatforms, "invalid_device_platform", "Invalid device platform.", `${path}.platform`, issues);
}

function validatePairingPc(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "pairing_pc_not_object", "pc must be an object.", path);
    return;
  }

  requireString(value, "hostId", `${path}.hostId`, issues);
  requireString(value, "displayName", `${path}.displayName`, issues);
}

function validatePairingTransport(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "pairing_transport_not_object", "transport must be an object.", path);
    return;
  }

  requireEnum(value.kind, ["mock", "lan"] as const, "invalid_pairing_transport", "Invalid transport kind.", `${path}.kind`, issues);
  requireEnum(
    value.endpointHint,
    ["loopback", "lan"] as const,
    "invalid_pairing_endpoint_hint",
    "Invalid endpoint hint.",
    `${path}.endpointHint`,
    issues
  );
  requireLiteral(
    value.authenticated,
    true,
    "pairing_transport_not_authenticated",
    "Pairing transport hints must be authenticated.",
    `${path}.authenticated`,
    issues
  );
}

function validateTrustLevelArray(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(issues, "trust_levels_not_array", "allowedTrustLevels must be a non-empty array.", path);
    return;
  }

  value.forEach((trustLevel, index) => {
    requireEnum(
      trustLevel,
      trustLevels,
      "invalid_trust_level",
      "Invalid trust level.",
      `${path}[${index}]`,
      issues
    );
  });
}

function validateSessionProofInto(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "auth_not_object", "auth must be an object.", path);
    return;
  }

  requireLiteral(value.kind, "session_proof", "invalid_auth_kind", "auth.kind must be session_proof.", `${path}.kind`, issues);
  requireString(value, "nonce", `${path}.nonce`, issues);
  requireString(value, "signature", `${path}.signature`, issues);
}

function validateRpcErrorInto(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "rpc_error_not_object", "RPC error must be an object.", path);
    return;
  }

  requireEnum(value.code, rpcErrorCodes, "unknown_error_code", "Unknown RPC error code.", `${path}.code`, issues);
  requireString(value, "message", `${path}.message`, issues);

  if (typeof value.retryable !== "boolean") {
    addIssue(issues, "retryable_not_boolean", "retryable must be a boolean.", `${path}.retryable`);
  }

  if (value.details !== undefined && !isRecord(value.details)) {
    addIssue(issues, "details_not_object", "details must be an object when present.", `${path}.details`);
  }
}

function validateEventSource(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "event_source_not_object", "event source must be an object.", path);
    return;
  }

  requireString(value, "pluginId", `${path}.pluginId`, issues);
  requireString(value, "kind", `${path}.kind`, issues);
}

function validateTaskInput(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "task_input_not_object", "input must be an object.", path);
    return;
  }

  validateNoForbiddenIntentKeys(value, path, issues);
  requireString(value, "prompt", `${path}.prompt`, issues);
  validateStringArray(value.attachments, "attachments must be an array of strings.", `${path}.attachments`, issues);
}

function validateTaskProvider(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "provider_not_object", "provider must be an object when present.", path);
    return;
  }

  validateNoForbiddenIntentKeys(value, path, issues);
  requireString(value, "id", `${path}.id`, issues);
  requireString(value, "model", `${path}.model`, issues);
}

function validateTaskPolicy(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "task_policy_not_object", "policy must be an object.", path);
    return;
  }

  requireEnum(value.toolMode, taskToolModes, "invalid_tool_mode", "Invalid toolMode.", `${path}.toolMode`, issues);
  requireEnum(value.networkMode, networkModes, "invalid_network_mode", "Invalid networkMode.", `${path}.networkMode`, issues);
  requireEnum(
    value.artifactVisibility,
    taskArtifactVisibility,
    "invalid_task_artifact_visibility",
    "Invalid artifactVisibility.",
    `${path}.artifactVisibility`,
    issues
  );
}

function validateRequestedBy(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "requested_by_not_object", "requestedBy must be an object.", path);
    return;
  }

  requireString(value, "pluginId", `${path}.pluginId`, issues);
  requireString(value, "tool", `${path}.tool`, issues);
}

function validateApprovalAction(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "approval_action_not_object", "action must be an object.", path);
    return;
  }

  requireString(value, "kind", `${path}.kind`, issues);
  requireString(value, "preview", `${path}.preview`, issues);
  requireDigest(value, "digest", `${path}.digest`, issues);
}

function validateApprovalScope(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "approval_scope_not_object", "scope must be an object.", path);
    return;
  }

  requireLiteral(value.workspace, "current", "invalid_approval_workspace", "scope.workspace must be current.", `${path}.workspace`, issues);
  requirePositiveInteger(value, "ttlSeconds", `${path}.ttlSeconds`, issues);
  requirePositiveInteger(value, "maxUses", `${path}.maxUses`, issues);
}

function validatePrincipal(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "principal_not_object", "principal must be an object.", path);
    return;
  }

  requireEnum(value.kind, principalKinds, "invalid_principal_kind", "Invalid principal kind.", `${path}.kind`, issues);
  requireString(value, "id", `${path}.id`, issues);

  if (value.trustLevel !== undefined) {
    requireEnum(value.trustLevel, trustLevels, "invalid_trust_level", "Invalid trust level.", `${path}.trustLevel`, issues);
  }
}

function validateRedactionMetadataInto(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "redaction_not_object", "redaction must be an object.", path);
    return;
  }

  if (typeof value.containsSensitiveContent !== "boolean") {
    addIssue(issues, "contains_sensitive_not_boolean", "containsSensitiveContent must be a boolean.", `${path}.containsSensitiveContent`);
  }
  requireEnum(value.policy, redactionPolicies, "invalid_redaction_policy", "Invalid redaction policy.", `${path}.policy`, issues);
}

function validateScopeRecord(value: unknown, issues: ProtocolValidationIssue[], path: string): void {
  if (!isRecord(value)) {
    addIssue(issues, "scope_not_object", "scope must be an object.", path);
  }
}

function validateOptionalString(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (record[field] !== undefined && !isNonEmptyString(record[field])) {
    addIssue(issues, "optional_string_invalid", `${field} must be a non-empty string when present.`, path);
  }
}

function validateOptionalDigest(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (record[field] !== undefined && !isDigest(record[field])) {
    addIssue(issues, "invalid_digest", `${field} must use sha256:<digest>.`, path);
  }
}

function validateNoForbiddenIntentKeys(record: Record<string, unknown>, path: string, issues: ProtocolValidationIssue[]): void {
  for (const key of Object.keys(record)) {
    if (forbiddenIntentKeys.has(key)) {
      addIssue(issues, "forbidden_intent_field", `Task intent must not include direct capability field ${key}.`, `${path}.${key}`);
    }
  }
}

function validateNoForbiddenPairingKeys(record: Record<string, unknown>, path: string, issues: ProtocolValidationIssue[]): void {
  for (const key of Object.keys(record)) {
    if (forbiddenPairingKeys.has(key)) {
      addIssue(issues, "forbidden_pairing_field", `Pairing payload must not include ${key}.`, `${path}.${key}`);
    }
  }
}

function requireString(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!isNonEmptyString(record[field])) {
    addIssue(issues, "required_string_missing", `${field} must be a non-empty string.`, path);
  }
}

function requireMinString(
  record: Record<string, unknown>,
  field: string,
  minLength: number,
  path: string,
  issues: ProtocolValidationIssue[]
): void {
  if (!isNonEmptyString(record[field]) || String(record[field]).length < minLength) {
    addIssue(issues, "string_too_short", `${field} must be at least ${minLength} characters.`, path);
  }
}

function requireIsoTimestamp(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!isNonEmptyString(record[field]) || Number.isNaN(Date.parse(String(record[field])))) {
    addIssue(issues, "invalid_timestamp", `${field} must be an ISO timestamp string.`, path);
  }
}

function requirePositiveInteger(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!Number.isInteger(record[field]) || Number(record[field]) <= 0) {
    addIssue(issues, "positive_integer_required", `${field} must be a positive integer.`, path);
  }
}

function requireNonNegativeInteger(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!Number.isInteger(record[field]) || Number(record[field]) < 0) {
    addIssue(issues, "non_negative_integer_required", `${field} must be a non-negative integer.`, path);
  }
}

function requirePort(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!Number.isInteger(record[field]) || Number(record[field]) < 1 || Number(record[field]) > 65535) {
    addIssue(issues, "invalid_port", `${field} must be an integer from 1 to 65535.`, path);
  }
}

function requireIntegerAtLeast(
  record: Record<string, unknown>,
  field: string,
  min: number,
  path: string,
  issues: ProtocolValidationIssue[]
): void {
  if (!Number.isInteger(record[field]) || Number(record[field]) < min) {
    addIssue(issues, "integer_too_small", `${field} must be an integer >= ${min}.`, path);
  }
}

function requireDigest(record: Record<string, unknown>, field: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!isDigest(record[field])) {
    addIssue(issues, "invalid_digest", `${field} must use sha256:<digest>.`, path);
  }
}

function validateStringArray(value: unknown, message: string, path: string, issues: ProtocolValidationIssue[]): void {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    addIssue(issues, "string_array_required", message, path);
  }
}

function requireLiteral(
  value: unknown,
  expected: string | boolean,
  code: string,
  message: string,
  path: string,
  issues: ProtocolValidationIssue[]
): void {
  if (value !== expected) {
    addIssue(issues, code, message, path);
  }
}

function validateTtlWindow(
  startsAt: unknown,
  expiresAt: unknown,
  maxTtlSeconds: number,
  path: string,
  issues: ProtocolValidationIssue[]
): void {
  if (!isNonEmptyString(startsAt) || !isNonEmptyString(expiresAt)) {
    return;
  }

  const startsAtMs = Date.parse(startsAt);
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(startsAtMs) || Number.isNaN(expiresAtMs)) {
    return;
  }

  const ttlMs = expiresAtMs - startsAtMs;
  if (ttlMs <= 0) {
    addIssue(issues, "invalid_ttl_window", "expiresAt must be after the start timestamp.", path);
    return;
  }

  if (ttlMs > maxTtlSeconds * 1000) {
    addIssue(issues, "ttl_too_long", `TTL must be <= ${maxTtlSeconds} seconds.`, path);
  }
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  code: string,
  message: string,
  path: string,
  issues: ProtocolValidationIssue[]
): void {
  if (typeof value !== "string" || !new Set<string>(allowed).has(value)) {
    addIssue(issues, code, message, path);
  }
}

function isDigest(value: unknown): boolean {
  return typeof value === "string" && /^sha256:.+$/u.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function singleError(code: string, message: string, path: string): ProtocolValidationResult {
  return {
    ok: false,
    issues: [
      {
        code,
        message,
        path,
        severity: "error"
      }
    ]
  };
}

function addIssue(issues: ProtocolValidationIssue[], code: string, message: string, path: string): void {
  issues.push({
    code,
    message,
    path,
    severity: "error"
  });
}

function toResult(issues: ProtocolValidationIssue[]): ProtocolValidationResult {
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

function assertValid(result: ProtocolValidationResult): void {
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}
