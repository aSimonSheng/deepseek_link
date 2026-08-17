import { describe, expect, it } from "vitest";
import { createMobileBridgeTransport } from "@dsh-mobile/mobile-bridge-transport";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("mobile bridge transport recovery", () => {
  it("resumes run events from a known sequence", async () => {
    const host = createMockDshHost();
    const transport = createMobileBridgeTransport();
    transport.start();

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

    const resumed = transport.resumeEvents(
      {
        endpointId: transport.endpoint().endpointId,
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        runId: run.runId,
        fromSeq: 1,
        gapPolicy: "replay_from_seq",
        auth: host.createEnvelope(session, "run.events.read", 1).auth
      },
      host.resumeEvents(run.runId, 0)
    );

    expect(resumed.length).toBeGreaterThan(0);
    expect(resumed.every((event) => event.seq > 1)).toBe(true);
  });

  it("fails closed when event resume detects a sequence gap", async () => {
    const host = createMockDshHost();
    const transport = createMobileBridgeTransport();
    transport.start();

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
    const eventsWithGap = host.resumeEvents(run.runId, 0).filter((event) => event.seq !== 2);

    expect(() =>
      transport.resumeEvents(
        {
          endpointId: transport.endpoint().endpointId,
          sessionId: session.sessionId,
          deviceId: session.deviceId,
          runId: run.runId,
          fromSeq: 1,
          gapPolicy: "fail_closed",
          auth: host.createEnvelope(session, "run.events.read", 1).auth
        },
        eventsWithGap
      )
    ).toThrow("Event stream gap detected");
  });
});
