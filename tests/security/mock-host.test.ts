import { describe, expect, it } from "vitest";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("mock host security controls", () => {
  it("rejects replayed sequence numbers", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    const envelope = host.createEnvelope(session, "task.submit", 1);

    const first = await host.sendRpc(session, envelope);
    const second = await host.sendRpc(session, envelope);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe("replay_rejected");
    }
  });

  it("redacts secret-like prompt content from mobile events", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);

    await host.submitIntent(session, {
      workspaceRef: "workspace:current",
      taskKind: "agent.run",
      profile: "default",
      input: {
        prompt: "TOKEN=super-secret-value",
        attachments: []
      },
      policy: {
        toolMode: "approval_required",
        networkMode: "deny",
        artifactVisibility: "mobile_summary"
      }
    });

    expect(() => host.assertNoSecretsLeaked("events")).not.toThrow();
  });
});
