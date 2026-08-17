import { describe, expect, it } from "vitest";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("pairing and session state machine", () => {
  it("rejects pairing completion with a trust level outside the offer", async () => {
    const host = createMockDshHost();
    const offer = await host.createPairingOffer({ deviceName: "phone", trustLevel: "operator" });
    const completion = {
      ...host.createPairingCompletion(offer, { deviceName: "phone" }),
      requestedTrustLevel: "admin" as const
    };

    await expect(host.completePairing(completion)).rejects.toThrow("Requested trust level is not allowed");
  });

  it("rejects expired session challenges", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const challenge = await host.createSessionChallenge(pairing.deviceId);
    const request = host.createSessionOpenRequest(challenge);

    host.expireSessionChallenge(challenge.sessionId);

    await expect(host.completeSessionOpen(request)).rejects.toThrow("Session challenge expired");
  });

  it("rejects reused session open requests", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const challenge = await host.createSessionChallenge(pairing.deviceId);
    const request = host.createSessionOpenRequest(challenge);

    await host.completeSessionOpen(request);

    await expect(host.completeSessionOpen(request)).rejects.toThrow("Unknown session challenge");
  });

  it("rejects session open requests with mismatched challenge fields", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const challenge = await host.createSessionChallenge(pairing.deviceId);
    const wrongChallenge = {
      ...host.createSessionOpenRequest(challenge),
      challenge: "different-challenge"
    };
    const wrongDevice = {
      ...host.createSessionOpenRequest(challenge),
      deviceId: "dev_other"
    };

    await expect(host.completeSessionOpen(wrongChallenge)).rejects.toThrow("Session challenge mismatch");
    await expect(host.completeSessionOpen(wrongDevice)).rejects.toThrow("Session challenge mismatch");
  });
});
