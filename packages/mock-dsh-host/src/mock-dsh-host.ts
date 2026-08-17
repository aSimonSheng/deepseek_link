import {
  currentProtocol,
  hasProtocolEnvelope,
  isSupportedProtocol,
  redactString,
  validatePairingCompletion,
  validatePairingOffer,
  validateSessionChallenge,
  validateSessionOpenRequest,
  type ApprovalDecision,
  type ApprovalRequest,
  type ArtifactReference,
  type Capability,
  type DeviceRegistration,
  type DeviceTrustLevel,
  type HarnessEvent,
  type PairingCompletion,
  type PairingOffer,
  type Principal,
  type RpcError,
  type RpcEnvelope,
  type RpcResponse,
  type SessionChallenge,
  type SessionOpenRequest,
  type TaskIntent
} from "@dsh-mobile/protocol";

const DEFAULT_PAIRING_TTL_SECONDS = 120;
const DEFAULT_SESSION_CHALLENGE_TTL_SECONDS = 60;
const DEFAULT_SESSION_TTL_SECONDS = 3600;

export interface PairingFixture {
  deviceName: string;
  trustLevel?: Principal["trustLevel"];
  tokenTtlSeconds?: number;
  platform?: DeviceRegistration["platform"];
}

export interface PairingResult {
  deviceId: string;
  pairingId: string;
  expiresAt: string;
  pairedAt: string;
  trustLevel: DeviceTrustLevel;
}

export interface SessionHandle {
  sessionId: string;
  deviceId: string;
  principal: Principal;
  lastSeq: number;
  issuedAt: string;
  expiresAt: string;
  active: boolean;
}

export interface RunHandle {
  runId: string;
}

export type RecoveryFault = "mobile_disconnect" | "pc_restart" | "worker_crash" | "approval_timeout";

export interface MockDshHostTestApi {
  reset(seed?: string): Promise<void>;
  createPairingOffer(fixture: PairingFixture): Promise<PairingOffer>;
  createPairingCompletion(offer: PairingOffer, fixture: PairingFixture): PairingCompletion;
  completePairing(completion: PairingCompletion): Promise<PairingResult>;
  pairDevice(fixture: PairingFixture): Promise<PairingResult>;
  createSessionChallenge(deviceId: string): Promise<SessionChallenge>;
  createSessionOpenRequest(challenge: SessionChallenge): SessionOpenRequest;
  completeSessionOpen(request: SessionOpenRequest): Promise<SessionHandle>;
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
  revokeDevice(deviceId: string): Promise<void>;
  expirePairing(pairingId: string): void;
  expireSessionChallenge(sessionId: string): void;
  expireSession(sessionId: string): void;
  getControlEvents(fromSeq?: number): HarnessEvent[];
  assertNoSecretsLeaked(scope: "mobile" | "events" | "artifacts"): void;
}

interface DeviceRecord {
  deviceId: string;
  name: string;
  publicKey: string;
  platform: DeviceRegistration["platform"];
  trustLevel: NonNullable<Principal["trustLevel"]>;
  pairedAt: string;
  revoked: boolean;
}

interface PairingRecord {
  offer: PairingOffer;
  used: boolean;
  expiresAtMs: number;
}

interface PendingSessionChallenge {
  challenge: SessionChallenge;
  expiresAtMs: number;
}

interface SessionRecord extends SessionHandle {
  expiresAtMs: number;
  seenNonces: Set<string>;
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
  private pairings = new Map<string, PairingRecord>();
  private sessionChallenges = new Map<string, PendingSessionChallenge>();
  private sessions = new Map<string, SessionRecord>();
  private controlEvents: HarnessEvent[] = [];
  private events = new Map<string, HarnessEvent[]>();
  private approvals = new Map<string, PendingApproval>();
  private artifacts = new Map<string, ArtifactReference>();
  private policy = new Map<Capability, "allow" | "deny" | "ask">();

  async reset(seed = "default"): Promise<void> {
    this.seed = seed;
    this.counter = 0;
    this.devices.clear();
    this.pairings.clear();
    this.sessionChallenges.clear();
    this.sessions.clear();
    this.controlEvents = [];
    this.events.clear();
    this.approvals.clear();
    this.artifacts.clear();
    this.policy.clear();
  }

