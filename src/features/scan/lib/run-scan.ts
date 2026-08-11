import type { Elm327Client } from '@/features/connection/lib/elm327';
import { restoreAddressing, sweepLinkSettings, type CanAddressing } from '@/lib/obd/uds/addressing';
import { classifyModule } from '@/lib/obd/uds/classify';
import { decodeKwpFault, decodeUdsFault, type ModuleFault } from '@/lib/obd/uds/faults';
import {
  DTC_STATUS_MASK_FALLBACK,
  KWP_DTC_REQUEST,
  SYSTEM_NAME_REQUEST,
  dtcCountRequest,
  dtcListRequest,
  nrcAction,
  parseDtcCount,
  parseDtcGroups,
  parseKwpGroups,
  parseSystemName,
  parseUdsReply,
  type UdsReply,
} from '@/lib/obd/uds/services';

import type { ScanStep } from './scan-plan';
import type { DiscoveredModule } from './module-map';

const PROBE_TIMEOUT_MS = 1500;
const READ_TIMEOUT_MS = 5000;

/**
 * Consecutive commands that got no response at all, before the sweep gives up
 * on the adapter rather than the car.
 *
 * This is not `TROUBLE_THRESHOLD` (elm327.ts's own link-health counter, which
 * `setTroubleSuspended` turns off for the whole sweep) and it is not driven by
 * `'silent'` replies either: an empty address answers `NO DATA`, which is a
 * message the adapter actually sent, so the command resolves normally and
 * `parseUdsReply` reads it as silence. Only a command that gets nothing back
 * at all -- the chip itself gone, not the bus -- rejects. A sweep that dies
 * that way used to produce nothing but ordinary-looking timeouts, which stay
 * suspended for the sweep's own sake and so were never reported as a link
 * failure. Six consecutive rejections is far more than chance produces from a
 * car that is simply mostly empty addresses, which resolve, and small enough
 * that a genuinely dead adapter is caught in a couple of seconds rather than
 * spending the rest of a forty-second sweep on silence nobody sent.
 */
export const MAX_CONSECUTIVE_ADAPTER_THROWS = 6;

/** Whether a run of thrown commands is long enough to call the adapter dead. */
export function adapterLikelyDead(consecutiveThrows: number): boolean {
  return consecutiveThrows >= MAX_CONSECUTIVE_ADAPTER_THROWS;
}

export type ScanProgress = { done: number; total: number; found: number };

export type ScanResult = {
  modules: DiscoveredModule[];
  faults: Record<string, ModuleFault[]>;
  /**
   * Every address this run actually reached, in the order it reached them.
   * Not the same as the plan when the scan stopped early -- that is the
   * point: an address the sweep never got to was never asked, and folding it
   * back into a map must not treat it as having gone quiet.
   */
  visited: string[];
  /** True when the caller stopped it, so partial results can be labelled. */
  aborted: boolean;
  /**
   * True when the sweep gave up early because commands stopped getting any
   * response at all, rather than because the plan ran out. Whatever was found
   * before that point is still returned -- this only changes how the result
   * is reported, never what is kept.
   */
  adapterFailed: boolean;
};

export type ScanHandlers = {
  onProgress?: (progress: ScanProgress) => void;
  /** Checked before every step, so an abort takes effect within one probe. */
  shouldStop?: () => boolean;
};

/** Counts consecutive thrown commands across the whole sweep, not just one step. */
type ThrowTracker = { consecutive: number };

/**
 * Walks a plan against the car.
 *
 * Every decision — which addresses, what to send, what a reply means — was made
 * by the pure layer. This holds the adapter's settings open, sends what it is
 * told, and hands each reply to a parser.
 */
