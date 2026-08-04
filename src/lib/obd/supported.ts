/**
 * Support is published in 32-bit blocks. Querying PID `00` returns a mask for
 * PIDs 01–20; if the lowest bit (PID 20) is set, PID `20` returns the next
 * block, and so on. Walking the chain yields exactly what the ECU implements.
 */
export const SUPPORT_BLOCK_PIDS = ['00', '20', '40', '60', '80', 'A0', 'C0'] as const;

/**
 * Expands one 4-byte mask into PID names.
 *
 * Bit 31 (MSB of the first byte) is `basePid + 1`, descending to bit 0 which is
 * `basePid + 32` — the next block's own PID, which is why the chain continues
 * only when that last bit is set.
 */
export function decodeSupportMask(basePid: string, bytes: number[]): string[] {
  if (bytes.length < 4) return [];

  const base = Number.parseInt(basePid, 16);
  const supported: string[] = [];

  for (let index = 0; index < 32; index += 1) {
    const byte = bytes[Math.floor(index / 8)];
    const bit = 7 - (index % 8);
    if ((byte >> bit) & 1) {
      supported.push(
        (base + index + 1)
          .toString(16)
          .toUpperCase()
          .padStart(2, '0'),
      );
    }
  }

  return supported;
}

/** True when the block reports the follow-on block as available. */
export function chainsToNextBlock(basePid: string, supported: string[]): boolean {
  const next = (Number.parseInt(basePid, 16) + 0x20).toString(16).toUpperCase().padStart(2, '0');
  return supported.includes(next);
}