  async createPairingOffer(fixture: PairingFixture): Promise<PairingOffer> {
    const createdAt = new Date();
    const ttlSeconds = clampTtl(fixture.tokenTtlSeconds, DEFAULT_PAIRING_TTL_SECONDS, 300);
    const pairingId = this.nextId("pair");
    const trustLevel = this.normalizeTrustLevel(fixture.trustLevel);
    const offer: PairingOffer = {
      pairingId,
      pairingCode: `${this.nextId("paircode")}-mock-pairing`,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + ttlSeconds * 1000).toISOString(),
      entropyBits: 128,
      oneTime: true,
      pc: {
        hostId: `pc_${this.seed}`,
        displayName: "Mock DSH Host"
      },
      transport: {
        kind: "mock",
        endpointHint: "loopback",
        authenticated: true
      },
      allowedTrustLevels: [trustLevel]
    };

    this.assertValidResult(validatePairingOffer(offer));
    this.pairings.set(pairingId, {
      offer,
      used: false,
      expiresAtMs: Date.parse(offer.expiresAt)
    });
    this.appendControlEvent("device_pairing_created", {
      pairingId,
      expiresAt: offer.expiresAt,
      allowedTrustLevels: offer.allowedTrustLevels
    });
    return offer;
  }

  createPairingCompletion(offer: PairingOffer, fixture: PairingFixture): PairingCompletion {
    const deviceId = this.nextId("dev");
    const nonce = this.nextId("pairnonce");
    const requestedTrustLevel = this.normalizeTrustLevel(fixture.trustLevel ?? offer.allowedTrustLevels[0]);
    return {
      pairingId: offer.pairingId,
      pairingCode: offer.pairingCode,
      requestedTrustLevel,
      device: {
        deviceId,
        displayName: fixture.deviceName,
        publicKey: `mock-public-key:${this.nextId("key")}`,
        platform: fixture.platform ?? "web"
      },
      nonce,
      signature: this.mockPairingSignature(offer.pairingId, deviceId, nonce)
    };
  }

  async completePairing(completion: PairingCompletion): Promise<PairingResult> {
    this.assertValidResult(validatePairingCompletion(completion));
    const pairing = this.pairings.get(completion.pairingId);
    if (!pairing) {
      throw new Error("Unknown pairing offer");
    }
    if (pairing.used) {
      throw new Error("Pairing code already used");
    }
    if (pairing.expiresAtMs < Date.now()) {
      throw new Error("Pairing offer expired");
    }
    if (pairing.offer.pairingCode !== completion.pairingCode) {
      throw new Error("Pairing code mismatch");
    }
    if (!pairing.offer.allowedTrustLevels.includes(completion.requestedTrustLevel)) {
      throw new Error("Requested trust level is not allowed");
    }
    if (
      completion.signature !==
      this.mockPairingSignature(completion.pairingId, completion.device.deviceId, completion.nonce)
    ) {
      throw new Error("Invalid pairing signature");
    }

    pairing.used = true;
    const pairedAt = new Date().toISOString();

    this.devices.set(completion.device.deviceId, {
      deviceId: completion.device.deviceId,
      name: completion.device.displayName,
      publicKey: completion.device.publicKey,
      platform: completion.device.platform,
      trustLevel: completion.requestedTrustLevel,
      pairedAt,
      revoked: false
    });
    this.appendControlEvent("device_pairing_completed", {
      pairingId: completion.pairingId,
      deviceId: completion.device.deviceId,
      trustLevel: completion.requestedTrustLevel
    });

    return {
      deviceId: completion.device.deviceId,
      pairingId: completion.pairingId,
      expiresAt: pairing.offer.expiresAt,
      pairedAt,
      trustLevel: completion.requestedTrustLevel
    };
  }

  async pairDevice(fixture: PairingFixture): Promise<PairingResult> {
    const offer = await this.createPairingOffer(fixture);
    return this.completePairing(this.createPairingCompletion(offer, fixture));
  }

  async createSessionChallenge(deviceId: string): Promise<SessionChallenge> {
    const device = this.devices.get(deviceId);
    if (!device || device.revoked) {
      throw new Error("Cannot create session for unknown or revoked device");
    }

    const issuedAt = new Date();
    const challenge: SessionChallenge = {
      sessionId: this.nextId("sess"),
      deviceId,
      challenge: `${this.nextId("challenge")}-mock-session`,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + DEFAULT_SESSION_CHALLENGE_TTL_SECONDS * 1000).toISOString(),
      seqStart: 1
    };
    this.assertValidResult(validateSessionChallenge(challenge));
    this.sessionChallenges.set(challenge.sessionId, {
      challenge,
      expiresAtMs: Date.parse(challenge.expiresAt)
    });
    return challenge;
  }

  createSessionOpenRequest(challenge: SessionChallenge): SessionOpenRequest {
    const nonce = this.nextId("sessnonce");
    return {
      sessionId: challenge.sessionId,
      deviceId: challenge.deviceId,
      challenge: challenge.challenge,
      nonce,
      signature: this.mockSessionOpenSignature(challenge.sessionId, challenge.deviceId, nonce)
    };
  }

  async completeSessionOpen(request: SessionOpenRequest): Promise<SessionHandle> {
    this.assertValidResult(validateSessionOpenRequest(request));
    const pending = this.sessionChallenges.get(request.sessionId);
    if (!pending) {
      throw new Error("Unknown session challenge");
    }
    if (pending.expiresAtMs < Date.now()) {
      this.sessionChallenges.delete(request.sessionId);
      throw new Error("Session challenge expired");
    }
    if (pending.challenge.deviceId !== request.deviceId || pending.challenge.challenge !== request.challenge) {
      throw new Error("Session challenge mismatch");
    }
    if (request.signature !== this.mockSessionOpenSignature(request.sessionId, request.deviceId, request.nonce)) {
      throw new Error("Invalid session open signature");
    }

    const device = this.devices.get(request.deviceId);
    if (!device || device.revoked) {
      throw new Error("Cannot open session for unknown or revoked device");
    }

    this.sessionChallenges.delete(request.sessionId);
    const issuedAt = new Date();
    const session: SessionRecord = {
      sessionId: request.sessionId,
      deviceId: request.deviceId,
      principal: {
        kind: "mobile_device",
        id: request.deviceId,
        trustLevel: device.trustLevel
      },
      lastSeq: 0,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + DEFAULT_SESSION_TTL_SECONDS * 1000).toISOString(),
      active: true,
      expiresAtMs: issuedAt.getTime() + DEFAULT_SESSION_TTL_SECONDS * 1000,
      seenNonces: new Set()
    };
    this.sessions.set(session.sessionId, session);
    this.appendControlEvent("session_opened", {
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      expiresAt: session.expiresAt
    }, session.sessionId);
    return session;
  }

  async openSession(deviceId: string): Promise<SessionHandle> {
    const challenge = await this.createSessionChallenge(deviceId);
    return this.completeSessionOpen(this.createSessionOpenRequest(challenge));
  }

  async sendRpc(session: SessionHandle, envelope: RpcEnvelope): Promise<RpcResponse> {
    if (!hasProtocolEnvelope(envelope) || !isSupportedProtocol(envelope.protocol)) {
      return this.error(envelope.messageId, envelope.messageId, "unsupported_protocol", "Unsupported protocol");
    }

    const record = this.sessions.get(session.sessionId);
    if (!record || !record.active) {
      return this.error(envelope.messageId, envelope.messageId, "session_expired", "Session is not active");
    }

    if (record.expiresAtMs < Date.now()) {
      record.active = false;
      this.appendControlEvent("session_closed", {
        sessionId: record.sessionId,
        reason: "expired"
      }, record.sessionId);
      return this.error(envelope.messageId, envelope.messageId, "session_expired", "Session expired");
    }

    const device = this.devices.get(record.deviceId);
    if (!device || device.revoked) {
      record.active = false;
      this.appendControlEvent("session_closed", {
        sessionId: record.sessionId,
        reason: "device_revoked"
      }, record.sessionId);
      return this.error(envelope.messageId, envelope.messageId, "session_expired", "Device is revoked");
    }

    if (
      envelope.sessionId !== record.sessionId ||
      envelope.deviceId !== record.deviceId ||
      session.sessionId !== record.sessionId ||
      session.deviceId !== record.deviceId
    ) {
      return this.error(envelope.messageId, envelope.messageId, "unauthenticated", "Envelope principal mismatch");
    }

    if (envelope.seq <= record.lastSeq) {
      return this.error(envelope.messageId, envelope.messageId, "replay_rejected", "Sequence replay rejected");
    }

    if (record.seenNonces.has(envelope.auth.nonce)) {
      return this.error(envelope.messageId, envelope.messageId, "replay_rejected", "Session nonce replay rejected");
    }

    if (!this.isSessionProofValid(record, envelope)) {
      return this.error(envelope.messageId, envelope.messageId, "unauthenticated", "Invalid session proof");
    }

    record.seenNonces.add(envelope.auth.nonce);
    record.lastSeq = envelope.seq;
    session.lastSeq = record.lastSeq;
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
        this.appendControlEvent("session_closed", {
          sessionId: session.sessionId,
          reason: "pc_restart"
        }, session.sessionId);
      }
      return;
    }

    if (runId) {
      this.appendEvent(runId, "run_failed", { fault });
    }
  }

  async revokeDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return;
    }

    device.revoked = true;
    for (const session of this.sessions.values()) {
      if (session.deviceId === deviceId && session.active) {
        session.active = false;
        this.appendControlEvent("session_closed", {
          sessionId: session.sessionId,
          reason: "device_revoked"
        }, session.sessionId);
      }
    }
  }

  expirePairing(pairingId: string): void {
    const pairing = this.pairings.get(pairingId);
    if (pairing) {
      pairing.expiresAtMs = 0;
    }
  }

  expireSessionChallenge(sessionId: string): void {
    const challenge = this.sessionChallenges.get(sessionId);
    if (challenge) {
      challenge.expiresAtMs = 0;
    }
  }

  expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.expiresAtMs = 0;
      session.expiresAt = new Date(0).toISOString();
    }
  }

  getControlEvents(fromSeq = 0): HarnessEvent[] {
    return this.controlEvents.filter((event) => event.seq > fromSeq);
  }

  assertNoSecretsLeaked(scope: "mobile" | "events" | "artifacts"): void {
    const data =
      scope === "artifacts"
        ? Array.from(this.artifacts.values())
        : [...Array.from(this.events.values()).flat(), ...this.controlEvents];
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
    const envelope: RpcEnvelope = {
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
        signature: ""
      }
    };
    const nonce = envelope.auth.nonce;
    envelope.auth.signature = this.mockSessionProofSignature(session.sessionId, session.deviceId, seq, nonce);
    return envelope;
  }

  private appendControlEvent(type: HarnessEvent["type"], data: unknown, sessionId?: string): HarnessEvent {
    const base: HarnessEvent = {
      eventId: this.nextId("evt"),
      source: {
        pluginId: "mock-dsh-host",
        kind: "mock"
      },
      type,
      level: "info",
      timestamp: new Date().toISOString(),
      seq: this.controlEvents.length + 1,
      data,
      redaction: {
        containsSensitiveContent: false,
        policy: "mobile-safe"
      }
    };
    const event = sessionId ? { ...base, sessionId } : base;
    this.controlEvents.push(event);
    return event;
  }

  private assertValidResult(result: { ok: boolean; issues: { path: string; message: string }[] }): void {
    if (!result.ok) {
      throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    }
  }

  private normalizeTrustLevel(trustLevel: Principal["trustLevel"] | undefined): DeviceTrustLevel {
    return trustLevel ?? "operator";
  }

  private mockPairingSignature(pairingId: string, deviceId: string, nonce: string): string {
    return `mock-pairing-signature:${pairingId}:${deviceId}:${nonce}`;
  }

  private mockSessionOpenSignature(sessionId: string, deviceId: string, nonce: string): string {
    return `mock-session-open-signature:${sessionId}:${deviceId}:${nonce}`;
  }

  private mockSessionProofSignature(sessionId: string, deviceId: string, seq: number, nonce: string): string {
    return `mock-session-proof:${sessionId}:${deviceId}:${seq}:${nonce}`;
  }

  private isSessionProofValid(session: SessionRecord, envelope: RpcEnvelope): boolean {
    return (
      envelope.auth.signature ===
      this.mockSessionProofSignature(session.sessionId, session.deviceId, envelope.seq, envelope.auth.nonce)
    );
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
    const record = this.sessions.get(session.sessionId);
    if (!record || !record.active || !session.active) {
      throw new Error("Session is not active");
    }
    if (record.expiresAtMs < Date.now()) {
      record.active = false;
      throw new Error("Session is expired");
    }
    const device = this.devices.get(record.deviceId);
    if (!device || device.revoked) {
      record.active = false;
      throw new Error("Session device is revoked");
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

function clampTtl(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), max);
}
