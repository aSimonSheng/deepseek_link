import {
  currentProtocol,
  hasProtocolEnvelope,
  isSupportedProtocol,
  redactString,
  type ApprovalDecision,
  type ApprovalRequest,
  type ArtifactReference,
  type Capability,
  type HarnessEvent,
  type Principal,
  type RpcError,
  type RpcEnvelope,
  type RpcResponse,
  type TaskIntent
} from "@dsh-mobile/protocol";

export interface PairingFixture {
  deviceName: string;
  trustLevel?: Principal["trustLevel"];
  tokenTtlSeconds?: number;
}

export interface PairingResult {
  deviceId: string;
  pairingId: string;
  expiresAt: string;
}

export interface SessionHandle {
  sessionId: string;
  deviceId: string;
  principal: Principal;
  lastSeq: number;
  active: boolean;
}

export interface RunHandle {
  runId: string;
}

export type RecoveryFault = "mobile_disconnect" | "pc_restart" | "worker_crash" | "approval_timeout";

export interface MockDshHostTestApi {
  reset(seed?: string): Promise<void>;
  pairDevice(fixture: PairingFixture): Promise<PairingResult>;
  openSession(deviceId: string): Promise<SessionHandle>;
  sendRpc(session: SessionHandle, envelope: RpcEnvelope): Promise<RpcResponse>;
  subscribeEvents(session: SessionHandle, runId: string, fromSeq?: number): AsyncIterable<HarnessEvent>;
  resumeEvents(runId: string, fromSeq: number): HarnessEvent[];
  submitIntent(session: SessionHandle, intent: TaskIntent): Promise<RunHandle>;
  setPolicyDecision(capability: Capability, decision: "allow" | "deny" | "ask"): void;
  approveAction(approvalId: string, digest: string): Promise<{ accepted: boolean }>;
  denyAction(approvalId: string): Promise<{ accepted: boolean }>;
  createArtifact(runId: string, kind?: ArtifactReference["kind"]): Promise<ArtifactReference>;
  injectFault(fault: RecoveryFault, runId?: string): Promise<void>;
  assertNoSecretsLeaked(scope: "mobile" | "events" | "artifacts"): void;
}

interface DeviceRecord {
  deviceId: string;
  name: string;
  trustLevel: NonNullable<Principal["trustLevel"]>;
  revoked: boolean;
}

interface PendingApproval {
  request: ApprovalRequest;
  used: boolean;
  expiresAtMs: number;
}

export class MockDshHost implements MockDshHostTestApi {
  private seed = "default";
  private counter = 0;
  private devices = new Map<string, DeviceRecord>();
  private sessions = new Map<string, SessionHandle>();
  private events = new Map<string, HarnessEvent[]>();
  private approvals = new Map<string, PendingApproval>();
  private artifacts = new Map<string, ArtifactReference>();
  private policy = new Map<Capability, "allow" | "deny" | "ask">();

  async reset(seed = "default"): Promise<void> {
    this.seed = seed;
    this.counter = 0;
    this.devices.clear();
    this.sessions.clear();
    this.events.clear();
    this.approvals.clear();
    this.artifacts.clear();
    this.policy.clear();
  }

  async pairDevice(fixture: PairingFixture): Promise<PairingResult> {
    const deviceId = this.nextId("dev");
    const pairingId = this.nextId("pair");
    const trustLevel = fixture.trustLevel ?? "operator";
    const expiresAt = new Date(Date.now() + (fixture.tokenTtlSeconds ?? 120) * 1000).toISOString();

    this.devices.set(deviceId, {
      deviceId,
      name: fixture.deviceName,
      trustLevel,
      revoked: false
    });

    return { deviceId, pairingId, expiresAt };
  }

