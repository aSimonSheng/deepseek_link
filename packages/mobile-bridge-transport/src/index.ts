import {
  currentProtocol,
  validateEventStreamCursor,
  validateTransportEndpointBinding,
  validateTransportEndpointConfig,
  type EventStreamCursor,
  type HarnessEvent,
  type Principal,
  type ProtocolVersion,
  type TransportEndpointBinding,
  type TransportEndpointConfig
} from "@dsh-mobile/protocol";

const PLUGIN_ID = "dsh-mobile-bridge.transport" as const;
const DEFAULT_MOCK_PORT = 41731;
const DEFAULT_BINDING_TTL_SECONDS = 3600;

export interface CreateMobileBridgeTransportOptions {
  port?: number;
  enableLan?: boolean;
  allowedOrigins?: string[];
}

export interface BindSessionInput {
  sessionId: string;
  deviceId: string;
  principal: Principal;
  ttlSeconds?: number;
}

export interface MobileBridgeTransport {
  readonly pluginId: typeof PLUGIN_ID;
  readonly protocol: ProtocolVersion;
  readonly runtime: "mock-only";
  endpoint(): TransportEndpointConfig;
  start(): TransportEndpointConfig;
  stop(): TransportEndpointConfig;
  bindSession(input: BindSessionInput): TransportEndpointBinding;
  resumeEvents(cursor: EventStreamCursor, events: readonly HarnessEvent[]): HarnessEvent[];
}

export function createMobileBridgeTransport(
  options: CreateMobileBridgeTransportOptions = {}
): MobileBridgeTransport {
  let endpoint = createEndpoint(options, "stopped");

  return {
    pluginId: PLUGIN_ID,
    protocol: currentProtocol(),
    runtime: "mock-only",
    endpoint: () => endpoint,
    start: () => {
      endpoint = createEndpoint(options, "listening", endpoint.endpointId);
      return endpoint;
    },
    stop: () => {
      endpoint = {
        ...endpoint,
        state: "stopped"
      };
      assertValidConfig(endpoint);
      return endpoint;
    },
    bindSession: (input) => createBinding(endpoint, input),
    resumeEvents: (cursor, events) => {
      assertValidCursor(cursor);
      const resumed = events
        .filter((event) => event.runId === cursor.runId && event.seq > cursor.fromSeq)
        .sort((left, right) => left.seq - right.seq);
      const first = resumed[0];
      if (cursor.gapPolicy === "fail_closed" && first && first.seq !== cursor.fromSeq + 1) {
        throw new Error("Event stream gap detected");
      }
      return resumed;
    }
  };
}

function createEndpoint(
  options: CreateMobileBridgeTransportOptions,
  state: TransportEndpointConfig["state"],
  endpointId = "endpoint_mock_0001"
): TransportEndpointConfig {
  const enableLan = options.enableLan === true;
  const endpoint: TransportEndpointConfig = {
    endpointId,
    kind: enableLan ? "lan" : "mock",
    bindHost: enableLan ? "lan" : "127.0.0.1",
    port: options.port ?? DEFAULT_MOCK_PORT,
    lanEnabled: enableLan,
    authenticated: true,
    sessionRequired: true,
    csrfProtection: true,
    allowedOrigins: options.allowedOrigins ?? ["http://127.0.0.1"],
    state,
    createdAt: new Date().toISOString()
  };
  assertValidConfig(endpoint);
  return endpoint;
}

function createBinding(endpoint: TransportEndpointConfig, input: BindSessionInput): TransportEndpointBinding {
  if (endpoint.state !== "listening") {
    throw new Error("Transport endpoint is not listening");
  }

  const now = new Date();
  const ttlSeconds = clampTtl(input.ttlSeconds, DEFAULT_BINDING_TTL_SECONDS, DEFAULT_BINDING_TTL_SECONDS);
  const binding: TransportEndpointBinding = {
    bindingId: `binding_${input.sessionId}`,
    endpointId: endpoint.endpointId,
    sessionId: input.sessionId,
    deviceId: input.deviceId,
    principal: input.principal,
    authenticated: true,
    boundAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    lastAckSeq: 0,
    gapPolicy: "replay_from_seq"
  };
  assertValidBinding(binding);
  return binding;
}

function assertValidConfig(value: TransportEndpointConfig): void {
  assertValid(validateTransportEndpointConfig(value));
}

function assertValidBinding(value: TransportEndpointBinding): void {
  assertValid(validateTransportEndpointBinding(value));
}

function assertValidCursor(value: EventStreamCursor): void {
  assertValid(validateEventStreamCursor(value));
}

function assertValid(result: { ok: boolean; issues: { path: string; message: string }[] }): void {
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}

function clampTtl(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), max);
}
