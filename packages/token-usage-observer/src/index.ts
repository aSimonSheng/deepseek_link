import { computeCacheHitRatio, type UsageRecord } from "@dsh-mobile/protocol";

export function summarizeUsage(record: UsageRecord): UsageRecord {
  if (record.source === "unavailable") {
    return record;
  }

  return computeCacheHitRatio(record);
}
