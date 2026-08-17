import { describe, expect, it } from "vitest";
import { createMobileBridgeTransport } from "@dsh-mobile/mobile-bridge-transport";
import { createMockDshHost } from "@dsh-mobile/mock-dsh-host";

describe("mobile bridge transport security controls", () => {
  it("uses loopback-only authenticated endpoints by default", () => {
    const transport = createMobileBridgeTransport();
    const endpoint = transport.start();

    expect(endpoint.bindHost).toBe("127.0.0.1");
    expect(endpoint.lanEnabled).toBe(false);
    expect(endpoint.authenticated).toBe(true);
    expect(endpoint.sessionRequired).toBe(true);
    expect(endpoint.csrfProtection).toBe(true);
  });

  it("requires explicit LAN enablement", () => {
    const transport = createMobileBridgeTransport({ enableLan: true, allowedOrigins: ["https://mobile.example"] });
    const endpoint = transport.start();

    expect(endpoint.kind).toBe("lan");
    expect(endpoint.bindHost).toBe("lan");
    expect(endpoint.lanEnabled).toBe(true);
    expect(endpoint.allowedOrigins).toEqual(["https://mobile.example"]);
  });

  it("rejects invalid endpoint ports", () => {
    expect(() => createMobileBridgeTransport({ port: 0 }).start()).toThrow("port must be an integer");
    expect(() => createMobileBridgeTransport({ port: 70000 }).start()).toThrow("port must be an integer");
  });

  it("binds sessions only after endpoint start", async () => {
    const transport = createMobileBridgeTransport();
    const host = createMockDshHost();
    const pairing = await host.pairDevice({ deviceName: "phone" });
    const session = await host.openSession(pairing.deviceId);

    expect(() => transport.bindSession(session)).toThrow("not listening");

    const endpoint = transport.start();
    const binding = transport.bindSession(session);

    expect(binding.endpointId).toBe(endpoint.endpointId);
    expect(binding.sessionId).toBe(session.sessionId);
    expect(binding.deviceId).toBe(session.deviceId);
    expect(binding.authenticated).toBe(true);
    expect(binding.gapPolicy).toBe("replay_from_seq");
  });
});
