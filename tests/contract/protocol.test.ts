import { describe, expect, it } from "vitest";
import { currentProtocol, hasProtocolEnvelope } from "@dsh-mobile/protocol";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("protocol contract", () => {
  it("creates supported protocol envelopes", async () => {
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);
    const envelope = host.createEnvelope(session, "task.submit", 1);

    expect(envelope.protocol).toEqual(currentProtocol());
    expect(hasProtocolEnvelope(envelope)).toBe(true);
  });
});
