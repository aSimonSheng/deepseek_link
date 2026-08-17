import { describe, expect, it } from "vitest";
import {
  validateApprovalRequest,
  validateArtifactReference,
  validateCapabilityLease,
  validateEventStreamCursor,
  validateHarnessEvent,
  validatePairingOffer,
  validateRpcEnvelope,
  validateSessionChallenge,
  validateTaskIntent,
  validateTransportEndpointConfig
} from "@dsh-mobile/protocol";

const timestamp = "2026-08-17T00:00:00.000Z";

const schemas = [
  { name: "pairing offer", validate: validatePairingOffer, valid: pairingOffer() },
  { name: "session challenge", validate: validateSessionChallenge, valid: sessionChallenge() },
  { name: "transport endpoint", validate: validateTransportEndpointConfig, valid: transportEndpoint() },
  { name: "RPC envelope", validate: validateRpcEnvelope, valid: rpcEnvelope() },
  { name: "harness event", validate: validateHarnessEvent, valid: harnessEvent() },
  { name: "task intent", validate: validateTaskIntent, valid: taskIntent() },
  { name: "approval request", validate: validateApprovalRequest, valid: approvalRequest() },
  { name: "capability lease", validate: validateCapabilityLease, valid: capabilityLease() },
  { name: "artifact reference", validate: validateArtifactReference, valid: artifactReference() },
  { name: "event stream cursor", validate: validateEventStreamCursor, valid: eventStreamCursor() }
] as const;

describe("protocol schema lightweight fuzz matrix", () => {
  it.each(schemas)("accepts valid $name fixture", ({ validate, valid }) => {
    expect(validate(valid)).toEqual({ ok: true, issues: [] });
  });

  it.each(schemas)("rejects non-object root payloads for $name", ({ validate }) => {
    for (const value of [null, undefined, "payload", 42, true, []]) {
      expect(validate(value).ok).toBe(false);
    }
  });

  it("rejects numeric boundary violations", () => {
    expect(validateTransportEndpointConfig({ ...transportEndpoint(), port: 0 }).issues.some((issue) => issue.code === "invalid_port")).toBe(true);
    expect(validateTransportEndpointConfig({ ...transportEndpoint(), port: 65536 }).issues.some((issue) => issue.code === "invalid_port")).toBe(true);
    expect(validateRpcEnvelope({ ...rpcEnvelope(), seq: 0 }).issues.some((issue) => issue.code === "positive_integer_required")).toBe(true);
    expect(validateCapabilityLease({ ...capabilityLease(), ttlSeconds: 0 }).issues.some((issue) => issue.code === "positive_integer_required")).toBe(true);
    expect(validateEventStreamCursor({ ...eventStreamCursor(), fromSeq: -1 }).issues.some((issue) => issue.code === "non_negative_integer_required")).toBe(true);
  });

  it("rejects TTL windows that go backwards or exceed the schema maximum", () => {
    expect(
      validatePairingOffer({
        ...pairingOffer(),
        expiresAt: "2026-08-16T23:59:00.000Z"
      }).issues.some((issue) => issue.code === "invalid_ttl_window")
    ).toBe(true);
    expect(
      validateSessionChallenge({
        ...sessionChallenge(),
        expiresAt: "2026-08-17T00:03:00.000Z"
      }).issues.some((issue) => issue.code === "ttl_too_long")
    ).toBe(true);
  });
});

function pairingOffer(): Record<string, unknown> {
  return {
    pairingId: "pair_1",
    pairingCode: "mock-pairing-code",
    createdAt: timestamp,
    expiresAt: "2026-08-17T00:02:00.000Z",
    entropyBits: 128,
    oneTime: true,
    pc: {
      hostId: "pc_1",
      displayName: "Mock DSH Host"
    },
    transport: {
      kind: "mock",
      endpointHint: "loopback",
      authenticated: true
    },
    allowedTrustLevels: ["operator"]
  };
}

function sessionChallenge(): Record<string, unknown> {
  return {
    sessionId: "sess_1",
    deviceId: "dev_1",
    challenge: "mock-session-challenge",
    issuedAt: timestamp,
    expiresAt: "2026-08-17T00:01:00.000Z",
    seqStart: 1
  };
}

function transportEndpoint(): Record<string, unknown> {
  return {
    endpointId: "endpoint_1",
    kind: "mock",
    bindHost: "127.0.0.1",
    port: 41731,
    lanEnabled: false,
    authenticated: true,
    sessionRequired: true,
    csrfProtection: true,
    allowedOrigins: ["http://127.0.0.1"],
    state: "listening",
    createdAt: timestamp
  };
}

function rpcEnvelope(): Record<string, unknown> {
  return {
    protocol: {
      name: "dsh-mobile-bridge",
      major: 1,
      minor: 0
    },
    messageId: "msg_1",
    sessionId: "sess_1",
    deviceId: "dev_1",
    seq: 1,
    timestamp,
    method: "task.submit",
    params: {},
    auth: {
      kind: "session_proof",
      nonce: "nonce_1",
      signature: "mock-signature"
    }
  };
}

function harnessEvent(): Record<string, unknown> {
  return {
    eventId: "evt_1",
    runId: "run_1",
    source: {
      pluginId: "mock-dsh-host",
      kind: "mock"
    },
    type: "run_started",
    level: "info",
    timestamp,
    seq: 1,
    data: {
      profile: "default"
    },
    redaction: {
      containsSensitiveContent: false,
      policy: "mobile-safe"
    }
  };
}

function taskIntent(): Record<string, unknown> {
  return {
    workspaceRef: "workspace:current",
    taskKind: "agent.run",
    profile: "default",
    input: {
      prompt: "hello",
      attachments: []
    },
    policy: {
      toolMode: "approval_required",
      networkMode: "deny",
      artifactVisibility: "mobile_summary"
    }
  };
}

function approvalRequest(): Record<string, unknown> {
  return {
    approvalId: "appr_1",
    runId: "run_1",
    requestedBy: {
      pluginId: "dsh-tool-shell",
      tool: "shell"
    },
    action: {
      kind: "shell.execute",
      preview: "echo mock-only",
      digest: "sha256:mock-action-digest"
    },
    risk: "medium",
    scope: {
      workspace: "current",
      ttlSeconds: 300,
      maxUses: 1
    },
    explain: "Mock approval request"
  };
}

function capabilityLease(): Record<string, unknown> {
  return {
    leaseId: "lease_1",
    capability: "task.submit",
    scope: {
      workspace: "current"
    },
    ttlSeconds: 300,
    maxUses: 1,
    issuedAt: timestamp,
    principal: {
      kind: "mobile_device",
      id: "dev_1",
      trustLevel: "operator"
    }
  };
}

function artifactReference(): Record<string, unknown> {
  return {
    artifactId: "art_1",
    runId: "run_1",
    kind: "summary.json",
    visibility: "mobile_summary",
    sizeBytes: 128,
    digest: "sha256:mock-artifact-digest",
    redaction: "applied",
    downloadMethod: "artifact.get"
  };
}

function eventStreamCursor(): Record<string, unknown> {
  return {
    endpointId: "endpoint_1",
    sessionId: "sess_1",
    deviceId: "dev_1",
    runId: "run_1",
    fromSeq: 0,
    gapPolicy: "replay_from_seq",
    auth: {
      kind: "session_proof",
      nonce: "nonce_1",
      signature: "mock-signature"
    }
  };
}
