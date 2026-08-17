import { extractPayload } from '../protocol';
import { chainsToNextBlock, decodeSupportMask } from '../supported';

/**
 * Support blocks for mode 06.
 *
 * Deliberately not `SUPPORT_BLOCK_PIDS`. Monitor ids run to 0xFF and so need
 * the `E0` block; mode 01 PIDs do not, and that constant has assertions of its
 * own riding on what it contains.
 */
export const MODE06_SUPPORT_BLOCKS = ['00', '20', '40', '60', '80', 'A0', 'C0', 'E0'] as const;

const BLOCK_IDS: ReadonlySet<string> = new Set(MODE06_SUPPORT_BLOCKS);

export function supportRequest(block: string): string {
  return `06${block}`;
}

export function testRequest(mid: string): string {
  return `06${mid}`;
}

/**
 * Expands one support block's reply into the monitor ids it advertises.
 *
 * The mask is the same 32-bit chained form mode 01 publishes its PIDs in, so
 * the existing decoder does the work. Asking for MID `00` and handing the
 * answer to the record parser — which is what this app did for two releases —
 * yields nothing at all: a four-byte mask cannot fill a nine-byte record, so
 * every car looked like a car with no test results.
 */
export function parseSupportedMids(hex: string, block: string): string[] {
  const payload = extractPayload(hex, '46', block);
  if (!payload || payload.length < 4) return [];
  return decodeSupportMask(block, payload.slice(0, 4));
}

/** Whether the block just read says the following one exists. */
export function chainsOnward(block: string, supported: string[]): boolean {
  return chainsToNextBlock(block, supported);
}

/**
 * The advertised ids worth asking for.
 *
 * A block lists the next block's own id as one of its bits — that is how the
 * chain is announced. It is a marker, not a monitor, and asking for it wastes
 * a round trip on an answer that decodes as nothing.
 */
export function monitorIdsFrom(supported: string[]): string[] {
  return supported.filter((mid) => !BLOCK_IDS.has(mid));
}