export async function runScan(
  client: Elm327Client,
  addressing: CanAddressing,
  plan: ScanStep[],
  handlers: ScanHandlers = {},
): Promise<ScanResult> {
  const settings = sweepLinkSettings(addressing);
  const modules: DiscoveredModule[] = [];
  const faults: Record<string, ModuleFault[]> = {};
  const visited: string[] = [];
  const tracker: ThrowTracker = { consecutive: 0 };
  let aborted = false;
  let adapterFailed = false;

  client.setTroubleSuspended(true);
  for (const setting of settings) {
    await client.sendCommand(setting.set, 3000).catch(() => undefined);
  }

  try {
    for (const [index, step] of plan.entries()) {
      if (handlers.shouldStop?.()) {
        aborted = true;
        break;
      }

      const outcome = await visit(client, step, tracker);
      // Only an address that was genuinely asked -- even if the answer was
      // "nothing here" -- belongs in `visited`. `visit()` also reports
      // `reached: false` when the adapter itself is the problem (a thrown
      // header write, a thrown probe, or a raw CAN ERROR/BUFFER FULL reply),
      // and none of those mean the address was actually reached.
      if (outcome.reached) visited.push(step.requestId);
      if (outcome.found) {
        modules.push(outcome.found.module);
        if (outcome.found.faults.length) faults[outcome.found.module.requestId] = outcome.found.faults;
      }

      handlers.onProgress?.({ done: index + 1, total: plan.length, found: modules.length });

      if (adapterLikelyDead(tracker.consecutive)) {
        adapterFailed = true;
        break;
      }
    }
  } finally {
    // Restored on every path, including an adapter that died mid-sweep. A link
    // left filtered to 0x700-0x7FF, or still addressed to whichever module
    // `visit()` talked to last, reads nothing from the engine ever again, and
    // nothing about that heals on its own -- so a restore that will not go
    // through is worth a full reconfiguration rather than a swallowed error.
    let restored = true;
    for (const setting of settings) {
      try {
        await client.sendCommand(setting.restore, 3000);
      } catch {
        restored = false;
      }
    }
    // `visit()` sets ATSH -- and, on 29-bit, ATCRA -- per address for the
    // whole sweep. Neither is in `settings` above, because neither is set
    // once up front; restoring them is what lets every OBD request sent
    // after the sweep reach the functional broadcast again instead of
    // whichever address `visit()` talked to last.
    for (const command of restoreAddressing(addressing)) {
      try {
        await client.sendCommand(command, 3000);
      } catch {
        restored = false;
      }
    }
    client.setTroubleSuspended(false);
    if (!restored) await client.recover().catch(() => undefined);
  }

  return { modules, faults, visited, aborted, adapterFailed };
}

/**
 * Whether an address counts as having been asked, given how its probe went.
 *
 * `parseUdsReply('')` and `parseUdsReply('NO DATA')` read identically, as
 * `'silent'` -- which is exactly the ambiguity this exists to resolve. The
 * first is what `ask()` hands back once it has caught a thrown command and
 * given up; the second is a module genuinely saying it has nothing stored.
 * Only the second was actually asked, so `threw` -- not the parsed reply
 * alone -- is what decides it. A raw `CAN ERROR`/`BUFFER FULL` reply is the
 * same story without a throw: `parseUdsReply` reads it as `'unusable'`, the
 * adapter's own trouble rather than anything the module said.
 */
export function probeReached(threw: boolean, probeKind: UdsReply['kind']): boolean {
  return !threw && probeKind !== 'unusable';
}

type VisitOutcome = {
  /**
   * True once this address has genuinely been asked and answered -- even to
   * say nothing. `runScan` uses this, not whether a module was found, to
   * decide what belongs in `visited`.
   */
  reached: boolean;
  found: { module: DiscoveredModule; faults: ModuleFault[] } | null;
};