  async openSession(deviceId: string): Promise<SessionHandle> {
    const device = this.devices.get(deviceId);
    if (!device || device.revoked) {
      throw new Error("Cannot open session for unknown or revoked device");
    }

    const session: SessionHandle = {
      sessionId: this.nextId("sess"),
      deviceId,
      principal: {
        kind: "mobile_device",
        id: deviceId,
        trustLevel: device.trustLevel
      },
      lastSeq: 0,
      active: true
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  async sendRpc(session: SessionHandle, envelope: RpcEnvelope): Promise<RpcResponse> {
    if (!session.active || !this.sessions.has(session.sessionId)) {
      return this.error(envelope.messageId, envelope.messageId, "session_expired", "Session is not active");
    }

    if (!hasProtocolEnvelope(envelope) || !isSupportedProtocol(envelope.protocol)) {
      return this.error(envelope.messageId, envelope.messageId, "unsupported_protocol", "Unsupported protocol");
    }

    if (envelope.sessionId !== session.sessionId || envelope.deviceId !== session.deviceId) {
      return this.error(envelope.messageId, envelope.messageId, "unauthenticated", "Envelope principal mismatch");
    }

    if (envelope.seq <= session.lastSeq) {
      return this.error(envelope.messageId, envelope.messageId, "replay_rejected", "Sequence replay rejected");
    }

    session.lastSeq = envelope.seq;
    return {
      messageId: this.nextId("msg"),
      correlationId: envelope.messageId,
      ok: true,
      result: { accepted: true, protocol: currentProtocol() },
      error: null
    };
  }

  async *subscribeEvents(
    session: SessionHandle,
    runId: string,
    fromSeq = 0
  ): AsyncIterable<HarnessEvent> {
    this.ensureActiveSession(session);
    for (const event of this.resumeEvents(runId, fromSeq)) {
      yield event;
    }
  }

  resumeEvents(runId: string, fromSeq: number): HarnessEvent[] {
    return (this.events.get(runId) ?? []).filter((event) => event.seq > fromSeq);
  }

  async submitIntent(session: SessionHandle, intent: TaskIntent): Promise<RunHandle> {
    this.ensureActiveSession(session);
    const decision = this.policy.get("task.submit") ?? "allow";
    if (decision === "deny") {
      const runId = this.nextId("run");
      this.appendEvent(runId, "security_policy_denied", {
        capability: "task.submit",
        principal: session.principal
      });
      throw new Error("task.submit denied by policy");
    }

    const runId = this.nextId("run");
    this.appendEvent(runId, "task_submitted", {
      principal: session.principal,
      intent: {
        ...intent,
        input: {
          ...intent.input,
          prompt: redactString(intent.input.prompt)
        }
      }
    });
    this.appendEvent(runId, "run_started", { profile: intent.profile });

    if (intent.policy.toolMode === "approval_required") {
      const approval = this.createApproval(runId);
      this.approvals.set(approval.approvalId, {
        request: approval,
        used: false,
        expiresAtMs: Date.now() + approval.scope.ttlSeconds * 1000
      });
      this.appendEvent(runId, "approval_required", approval);
    }

    return { runId };
  }

  setPolicyDecision(capability: Capability, decision: "allow" | "deny" | "ask"): void {
    this.policy.set(capability, decision);
  }

  async approveAction(approvalId: string, digest: string): Promise<{ accepted: boolean }> {
    const pending = this.approvals.get(approvalId);
    if (!pending || pending.used || pending.expiresAtMs < Date.now()) {
      return { accepted: false };
    }

    if (pending.request.action.digest !== digest) {
      return { accepted: false };
    }

    pending.used = true;
    this.appendEvent(pending.request.runId, "approval_decided", {
      approvalId,
      decision: "approve"
    } satisfies Pick<ApprovalDecision, "approvalId" | "decision">);
    return { accepted: true };
  }

  async denyAction(approvalId: string): Promise<{ accepted: boolean }> {
    const pending = this.approvals.get(approvalId);
    if (!pending || pending.used) {
      return { accepted: false };
    }

    pending.used = true;
    this.appendEvent(pending.request.runId, "approval_decided", {
      approvalId,
      decision: "deny"
    });
    return { accepted: true };
  }

  async createArtifact(runId: string, kind: ArtifactReference["kind"] = "summary.json"): Promise<ArtifactReference> {
    const artifact: ArtifactReference = {
      artifactId: this.nextId("art"),
      runId,
      kind,
      visibility: "mobile_summary",
      sizeBytes: 128,
      digest: `sha256:${this.nextId("digest")}`,
      redaction: "applied",
      downloadMethod: "artifact.get"
    };
    this.artifacts.set(artifact.artifactId, artifact);
    this.appendEvent(runId, "artifact_written", artifact);
    return artifact;
  }

  async injectFault(fault: RecoveryFault, runId?: string): Promise<void> {
    if (fault === "pc_restart") {
      for (const session of this.sessions.values()) {
        session.active = false;
      }
      return;
    }

    if (runId) {
      this.appendEvent(runId, "run_failed", { fault });
    }
  }

  assertNoSecretsLeaked(scope: "mobile" | "events" | "artifacts"): void {
    const data =
      scope === "artifacts"
        ? Array.from(this.artifacts.values())
        : Array.from(this.events.values()).flat();
    const serialized = JSON.stringify(data);
    if (
      /sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]+|(?:SECRET|TOKEN|PASSWORD)=((?!\[REDACTED\])[^"\\\s]+)/i.test(
        serialized
      )
    ) {
      throw new Error(`Secret leaked in ${scope}`);
    }
  }

  createEnvelope(session: SessionHandle, method: string, seq: number, params: unknown = {}): RpcEnvelope {
    return {
      protocol: currentProtocol(),
      messageId: this.nextId("msg"),
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      seq,
      timestamp: new Date().toISOString(),
      method,
      params,
      auth: {
        kind: "session_proof",
        nonce: this.nextId("nonce"),
        signature: "mock-signature"
      }
    };
  }

  private createApproval(runId: string): ApprovalRequest {
    return {
      approvalId: this.nextId("appr"),
      runId,
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

  private appendEvent(runId: string, type: HarnessEvent["type"], data: unknown): HarnessEvent {
    const events = this.events.get(runId) ?? [];
    const event: HarnessEvent = {
      eventId: this.nextId("evt"),
      runId,
      source: {
        pluginId: "mock-dsh-host",
        kind: "mock"
      },
      type,
      level: "info",
      timestamp: new Date().toISOString(),
      seq: events.length + 1,
      data,
      redaction: {
        containsSensitiveContent: false,
        policy: "mobile-safe"
      }
    };
    events.push(event);
    this.events.set(runId, events);
    return event;
  }

  private ensureActiveSession(session: SessionHandle): void {
    if (!session.active || !this.sessions.has(session.sessionId)) {
      throw new Error("Session is not active");
    }
  }

  private error(
    messageId: string,
    correlationId: string,
    code: RpcError["code"],
    message: string
  ): RpcResponse {
    return {
      messageId,
      correlationId,
      ok: false,
      result: null,
      error: {
        code,
        message,
        retryable: false
      }
    };
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.seed}_${this.counter.toString().padStart(4, "0")}`;
  }
}

export function createMockDshHost(): MockDshHost {
  return new MockDshHost();
}
