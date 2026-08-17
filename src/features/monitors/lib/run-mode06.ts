import {
  MODE06_SUPPORT_BLOCKS,
  chainsOnward,
  monitorIdsFrom,
  parseMonitorTests,
  parseSupportedMids,
  supportRequest,
  testRequest,
  type MonitorTest,
} from '@/lib/obd/mode06';
import { indicatesControllerFault, type ObdResponse } from '@/lib/obd/protocol';

const SUPPORT_TIMEOUT_MS = 4000;
const TEST_TIMEOUT_MS = 5000;

/** Only what the walk needs, so it can be checked without an adapter. */
export type Mode06Client = {
  query(command: string, timeoutMs?: number): Promise<ObdResponse>;
};

export type Mode06Result = {
  tests: MonitorTest[];
  /** How many monitor ids the car said it had. */
  advertised: number;
  /** Advertised, asked, and did not answer. Reported rather than hidden. */
  silent: number;
  /** True when the adapter dropped off the bus and the walk was called off. */
  aborted: boolean;
};

/**
 * Reads every on-board test the car advertises.
 *
 * The support mask is walked first. Asking for a monitor the car never claimed
 * spends a round trip to be told nothing, and twenty of those is most of a
 * minute. A monitor that refuses individually is counted and skipped, because
 * one unsupported test is no reason to abandon the other twenty.
 *
 * An adapter fault is a different thing and is treated differently: a
 * controller that has dropped off the bus answers every remaining request with
 * the same error, so continuing tests nothing and ends by blaming the car for
 * a fault that belongs to the chip. The walk stops and says so. This is the
 * same distinction `run-scan.ts` draws for the same reason.
 */
export async function runMode06(
  client: Mode06Client,
  onProgress?: (done: number, total: number) => void,
): Promise<Mode06Result> {
  const mids: string[] = [];

  for (const block of MODE06_SUPPORT_BLOCKS) {
    let reply: ObdResponse;
    try {
      reply = await client.query(supportRequest(block), SUPPORT_TIMEOUT_MS);
    } catch {
      break;
    }

    if (!reply.ok) {
      if (indicatesControllerFault(reply.reason)) {
        return { tests: [], advertised: mids.length, silent: 0, aborted: true };
      }
      break;
    }

    const found = parseSupportedMids(reply.hex, block);
    mids.push(...monitorIdsFrom(found));

    if (!chainsOnward(block, found)) break;
  }

  const tests: MonitorTest[] = [];
  let silent = 0;

  for (const [index, mid] of mids.entries()) {
    onProgress?.(index, mids.length);

    let reply: ObdResponse;
    try {
      reply = await client.query(testRequest(mid), TEST_TIMEOUT_MS);
    } catch {
      silent += 1;
      continue;
    }

    if (!reply.ok) {
      if (indicatesControllerFault(reply.reason)) {
        return { tests, advertised: mids.length, silent, aborted: true };
      }
      silent += 1;
      continue;
    }

    tests.push(...parseMonitorTests(reply.hex));
  }

  onProgress?.(mids.length, mids.length);
  return { tests, advertised: mids.length, silent, aborted: false };
}
