import { getPidDefinition, type PidDefinition } from './pids';
import { extractPayload } from './protocol';

export type FreezeFrameEntry = {
  definition: PidDefinition;
  value: number;
  text: string | null;
};

/** Frame 0 is the snapshot stored when the first emissions-related code set. */
export const DEFAULT_FRAME = '00';

export function freezeFrameCommand(pid: string, frame = DEFAULT_FRAME): string {
  return `02${pid}${frame}`;
}

/**
 * Decodes a Mode 02 reply.
 *
 * The response mirrors Mode 01 but inserts the frame number between the PID and
 * the data, so the payload starts one byte later than the live equivalent.
 * Values otherwise use the same scaling, so the Mode 01 registry is reused.
 */
export function parseFreezeFrame(hex: string, pid: string): FreezeFrameEntry | null {
  const definition = getPidDefinition(pid);
  if (!definition) return null;

  const payload = extractPayload(hex, '42', pid);
  if (!payload || payload.length < definition.bytes + 1) return null;

  const data = payload.slice(1, definition.bytes + 1);
  const value = definition.decode(data);
  if (value === null || Number.isNaN(value)) return null;

  return {
    definition,
    value,
    text: definition.describe ? definition.describe(data) : null,
  };
}
