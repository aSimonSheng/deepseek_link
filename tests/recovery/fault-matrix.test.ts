import { describe, expect, it } from "vitest";
import { createMobileBridgeTransport } from "@dsh-mobile/mobile-bridge-transport";
import { createMockDshHost, type RecoveryFault } from "@dsh-mobile/mock-dsh-host";

describe("foundation recovery fault matrix", () => {
  it.each(["mobile_disconnect", "worker_crash", "approval_timeout"] satisfies RecoveryFault[])(
    "records %s as append-only run failure evidence",
    async (fault) => {
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

      const before = host.resumeEvents(run.runId, 0);
      await host.injectFault(fault, run.runId);
      const after = host.resumeEvents(run.runId, 0);
      const failed = after.at(-1);

      expect(after.length).toBe(before.length + 1);
      expect(failed?.type).toBe("run_failed");
      expect(failed?.data).toEqual({ fault });
      expect(after.map((event) => event.seq)).toEqual(after.map((_, index) => index + 1));
    }
  );

  it("closes all active sessions on PC restart", async () => {
    const host = createMockDshHost();
    const firstPairing = await host.pairDevice({ deviceName: "phone-a" });
    const secondPairing = await host.pairDevice({ deviceName: "phone-b" });
    const firstSession = await host.openSession(firstPairing.deviceId);
    const secondSession = await host.openSession(secondPairing.deviceId);

    await host.injectFault("pc_restart");

    const closedSessions = host
      .getControlEvents(0)
      .filter((event) => event.type === "session_closed")
      .map((event) => event.sessionId)
      .sort();

    expect(closedSessions).toEqual([firstSession.sessionId, secondSession.sessionId].sort());
  });

  it("resumes event streams after transport stop/start without changing endpoint identity", async () => {
    const host = createMockDshHost();
    const transport = createMobileBridgeTransport();
    const endpoint = transport.start();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    transport.bindSession(session);
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

    transport.stop();
    const restarted = transport.start();
    const resumed = transport.resumeEvents(
      {
        endpointId: restarted.endpointId,
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        runId: run.runId,
        fromSeq: 0,
        gapPolicy: "replay_from_seq",
        auth: host.createEnvelope(session, "run.events.read", 1).auth
      },
      host.resumeEvents(run.runId, 0)
    );

    expect(restarted.endpointId).toBe(endpoint.endpointId);
    expect(resumed.length).toBeGreaterThan(0);
  });
});
