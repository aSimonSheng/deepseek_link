import { currentProtocol } from "@dsh-mobile/protocol";

export interface MobileBridgeTransport {
  readonly pluginId: "dsh-mobile-bridge.transport";
  readonly protocol: ReturnType<typeof currentProtocol>;
  readonly runtime: "mock-only";
}

export function createMobileBridgeTransport(): MobileBridgeTransport {
  return {
    pluginId: "dsh-mobile-bridge.transport",
    protocol: currentProtocol(),
    runtime: "mock-only"
  };
}
