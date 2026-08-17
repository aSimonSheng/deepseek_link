import { describe, expect, it } from "vitest";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("RPC replay and principal mismatch matrix", () => {
  it("rejects same and lower sequence numbers even with fresh nonces", async () => {
    const { host, session } = await setupSession();

    const accepted = await host.sendRpc(session, host.createEnvelope(session, "task.submit", 2));
    const sameSeq = await host.sendRpc(session, host.createEnvelope(session, "task.submit", 2));
    const lowerSeq = await host.sendRpc(session, host.createEnvelope(session, "task.submit", 1));

    expect(accepted.ok).toBe(true);
    expectErrorCode(sameSeq, "replay_rejected");
    expectErrorCode(lowerSeq, "replay_rejected");
  });

  it("rejects nonce replay with a higher sequence number", async () => {
    const { host, session } = await setupSession();
    const first = host.createEnvelope(session, "task.submit", 1);
    const replayedNonce = host.createEnvelope(session, "task.submit", 2);
    replayedNonce.auth.nonce = first.auth.nonce;

    expect((await host.sendRpc(session, first)).ok).toBe(true);
    expectErrorCode(await host.sendRpc(session, replayedNonce), "replay_rejected");
  });

  it("rejects session and device principal mismatches", async () => {
    const host = createMockDshHost();
    const firstPairing = await host.pairDevice({ deviceName: "phone-a" });
    const secondPairing = await host.pairDevice({ deviceName: "phone-b" });
    const firstSession = await host.openSession(firstPairing.deviceId);
    const secondSession = await host.openSession(secondPairing.deviceId);
    const secondEnvelope = host.createEnvelope(secondSession, "task.submit", 1);
    const wrongSessionId = {
      ...host.createEnvelope(firstSession, "task.submit", 1),
      sessionId: secondSession.sessionId
    };
    const wrongDeviceId = {
      ...host.createEnvelope(firstSession, "task.submit", 2),
      deviceId: secondSession.deviceId
    };

    expectErrorCode(await host.sendRpc(firstSession, secondEnvelope), "unauthenticated");
    expectErrorCode(await host.sendRpc(firstSession, wrongSessionId), "unauthenticated");
    expectErrorCode(await host.sendRpc(firstSession, wrongDeviceId), "unauthenticated");
  });

  it("rejects unsupported protocol versions before session proof evaluation", async () => {
    const { host, session } = await setupSession();
    const unsupportedProtocol = {
      ...host.createEnvelope(session, "task.submit", 1),
      protocol: {
        name: "dsh-mobile-bridge" as const,
        major: 2,
        minor: 0
      }
    };

    expectErrorCode(await host.sendRpc(session, unsupportedProtocol), "unsupported_protocol");
  });
});

async function setupSession(): Promise<{
  host: ReturnType<typeof createMockDshHost>;
  session: Awaited<ReturnType<ReturnType<typeof createMockDshHost>["openSession"]>>;
}> {
  const host = createMockDshHost();
  const pairing = await host.pairDevice({ deviceName: "phone" });
  const session = await host.openSession(pairing.deviceId);
  return { host, session };
}

function expectErrorCode(response: Awaited<ReturnType<ReturnType<typeof createMockDshHost>["sendRpc"]>>, code: string): void {
  expect(response.ok).toBe(false);
  if (!response.ok) {
    expect(response.error.code).toBe(code);
  }
}
