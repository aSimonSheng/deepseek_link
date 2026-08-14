import { describe, expect, it } from "vitest";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("mobile-PC mock flow", () => {
  it("pairs, submits intent, requests approval, approves once, and writes an artifact summary", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone", trustLevel: "approver" });
    const session = await host.openSession(pairing.deviceId);

    const run = await host.submitIntent(session, {
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
    });

    const approval = host.resumeEvents(run.runId, 0).find((event) => event.type === "approval_required");
    expect(approval).toBeDefined();

    const request = approval?.data as { approvalId: string; action: { digest: string } };
    const firstApproval = await host.approveAction(request.approvalId, request.action.digest);
    const secondApproval = await host.approveAction(request.approvalId, request.action.digest);
    const artifact = await host.createArtifact(run.runId);

    expect(firstApproval.accepted).toBe(true);
    expect(secondApproval.accepted).toBe(false);
    expect(artifact.visibility).toBe("mobile_summary");
    expect(() => host.assertNoSecretsLeaked("artifacts")).not.toThrow();
  });
});