async function visit(client: Elm327Client, step: ScanStep, tracker: ThrowTracker): Promise<VisitOutcome> {
  const now = new Date().toISOString();

  try {
    await client.sendCommand(`ATSH${step.requestId}`, 3000);
    if (step.receiveFilter) await client.sendCommand(`ATCRA${step.receiveFilter}`, 3000);
    tracker.consecutive = 0;
  } catch {
    tracker.consecutive += 1;
    return { reached: false, found: null };
  }

  // Headers are off for the whole sweep (see addressing.ts), so `acceptsReply`
  // can only pair this reply with this probe by its `59` mode byte -- there is
  // no header left to check it against. A module that answers just after this
  // probe's window has closed can therefore be accepted as the *next*
  // address's reply instead of counted as a timeout at this one. `ATST19`
  // keeps that window to about 100ms, which makes it narrow, and turning
  // headers on to close it entirely would break every reply in the sweep
  // instead (see `sweepLinkSettings`) -- so this is accepted as a residual,
  // not fixed.
  const probeAsk = await ask(client, dtcCountRequest(), PROBE_TIMEOUT_MS, tracker);
  const probe = parseUdsReply(probeAsk.reply, 0x19);

  // Written as a direct check on `probe.kind`, rather than only calling
  // `probeReached`, so the compiler can narrow `probe` for the `positive`
  // and `negative` cases below -- `probeReached` returning a plain boolean
  // gives it nothing to narrow on. The reached value itself still comes from
  // `probeReached`, which is what selfcheck covers.
  if (probe.kind === 'silent' || probe.kind === 'unusable') {
    return { reached: probeReached(probeAsk.threw, probe.kind), found: null };
  }

  let count: number | null = null;
  let useKwp = false;

  if (probe.kind === 'positive') {
    count = parseDtcCount(probe.body);
  } else {
    const action = nrcAction(probe.nrc);
    if (action === 'kwp-fallback') {
      useKwp = true;
    } else if (action === 'retry-mask') {
      const retryAsk = await ask(client, dtcCountRequest(DTC_STATUS_MASK_FALLBACK), PROBE_TIMEOUT_MS, tracker);
      const retry = parseUdsReply(retryAsk.reply, 0x19);
      if (retry.kind === 'positive') count = parseDtcCount(retry.body);
    }
    // 'pending' and 'present-unreadable' both mean a module is there and will
    // not say more, which is still worth reporting.
  }

  const faults = count === 0 ? [] : await readFaults(client, useKwp, tracker);
  const name = await readName(client, tracker);

  return {
    reached: true,
    found: {
      module: {
        requestId: step.requestId,
        part: classifyModule({ name, codes: faults.map((fault) => fault.code), requestId: step.requestId }),
        name,
        faultCount: count ?? (faults.length || null),
        stale: false,
        lastSeenAt: now,
      },
      faults,
    },
  };
}

async function readFaults(
  client: Elm327Client,
  useKwp: boolean,
  tracker: ThrowTracker,
): Promise<ModuleFault[]> {
  const command = useKwp ? KWP_DTC_REQUEST : dtcListRequest();
  const service = useKwp ? 0x18 : 0x19;
  const { reply } = await ask(client, command, READ_TIMEOUT_MS, tracker);
  const parsed = parseUdsReply(reply, service);
  if (parsed.kind !== 'positive') return [];

  const groups = useKwp ? parseKwpGroups(parsed.body) : parseDtcGroups(parsed.body);
  const decode = useKwp ? decodeKwpFault : decodeUdsFault;

  return groups.map(decode).filter((fault): fault is ModuleFault => fault !== null);
}

async function readName(client: Elm327Client, tracker: ThrowTracker): Promise<string | null> {
  const { reply } = await ask(client, SYSTEM_NAME_REQUEST, PROBE_TIMEOUT_MS, tracker);
  const parsed = parseUdsReply(reply, 0x22);
  return parsed.kind === 'positive' ? parseSystemName(parsed.body) : null;
}

/**
 * A command that fails is silence, which the parsers already understand --
 * and, separately, a mark against the adapter itself, which `threw` in the
 * returned pair carries out to the caller. Every request the scan sends goes
 * through here or through the `ATSH`/`ATCRA` pair in `visit`, so this is the
 * one place that needs to touch the tracker for the whole sweep to be
 * covered.
 */
async function ask(
  client: Elm327Client,
  command: string,
  timeoutMs: number,
  tracker: ThrowTracker,
): Promise<{ reply: string; threw: boolean }> {
  try {
    const reply = await client.sendCommand(command, timeoutMs);
    tracker.consecutive = 0;
    return { reply, threw: false };
  } catch {
    tracker.consecutive += 1;
    return { reply: '', threw: true };
  }
}
