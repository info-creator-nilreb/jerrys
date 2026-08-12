/**
 * Minimal UUID version 1 (time-based) for Zettle Pusher subscriptions.
 * Zettle requires version 1 UUIDs for subscription UUIDs.
 */
import { randomBytes } from "node:crypto";

let clockSeq = randomBytes(2).readUInt16BE(0) & 0x3fff;
const nodeId = randomBytes(6);
nodeId[0] = (nodeId[0]! & 0x3f) | 0x01; // multicast bit for locally generated

/** RFC 4122 UUID v1 as lowercase string (ohne BigInt-Literale für ES-Target). */
export function generateUuidV1(): string {
  // UUID timestamp: 100-ns intervals since 1582-10-15
  const nowMs = Date.now();
  const uuidTime = BigInt(nowMs) * BigInt(10000) + BigInt("122192928000000000");

  const timeLow = Number(uuidTime & BigInt(0xffffffff));
  const timeMid = Number((uuidTime >> BigInt(32)) & BigInt(0xffff));
  let timeHi = Number((uuidTime >> BigInt(48)) & BigInt(0x0fff));
  timeHi |= 0x1000; // version 1

  clockSeq = (clockSeq + 1) & 0x3fff;
  const clockSeqHi = ((clockSeq >> 8) & 0x3f) | 0x80; // variant
  const clockSeqLow = clockSeq & 0xff;

  const bytes = Buffer.alloc(16);
  bytes.writeUInt32BE(timeLow >>> 0, 0);
  bytes.writeUInt16BE(timeMid & 0xffff, 4);
  bytes.writeUInt16BE(timeHi & 0xffff, 6);
  bytes[8] = clockSeqHi;
  bytes[9] = clockSeqLow;
  nodeId.copy(bytes, 10);

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
