import { describe, expect, it } from "vitest";
import {
  validateApprovalRequest,
  validateArtifactReference,
  validateHarnessEvent,
  validateTransportEndpointBinding,
  validateTransportEndpointConfig
} from "@dsh-mobile/protocol";

const timestamp = "2026-08-17T00:00:00.000Z";

describe("protocol strictness and secret canaries", () => {
  it("rejects secret-like approval previews and sensitive action fields", () => {
    const withSecretPreview = approvalRequest({
      action: {
        kind: "shell.execute",
        preview: "TOKEN=super-secret-value",
        digest: "sha256:mock-action-digest"
      }
    });
    const withEnvField = approvalRequest({
      action: {
        kind: "shell.execute",
        preview: "echo mock-only",
        digest: "sha256:mock-action-digest",
        env: {
          TOKEN: "super-secret-value"
        }
      }
    });

    expect(validateApprovalRequest(withSecretPreview).issues.some((issue) => issue.code === "secret_like_content")).toBe(true);
    expect(validateApprovalRequest(withEnvField).issues.some((issue) => issue.code === "forbidden_sensitive_field")).toBe(true);
  });

  it("rejects mobile-visible event secret canaries while allowing pc-only event evidence", () => {
    const mobileSafe = harnessEvent({
      data: {
        log: "Bearer abc.def.ghi"
      },
      redaction: {
        containsSensitiveContent: true,
        policy: "mobile-safe"
      }
    });
    const pcOnly = harnessEvent({
      data: {
        log: "Bearer abc.def.ghi"
      },
      redaction: {
        containsSensitiveContent: true,
        policy: "pc-only"
      }
    });

    expect(validateHarnessEvent(mobileSafe).issues.some((issue) => issue.code === "secret_like_content")).toBe(true);
    expect(validateHarnessEvent(pcOnly)).toEqual({ ok: true, issues: [] });
  });

  it("rejects sensitive fields on artifact and transport boundary payloads", () => {
    const artifactWithSecretField = {
      ...artifactReference(),
      apiKey: "sk-1234567890"
    };
    const endpointWithWorkspacePath = {
      ...transportEndpoint(),
      workspacePath: "/Users/example/private-workspace"
    };
    const bindingWithToken = {
      ...transportBinding(),
      token: "long-lived-session-token"
    };

    expect(validateArtifactReference(artifactWithSecretField).issues.some((issue) => issue.code === "forbidden_sensitive_field")).toBe(true);
    expect(validateTransportEndpointConfig(endpointWithWorkspacePath).issues.some((issue) => issue.code === "forbidden_sensitive_field")).toBe(true);
    expect(validateTransportEndpointBinding(bindingWithToken).issues.some((issue) => issue.code === "forbidden_sensitive_field")).toBe(true);
  });
});

function approvalRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
    explain: "Mock approval request for strictness tests",
    ...overrides
  };
}

function harnessEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
      log: "mobile-safe"
    },
    redaction: {
      containsSensitiveContent: false,
      policy: "mobile-safe"
    },
    ...overrides
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

function transportBinding(): Record<string, unknown> {
  return {
    bindingId: "binding_1",
    endpointId: "endpoint_1",
    sessionId: "sess_1",
    deviceId: "dev_1",
    principal: {
      kind: "mobile_device",
      id: "dev_1",
      trustLevel: "operator"
    },
    authenticated: true,
    boundAt: timestamp,
    expiresAt: "2026-08-17T01:00:00.000Z",
    lastAckSeq: 0,
    gapPolicy: "replay_from_seq"
  };
}
