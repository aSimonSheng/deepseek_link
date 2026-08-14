import { describe, expect, it } from "vitest";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("mock host security controls", () => {
  it("rejects expired and reused pairing offers", async () => {
    const host = createMockDshHost();
    const expiredOffer = await host.createPairingOffer({ deviceName: "phone" });
    const expiredCompletion = host.createPairingCompletion(expiredOffer, { deviceName: "phone" });
    host.expirePairing(expiredOffer.pairingId);

    await expect(host.completePairing(expiredCompletion)).rejects.toThrow("expired");

    const offer = await host.createPairingOffer({ deviceName: "phone" });
    const completion = host.createPairingCompletion(offer, { deviceName: "phone" });
    const pairing = await host.completePairing(completion);

    expect(pairing.deviceId).toBe(completion.device.deviceId);
    await expect(host.completePairing(completion)).rejects.toThrow("already used");
  });

  it("rejects invalid pairing and session signatures", async () => {
    const host = createMockDshHost();
    const offer = await host.createPairingOffer({ deviceName: "phone" });
    const invalidPairing = {
      ...host.createPairingCompletion(offer, { deviceName: "phone" }),
      signature: "invalid-signature"
    };

    await expect(host.completePairing(invalidPairing)).rejects.toThrow("Invalid pairing signature");

    const pairing = await host.pairDevice({ deviceName: "phone" });
    const challenge = await host.createSessionChallenge(pairing.deviceId);
    const invalidSessionOpen = {
      ...host.createSessionOpenRequest(challenge),
      signature: "invalid-signature"
    };

    await expect(host.completeSessionOpen(invalidSessionOpen)).rejects.toThrow("Invalid session open signature");
  });

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

  it("rejects reused session nonces and invalid session proofs", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    const first = host.createEnvelope(session, "task.submit", 1);
    const reusedNonce = host.createEnvelope(session, "task.submit", 2);
    reusedNonce.auth.nonce = first.auth.nonce;
    const invalidProof = host.createEnvelope(session, "task.submit", 3);
    invalidProof.auth.signature = "invalid-signature";

    const firstResponse = await host.sendRpc(session, first);
    const nonceReplayResponse = await host.sendRpc(session, reusedNonce);
    const invalidProofResponse = await host.sendRpc(session, invalidProof);

    expect(firstResponse.ok).toBe(true);
    expect(nonceReplayResponse.ok).toBe(false);
    if (!nonceReplayResponse.ok) {
      expect(nonceReplayResponse.error.code).toBe("replay_rejected");
    }
    expect(invalidProofResponse.ok).toBe(false);
    if (!invalidProofResponse.ok) {
      expect(invalidProofResponse.error.code).toBe("unauthenticated");
    }
  });

  it("expires sessions and rejects revoked devices", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    host.expireSession(session.sessionId);

    const expired = await host.sendRpc(session, host.createEnvelope(session, "task.submit", 1));
    expect(expired.ok).toBe(false);
    if (!expired.ok) {
      expect(expired.error.code).toBe("session_expired");
    }

    const nextSession = await host.openSession(pairing.deviceId);
    await host.revokeDevice(pairing.deviceId);

    const revoked = await host.sendRpc(nextSession, host.createEnvelope(nextSession, "task.submit", 1));
    expect(revoked.ok).toBe(false);
    if (!revoked.ok) {
      expect(revoked.error.code).toBe("session_expired");
    }
    await expect(host.openSession(pairing.deviceId)).rejects.toThrow("revoked");
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
