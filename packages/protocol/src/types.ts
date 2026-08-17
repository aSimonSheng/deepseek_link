import { PROTOCOL_MAJOR, PROTOCOL_MINOR, PROTOCOL_NAME } from "./constants.js";

export type ProtocolName = typeof PROTOCOL_NAME;

export interface ProtocolVersion {
  name: ProtocolName;
  major: number;
  minor: number;
}

export type PrincipalKind = "local_user" | "mobile_device" | "plugin" | "system";

export interface Principal {
  kind: PrincipalKind;
  id: string;
  trustLevel?: "viewer" | "operator" | "approver" | "admin";
}

export type DeviceTrustLevel = NonNullable<Principal["trustLevel"]>;
export type DevicePlatform = "ios" | "android" | "web" | "desktop" | "unknown";

export interface DeviceRegistration {
  deviceId: string;
  displayName: string;
  publicKey: string;
  platform: DevicePlatform;
}

export interface DeviceIdentity extends DeviceRegistration {
  trustLevel: DeviceTrustLevel;
  pairedAt: string;
  revoked: boolean;
}

export interface PairingOffer {
  pairingId: string;
  pairingCode: string;
  createdAt: string;
  expiresAt: string;
  entropyBits: number;
  oneTime: true;
  pc: {
    hostId: string;
    displayName: string;
  };
  transport: {
    kind: "mock" | "lan";
    endpointHint: "loopback" | "lan";
    authenticated: true;
  };
  allowedTrustLevels: DeviceTrustLevel[];
}

export interface PairingCompletion {
  pairingId: string;
  pairingCode: string;
  requestedTrustLevel: DeviceTrustLevel;
  device: DeviceRegistration;
  nonce: string;
  signature: string;
}

export interface SessionChallenge {
  sessionId: string;
  deviceId: string;
  challenge: string;
  issuedAt: string;
  expiresAt: string;
  seqStart: number;
}

export interface SessionOpenRequest {
  sessionId: string;
  deviceId: string;
  challenge: string;
  nonce: string;
  signature: string;
}

export interface SessionProof {
  kind: "session_proof";
  nonce: string;
  signature: string;
}

export type TransportKind = "mock" | "lan";
export type TransportBindHost = "127.0.0.1" | "lan";
export type TransportState = "stopped" | "listening";
export type EventGapPolicy = "replay_from_seq" | "fail_closed";

export interface TransportEndpointConfig {
  endpointId: string;
  kind: TransportKind;
  bindHost: TransportBindHost;
  port: number;
  lanEnabled: boolean;
  authenticated: true;
  sessionRequired: true;
  csrfProtection: true;
  allowedOrigins: string[];
  state: TransportState;
  createdAt: string;
}

export interface TransportEndpointBinding {
  bindingId: string;
  endpointId: string;
  sessionId: string;
  deviceId: string;
  principal: Principal;
  authenticated: true;
  boundAt: string;
  expiresAt: string;
  lastAckSeq: number;
  gapPolicy: EventGapPolicy;
}

export interface EventStreamCursor {
  endpointId: string;
  sessionId: string;
  deviceId: string;
  runId: string;
  fromSeq: number;
  gapPolicy: EventGapPolicy;
  auth: SessionProof;
}

export type Capability =
  | "task.submit"
  | "task.cancel"
  | "run.events.read"
  | "artifact.read.summary"
  | "artifact.read.full"
  | "tool.fs.read.workspace"
  | "tool.fs.write.workspace"
  | "tool.fs.read.external"
  | "tool.fs.write.external"
  | "tool.shell.execute"
  | "tool.network.connect"
  | "secret.read"
  | "plugin.install"
  | "plugin.enable"
  | "settings.credentials.write"
  | "relay.enable";

export interface CapabilityLease {
  leaseId: string;
  capability: Capability;
  scope: Record<string, unknown>;
  ttlSeconds: number;
  maxUses: number;
  issuedAt: string;
  principal: Principal;
  actionDigest?: string;
  revoked?: boolean;
}

export type PolicyDecision =
  | { effect: "allow"; lease: CapabilityLease }
  | { effect: "deny"; reason: string }
  | { effect: "ask"; approval: ApprovalRequest };

export interface RedactionMetadata {
  containsSensitiveContent: boolean;
  policy: "default" | "mobile-safe" | "pc-only";
}

export interface RpcEnvelope<TParams = unknown> {
  protocol: ProtocolVersion;
  messageId: string;
  sessionId: string;
  deviceId: string;
  seq: number;
  timestamp: string;
  method: string;
  params: TParams;
  auth: SessionProof;
}

export interface RpcError {
  code:
    | "bad_request"
    | "unauthenticated"
    | "permission_denied"
    | "replay_rejected"
    | "session_expired"
    | "unsupported_protocol"
    | "not_found"
    | "internal_error";
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type RpcResponse<TResult = unknown> =
  | {
      messageId: string;
      correlationId: string;
      ok: true;
      result: TResult;
      error: null;
    }
  | {
      messageId: string;
      correlationId: string;
      ok: false;
      result: null;
      error: RpcError;
    };

export type HarnessEventType =
  | "device_pairing_created"
  | "device_pairing_completed"
  | "session_opened"
  | "session_closed"
  | "task_submitted"
  | "run_started"
  | "approval_required"
  | "approval_decided"
  | "artifact_written"
  | "run_completed"
  | "run_failed"
  | "security_policy_denied"
  | "event_correction";

export interface HarnessEvent<TData = unknown> {
  eventId: string;
  runId?: string;
  sessionId?: string;
  source: {
    pluginId: string;
    kind: string;
  };
  type: HarnessEventType;
  level: "debug" | "info" | "warn" | "error";
  timestamp: string;
  seq: number;
  data: TData;
  redaction: RedactionMetadata;
}

export interface TaskIntent {
  workspaceRef: "workspace:current";
  taskKind: "agent.run";
  profile: string;
  input: {
    prompt: string;
    attachments: string[];
  };
  provider?: {
    id: string;
    model: string;
  };
  policy: {
    toolMode: "approval_required" | "deny";
    networkMode: "deny" | "allowlist";
    artifactVisibility: "mobile_summary" | "pc_only";
  };
}

export interface ApprovalRequest {
  approvalId: string;
  runId: string;
  requestedBy: {
    pluginId: string;
    tool: string;
  };
  action: {
    kind: string;
    preview: string;
    digest: string;
  };
  risk: "low" | "medium" | "high";
  scope: {
    workspace: "current";
    ttlSeconds: number;
    maxUses: number;
  };
  explain: string;
}

export interface ApprovalDecision {
  approvalId: string;
  decision: "approve" | "deny";
  deviceId: string;
  userPresence: "confirmed";
  signature: string;
}

export interface ArtifactReference {
  artifactId: string;
  runId: string;
  kind: "report.html" | "log.jsonl" | "summary.json" | "diagnostic.zip";
  visibility: "mobile_summary" | "mobile_redacted" | "pc_only" | "approval_required";
  sizeBytes: number;
  digest: string;
  redaction: "applied" | "not_required" | "required";
  downloadMethod: "artifact.get";
}

export interface UsageRecord {
  runId: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  cacheReadTokens?: number;
  cacheHitRatio?: number;
  source: "provider_reported" | "estimated" | "unavailable";
}
