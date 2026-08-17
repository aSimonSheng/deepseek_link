import { describe, expect, it } from "vitest";
import { validateHarnessEvent } from "@dsh-mobile/protocol";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("append-only event evidence invariants", () => {
  it("emits valid mobile-safe control events with monotonic sequence numbers", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);

    await host.injectFault("pc_restart");

    const controlEvents = host.getControlEvents(0);
    expect(controlEvents.map((event) => event.type)).toEqual([
      "device_pairing_created",
      "device_pairing_completed",
      "session_opened",
      "session_closed"
    ]);
    expect(isStrictSequence(controlEvents.map((event) => event.seq))).toBe(true);
    expect(controlEvents.every((event) => validateHarnessEvent(event).ok)).toBe(true);
    expect(controlEvents.every((event) => event.redaction.policy === "mobile-safe")).toBe(true);
    expect(controlEvents.some((event) => event.sessionId === session.sessionId && event.type === "session_closed")).toBe(true);
  });

  it("keeps run events append-only with stable sequence numbers", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    const run = await host.submitIntent(session, {
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
    });

    const beforeArtifact = host.resumeEvents(run.runId, 0);
    await host.createArtifact(run.runId);
    const afterArtifact = host.resumeEvents(run.runId, 0);

    expect(beforeArtifact.length).toBeGreaterThan(1);
    expect(afterArtifact.length).toBe(beforeArtifact.length + 1);
    expect(afterArtifact.slice(0, beforeArtifact.length).map((event) => event.eventId)).toEqual(
      beforeArtifact.map((event) => event.eventId)
    );
    expect(isStrictSequence(afterArtifact.map((event) => event.seq))).toBe(true);
    expect(afterArtifact.every((event) => validateHarnessEvent(event).ok)).toBe(true);
    expect(afterArtifact.every((event) => event.redaction.policy === "mobile-safe")).toBe(true);
  });

  it("records device revocation as session closure evidence", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);

    await host.revokeDevice(pairing.deviceId);

    const closure = host
      .getControlEvents(0)
      .find((event) => event.type === "session_closed" && event.sessionId === session.sessionId);

    expect(closure).toBeDefined();
    expect(closure?.data).toEqual({
      sessionId: session.sessionId,
      reason: "device_revoked"
    });
  });
});

function isStrictSequence(values: number[]): boolean {
  return values.every((value, index) => value === index + 1);
}
