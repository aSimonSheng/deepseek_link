import { describe, expect, it } from "vitest";
import {
  currentProtocol,
  hasProtocolEnvelope,
  validateApprovalDecision,
  validateApprovalRequest,
  validateArtifactReference,
  validateCapabilityLease,
  validateHarnessEvent,
  validateRpcEnvelope,
  validateRpcResponse,
  validateTaskIntent
} from "@dsh-mobile/protocol";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

const timestamp = "2026-08-14T00:00:00.000Z";

describe("protocol contract", () => {
  it("creates supported protocol envelopes", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    const envelope = host.createEnvelope(session, "task.submit", 1);

    expect(envelope.protocol).toEqual(currentProtocol());
    expect(hasProtocolEnvelope(envelope)).toBe(true);
    expect(validateRpcEnvelope(envelope)).toEqual({ ok: true, issues: [] });
  });

  it("rejects malformed RPC envelopes", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    const envelope = host.createEnvelope(session, "task.submit", 1);
    const missingAuth = { ...envelope } as Record<string, unknown>;
    delete missingAuth.auth;
    const wrongMajor = {
      ...envelope,
      protocol: {
        ...currentProtocol(),
        major: 2
      }
    };

    expect(hasProtocolEnvelope(missingAuth)).toBe(false);
    expect(validateRpcEnvelope(missingAuth).issues.some((issue) => issue.code === "auth_not_object")).toBe(true);
    expect(validateRpcEnvelope(wrongMajor).issues.some((issue) => issue.code === "unsupported_protocol_major")).toBe(true);
  });

  it("validates mobile task intent and rejects direct command fields", () => {
    const validIntent = taskIntent();
    const directCommand = {
      ...validIntent,
      command: "rm -rf ."
    };
    const providerSecret = {
      ...validIntent,
      provider: {
        id: "dsh-deepseek-provider.provider",
        model: "deepseek-chat",
        apiKey: "sk-test-secret"
      }
    };

    expect(validateTaskIntent(validIntent)).toEqual({ ok: true, issues: [] });
    expect(validateTaskIntent(directCommand).issues.some((issue) => issue.code === "forbidden_intent_field")).toBe(true);
    expect(validateTaskIntent(providerSecret).issues.some((issue) => issue.code === "forbidden_intent_field")).toBe(true);
  });

  it("validates approval request and decision contracts", () => {
    const request = approvalRequest();
    const invalidDigest = {
      ...request,
      action: {
        kind: "shell.execute",
        preview: "echo mock-only",
        digest: "mock-action-digest"
      }
    };
    const decision = {
      approvalId: request.approvalId,
      decision: "approve",
      deviceId: "dev_1",
      userPresence: "confirmed",
      signature: "mock-signature"
    };

    expect(validateApprovalRequest(request)).toEqual({ ok: true, issues: [] });
    expect(validateApprovalRequest(invalidDigest).issues.some((issue) => issue.code === "invalid_digest")).toBe(true);
    expect(validateApprovalDecision(decision)).toEqual({ ok: true, issues: [] });
  });

  it("requires action digests for high-risk leases", () => {
    const baseLease = {
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
    const highRiskLease = {
      ...baseLease,
      capability: "tool.shell.execute"
    };
    const approvedHighRiskLease = {
      ...highRiskLease,
      actionDigest: "sha256:mock-action-digest"
    };

    expect(validateCapabilityLease(baseLease)).toEqual({ ok: true, issues: [] });
    expect(validateCapabilityLease(highRiskLease).issues.some((issue) => issue.code === "high_risk_lease_missing_digest")).toBe(true);
    expect(validateCapabilityLease(approvedHighRiskLease)).toEqual({ ok: true, issues: [] });
  });

  it("validates event, response, and artifact references", () => {
    const event = {
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
    const response = {
      messageId: "msg_2",
      correlationId: "msg_1",
      ok: false,
      result: null,
      error: {
        code: "permission_denied",
        message: "Denied by policy",
        retryable: false
      }
    };
    const invalidResponse = {
      ...response,
      error: {
        ...response.error,
        code: "mobile_root"
      }
    };
    const artifact = {
      artifactId: "art_1",
      runId: "run_1",
      kind: "summary.json",
      visibility: "mobile_summary",
      sizeBytes: 128,
      digest: "sha256:mock-artifact-digest",
      redaction: "applied",
      downloadMethod: "artifact.get"
    };
    const unredactedMobileArtifact = {
      ...artifact,
      redaction: "required"
    };

    expect(validateHarnessEvent(event)).toEqual({ ok: true, issues: [] });
    expect(validateRpcResponse(response)).toEqual({ ok: true, issues: [] });
    expect(validateRpcResponse(invalidResponse).issues.some((issue) => issue.code === "unknown_error_code")).toBe(true);
    expect(validateArtifactReference(artifact)).toEqual({ ok: true, issues: [] });
    expect(validateArtifactReference(unredactedMobileArtifact).issues.some((issue) => issue.code === "mobile_artifact_redaction_required")).toBe(true);
  });
});

function taskIntent(): Record<string, unknown> {
  return {
    workspaceRef: "workspace:current",
    taskKind: "agent.run",
    profile: "default",
    input: {
      prompt: "summarize current task",
      attachments: []
    },
    provider: {
      id: "dsh-deepseek-provider.provider",
      model: "deepseek-chat"
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
    explain: "Mock approval request for contract tests"
  };
}
