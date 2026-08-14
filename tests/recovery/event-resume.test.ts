import { describe, expect, it } from "vitest";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("event recovery", () => {
  it("resumes events after a known sequence", async () => {
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

    const allEvents = host.resumeEvents(run.runId, 0);
    const resumed = host.resumeEvents(run.runId, 1);

    expect(allEvents.length).toBeGreaterThan(1);
    expect(resumed.every((event) => event.seq > 1)).toBe(true);
  });

  it("requires a new session after PC restart while preserving paired device trust", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone", trustLevel: "operator" });
    const session = await host.openSession(pairing.deviceId);

    await host.injectFault("pc_restart");

    const expired = await host.sendRpc(session, host.createEnvelope(session, "task.submit", 1));
    expect(expired.ok).toBe(false);
    if (!expired.ok) {
      expect(expired.error.code).toBe("session_expired");
    }

    const resumedSession = await host.openSession(pairing.deviceId);
    const resumed = await host.sendRpc(resumedSession, host.createEnvelope(resumedSession, "task.submit", 1));

    expect(resumed.ok).toBe(true);
    expect(resumedSession.principal.trustLevel).toBe("operator");
  });
});
