import {
  PROTOCOL_MAJOR,
  PROTOCOL_MINOR,
  PROTOCOL_NAME,
  REDACTED_SECRET
} from "./constants.js";
import { validateRpcEnvelope } from "./schema.js";
import type { ProtocolVersion, RpcEnvelope, UsageRecord } from "./types.js";

export function currentProtocol(): ProtocolVersion {
  return {
    name: PROTOCOL_NAME,
    major: PROTOCOL_MAJOR,
    minor: PROTOCOL_MINOR
  };
}

export function isSupportedProtocol(protocol: ProtocolVersion): boolean {
  return protocol.name === PROTOCOL_NAME && protocol.major === PROTOCOL_MAJOR;
}

export function hasProtocolEnvelope(value: unknown): value is RpcEnvelope {
  return validateRpcEnvelope(value).ok;
}

export function computeCacheHitRatio(record: UsageRecord): UsageRecord {
  if (
    record.source !== "provider_reported" ||
    typeof record.promptTokens !== "number" ||
    record.promptTokens <= 0 ||
    typeof record.cacheReadTokens !== "number"
  ) {
    const { cacheHitRatio: _cacheHitRatio, ...withoutRatio } = record;
    return withoutRatio;
  }

  return {
    ...record,
    cacheHitRatio: record.cacheReadTokens / record.promptTokens
  };
}

export function redactString(value: string): string {
  return value
    .replace(/([A-Za-z0-9_-]*?(?:KEY|TOKEN|SECRET|PASSWORD)[A-Za-z0-9_-]*?=)[^\s]+/gi, `$1${REDACTED_SECRET}`)
    .replace(/(sk-[A-Za-z0-9_-]{8,})/g, REDACTED_SECRET)
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, `$1${REDACTED_SECRET}`);
}
