# Whole-Car Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read trouble codes from every control module in the car, not just the engine, and let the driver pick which parts to read.

**Architecture:** Sweep the diagnostic CAN address band `0x700`–`0x7FF` with a UDS `19 01` request; any reply proves a module exists and a positive one carries its fault count. Only responders get asked for their code list and their own name. All decision-making is pure and lives in `src/lib/obd/uds/` and `src/features/scan/lib/`; a provider walks the steps a plan hands it and does no reasoning.

**Tech Stack:** TypeScript, Expo/React Native, `react-native-bluetooth-classic`, AsyncStorage. **No test framework** — this repo checks pure logic with `scripts/selfcheck.ts`, run via `npm run check`.

Spec: `docs/superpowers/specs/2026-08-10-whole-car-scan-design.md`

## Global Constraints

- **No brand-specific data.** No module address tables, no brand DTC meanings. An unknown thing is labelled unknown, matching how `catalog/index.ts` treats unlisted codes.
- **CAN only.** Protocols `6`/`8` are 11-bit, `7`/`9` are 29-bit. Anything else gets engine-only.
- **Headers stay off.** Never send `ATH1`. `acceptsReply` refuses a headered frame, which would time out every probe. Modules are identified by the address asked.
- **Never call `client.query()` from scan code.** `parseResponse` folds a negative response into `{ ok: false }` and discards the NRC byte, which is the sweep's most valuable signal. Use `client.sendCommand()` and parse raw.
- **Nothing in `protocol.ts` or `reply-match.ts` changes.** They are correct for mode 03 and already correct for UDS with headers off.
- **Tests go in `scripts/selfcheck.ts`**, in the established style: a `section(...)` header, `fail(...)` on a bad result, a `console.log` count at the end. Run with `npm run check`.
- **Every new pure module is adapter-free** and importable by `selfcheck.ts` without a React tree or a Bluetooth radio.
- **Commit messages carry no `Co-Authored-By` trailer.**

---

### Task 1: CAN addressing and sweep link settings

**Files:**
- Create: `src/lib/obd/uds/addressing.ts`
- Modify: `scripts/selfcheck.ts` (new section after "Protocol sweep is well formed")

**Interfaces:**
- Consumes: nothing
- Produces: `CanAddressing`, `addressingFor(protocolId)`, `SweepTarget`, `sweepTargets(addressing)`, `sweepLinkSettings(addressing)`, `admitsResponse(id)`, `LinkSetting`

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts` (imports at the top of the file with the others):

```ts
import {
  addressingFor,
  admitsResponse,
  sweepLinkSettings,
  sweepTargets,
} from '../src/lib/obd/uds/addressing';

// ── 18. Every module gets knocked on, and the filter lets it answer ──────────
section('Whole-car sweep addressing');

if (addressingFor('6') !== 'can11') fail('protocol 6 is 11-bit CAN');
if (addressingFor('8') !== 'can11') fail('protocol 8 is 11-bit CAN');
if (addressingFor('7') !== 'can29') fail('protocol 7 is 29-bit CAN');
if (addressingFor('9') !== 'can29') fail('protocol 9 is 29-bit CAN');
// K-line and J1850 cannot be swept, and saying so is the whole point.
if (addressingFor('3') !== null) fail('ISO 9141-2 is not a CAN bus');
if (addressingFor(null) !== null) fail('an unknown protocol cannot be swept');

const eleven = sweepTargets('can11');
if (eleven.length !== 255) fail(`11-bit sweep has ${eleven.length} targets, expected 255`);
// 0x7DF is the OBD functional broadcast: several modules would answer one
// request and the reply could not be attributed to any of them.
if (eleven.some((target) => target.requestId === '7DF')) fail('the sweep includes the broadcast address');
// The legislated addresses come first so the engine appears in the first second
// rather than 200 silent probes later.
if (eleven.slice(0, 8).map((target) => target.requestId).join(',') !== '7E0,7E1,7E2,7E3,7E4,7E5,7E6,7E7') {
  fail(`the sweep does not open with the legislated addresses: ${eleven.slice(0, 8).map((t) => t.requestId)}`);
}
if (eleven.some((target) => target.receiveFilter !== null)) {
  fail('11-bit targets should rely on the band filter, not a per-address one');
}

const twentyNine = sweepTargets('can29');
if (twentyNine.length !== 255) fail(`29-bit sweep has ${twentyNine.length} targets, expected 255`);
if (twentyNine.some((target) => target.requestId === '18DA33F1')) fail('the 29-bit broadcast is being swept');
// 29-bit response addressing is standardised, so each target names its own
// reply address rather than opening a band.
if (twentyNine[0].requestId !== '18DA00F1' || twentyNine[0].receiveFilter !== '18DAF100') {
  fail(`29-bit target 0 is ${JSON.stringify(twentyNine[0])}`);
}

// The filter is what makes this work without brand data: an ELM327 accepts a
// frame when (id & mask) == (filter & mask), so mask 0x700 with filter 0x700
// admits every diagnostic responder and no ordinary bus traffic.
if (!admitsResponse(0x7e8)) fail('0x7E8 is the engine reply and must be admitted');
if (!admitsResponse(0x700)) fail('0x700 is inside the diagnostic band');
if (!admitsResponse(0x7ff)) fail('0x7FF is inside the diagnostic band');
if (admitsResponse(0x6ff)) fail('0x6FF is ordinary bus traffic and must be rejected');
if (admitsResponse(0x300)) fail('0x300 is ordinary bus traffic and must be rejected');

// A sweep that cannot put the adapter back leaves every later reading filtered.
for (const addressing of ['can11', 'can29'] as const) {
  const settings = sweepLinkSettings(addressing);
  if (settings.length === 0) fail(`${addressing} sets nothing`);
  for (const setting of settings) {
    if (!setting.set.startsWith('AT')) fail(`"${setting.set}" is not an AT command`);
    if (!setting.restore.startsWith('AT')) fail(`"${setting.set}" has no restore command`);
  }
  if (settings.some((setting) => setting.set === 'ATH1')) {
    fail('headers on would make acceptsReply discard every reply in the sweep');
  }
}
// The band filter belongs to 11-bit only; on 29-bit ATCRA overrides it anyway,
// and having both set is configuration nobody can reason about afterwards.
const bandFilters = sweepLinkSettings('can29').filter((setting) => /ATC[FM]/.test(setting.set));
if (bandFilters.length !== 0) fail('29-bit should not set the band filter');

console.log(`  ${eleven.length} addresses per sweep`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `Cannot find module '../src/lib/obd/uds/addressing'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/obd/uds/addressing.ts`:

```ts
/** Which CAN addressing scheme a protocol uses, or null when it is not CAN. */
export type CanAddressing = 'can11' | 'can29';

export type SweepTarget = {
  /** What `ATSH` is set to. Also how a module is identified from here on. */
  requestId: string;
  /** `ATCRA` value, or null when the band filter covers it. */
  receiveFilter: string | null;
};

export type LinkSetting = { set: string; restore: string };

const CAN_11 = new Set(['6', '8']);
const CAN_29 = new Set(['7', '9']);

export function addressingFor(protocolId: string | null): CanAddressing | null {
  if (!protocolId) return null;
  if (CAN_11.has(protocolId)) return 'can11';
  if (CAN_29.has(protocolId)) return 'can29';
  return null;
}

/** The legislated OBD addresses, tried first so a result appears immediately. */
const LEGISLATED_11 = [0x7e0, 0x7e1, 0x7e2, 0x7e3, 0x7e4, 0x7e5, 0x7e6, 0x7e7];

/** The functional broadcast. Several modules answer it at once, so it is skipped. */
const BROADCAST_11 = 0x7df;
const BROADCAST_29 = 0x33;

const hex3 = (value: number) => value.toString(16).toUpperCase().padStart(3, '0');
const hex2 = (value: number) => value.toString(16).toUpperCase().padStart(2, '0');

function targets11(): SweepTarget[] {
  const rest: number[] = [];
  for (let id = 0x700; id <= 0x7ff; id += 1) {
    if (id === BROADCAST_11 || LEGISLATED_11.includes(id)) continue;
    rest.push(id);
  }
  return [...LEGISLATED_11, ...rest].map((id) => ({ requestId: hex3(id), receiveFilter: null }));
}

function targets29(): SweepTarget[] {
  const targets: SweepTarget[] = [];
  for (let ecu = 0x00; ecu <= 0xff; ecu += 1) {
    if (ecu === BROADCAST_29) continue;
    targets.push({
      requestId: `18DA${hex2(ecu)}F1`,
      // ISO 15765-4 normal fixed addressing: the reply is derivable, so it is
      // named exactly rather than admitted by a band.
      receiveFilter: `18DAF1${hex2(ecu)}`,
    });
  }
  return targets;
}

export function sweepTargets(addressing: CanAddressing): SweepTarget[] {
  return addressing === 'can11' ? targets11() : targets29();
}

/** Filter and mask that admit the whole diagnostic band and nothing else. */
const BAND = 0x700;

export function admitsResponse(id: number): boolean {
  return (id & BAND) === BAND;
}

/**
 * What the sweep changes about the link, and what puts each back.
 *
 * `ATST19` is 0x19 x 4.096 ms, about 102 ms. Most addresses are silent, so the
 * reply window is the whole cost of the sweep; `ATSTFF` restores the ~1.05 s
 * window `ADAPTER_INIT_SEQUENCE` sets, which slow ECUs need.
 *
 * `ATAT0` matters for the reason it matters in `connectEcu`: adaptive timing
 * learns a deadline from the replies it has seen, and hundreds of silent probes
 * would teach it a window too short for the one module about to answer.
 *
 * Headers are deliberately absent. `ATH1` would prefix every reply with its CAN
 * ID, and `acceptsReply` discards a frame that does not open with the expected
 * response mode — so every probe would time out.
 */
export function sweepLinkSettings(addressing: CanAddressing): LinkSetting[] {
  const common: LinkSetting[] = [
    { set: 'ATST19', restore: 'ATSTFF' },
    { set: 'ATAT0', restore: 'ATAT1' },
  ];

  if (addressing === 'can29') return common;

  return [
    { set: `ATCF${hex3(BAND)}`, restore: 'ATAR' },
    { set: `ATCM${hex3(BAND)}`, restore: 'ATAR' },
    ...common,
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check`
Expected: PASS, printing `255 addresses per sweep`

Also run: `npm run typecheck` — expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obd/uds/addressing.ts scripts/selfcheck.ts
git commit -m "Knock on every diagnostic address, not just the engine's"
```

---

### Task 2: UDS and KWP requests, and reading what comes back

**Files:**
- Create: `src/lib/obd/uds/services.ts`
- Modify: `scripts/selfcheck.ts`

**Interfaces:**
- Consumes: `groupFrames`, `matchedErrorPhrase`, `normalizeReply`, `stripTransientPhrases`, `hexToBytes` from `src/lib/obd/protocol`
- Produces: `dtcCountRequest(mask?)`, `dtcListRequest(mask?)`, `SYSTEM_NAME_REQUEST`, `KWP_DTC_REQUEST`, `UdsReply`, `parseUdsReply(raw, service)`, `parseDtcCount(body)`, `parseDtcGroups(body)`, `parseSystemName(body)`, `parseKwpGroups(body)`, `nrcAction(nrc)`, `NrcAction`

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts`:

```ts
import {
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
} from '../src/lib/obd/uds/services';

// ── 19. A module's answer is read, including its refusals ────────────────────
section('UDS replies');

if (dtcCountRequest() !== '1901AF') fail(`dtcCountRequest gave ${dtcCountRequest()}`);
if (dtcListRequest() !== '1902AF') fail(`dtcListRequest gave ${dtcListRequest()}`);
if (dtcCountRequest('08') !== '190108') fail('the fallback mask is not applied');
if (SYSTEM_NAME_REQUEST !== '22F197') fail('the system name DID is wrong');
if (KWP_DTC_REQUEST !== '1800FF00') fail('the KWP request is wrong');

// A positive answer: two faults stored.
const counted = parseUdsReply('5901FF010002', 0x19);
if (counted.kind !== 'positive') fail(`a positive reply read as ${counted.kind}`);
if (counted.kind === 'positive' && parseDtcCount(counted.body) !== 2) {
  fail(`fault count came out as ${parseDtcCount(counted.body)}`);
}

// A refusal is the sweep's most valuable signal: it proves a module is there.
// parseResponse throws the NRC away, which is why scan code never uses it.
const refused = parseUdsReply('7F1911', 0x19);
if (refused.kind !== 'negative') fail(`a refusal read as ${refused.kind}`);
if (refused.kind === 'negative' && refused.nrc !== 0x11) fail('the NRC byte was lost');

// A refusal naming a different service answers a different question.
if (parseUdsReply('7F2211', 0x19).kind !== 'unusable') fail('a refusal for service 22 answered a 19');

// Silence means nothing is at that address, which is not a failure.
if (parseUdsReply('NO DATA', 0x19).kind !== 'silent') fail('NO DATA should read as silence');
if (parseUdsReply('', 0x19).kind !== 'silent') fail('an empty reply should read as silence');
// The adapter's own trouble is neither a module nor silence.
if (parseUdsReply('CAN ERROR', 0x19).kind !== 'unusable') fail('CAN ERROR should be unusable');

if (nrcAction(0x11) !== 'kwp-fallback') fail('serviceNotSupported should fall back to KWP');
if (nrcAction(0x12) !== 'retry-mask') fail('subFunctionNotSupported should retry the mask');
if (nrcAction(0x31) !== 'retry-mask') fail('requestOutOfRange should retry the mask');
if (nrcAction(0x78) !== 'pending') fail('responsePending should wait');
if (nrcAction(0x22) !== 'present-unreadable') fail('conditionsNotCorrect means present but not readable');

// 59 02 <availability mask> then four bytes per fault.
const listed = parseUdsReply('5902FF40351108403612042F', 0x19);
if (listed.kind !== 'positive') fail('a fault list read as something else');
if (listed.kind === 'positive') {
  const groups = parseDtcGroups(listed.body);
  if (groups.length !== 2) fail(`expected 2 faults, got ${groups.length}`);
  if (groups[0].join(',') !== '64,53,17,8') fail(`first fault decoded as ${groups[0]}`);
}

// 62 F1 97 then ASCII. Padding bytes are dropped.
const named = parseUdsReply('62F1974142530000', 0x22);
if (named.kind !== 'positive' || parseSystemName(named.body) !== 'ABS') {
  fail(`the module's own name came out as ${named.kind === 'positive' ? parseSystemName(named.body) : named.kind}`);
}
// A module that answers the DID with nothing readable is unnamed, not blank.
const empty = parseUdsReply('62F1970000', 0x22);
if (empty.kind === 'positive' && parseSystemName(empty.body) !== null) fail('padding read as a name');

// KWP: 58 <count> then three bytes per fault.
const kwp = parseUdsReply('5801403508', 0x18);
if (kwp.kind !== 'positive') fail('a KWP fault list read as something else');
if (kwp.kind === 'positive') {
  const groups = parseKwpGroups(kwp.body);
  if (groups.length !== 1) fail(`expected 1 KWP fault, got ${groups.length}`);
  if (groups[0].join(',') !== '64,53,8') fail(`KWP fault decoded as ${groups[0]}`);
}

console.log('  positive, negative, silent and unusable replies all told apart');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `Cannot find module '../src/lib/obd/uds/services'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/obd/uds/services.ts`:

```ts
import {
  groupFrames,
  hexToBytes,
  matchedErrorPhrase,
  normalizeReply,
  stripTransientPhrases,
} from '../protocol';

/**
 * Reading a module the app has never heard of.
 *
 * `parseResponse` is not used here on purpose. It folds every negative response
 * into `{ ok: false, reason: … }`, and a negative response is the single most
 * useful thing a sweep can hear: `7F 19 11` means a module is present and speaks
 * KWP rather than UDS. Discarding the NRC byte would turn the best signal into a
 * failure indistinguishable from silence.
 */

/** Status mask meaning "any fault". A few ECUs refuse it and want 0x08. */
export const DTC_STATUS_MASK = 'AF';
export const DTC_STATUS_MASK_FALLBACK = '08';

export const SYSTEM_NAME_REQUEST = '22F197';
export const KWP_DTC_REQUEST = '1800FF00';

export const dtcCountRequest = (mask: string = DTC_STATUS_MASK) => `1901${mask}`;
export const dtcListRequest = (mask: string = DTC_STATUS_MASK) => `1902${mask}`;

export type UdsReply =
  | { kind: 'positive'; body: number[] }
  | { kind: 'negative'; nrc: number }
  /** Nothing is at that address. */
  | { kind: 'silent' }
  /** The adapter's own trouble, or an answer to a different question. */
  | { kind: 'unusable'; reason: string };

const SILENT_REASONS = new Set(['No data', 'Empty response']);

export function parseUdsReply(raw: string, service: number): UdsReply {
  const text = normalizeReply(raw).trim();
  if (!text) return { kind: 'silent' };

  const failure = matchedErrorPhrase(text);
  if (failure) {
    return SILENT_REASONS.has(failure) ? { kind: 'silent' } : { kind: 'unusable', reason: failure };
  }

  const { frames } = groupFrames(stripTransientPhrases(text));
  const positive = (service + 0x40).toString(16).toUpperCase().padStart(2, '0');
  const negative = service.toString(16).toUpperCase().padStart(2, '0');

  for (const frame of frames) {
    if (frame.startsWith(positive)) {
      return { kind: 'positive', body: hexToBytes(frame.slice(2)) };
    }
    // 7F <service> <nrc>. The service byte has to match, or this is an answer
    // to a different command that arrived in the wrong order.
    if (frame.startsWith('7F') && frame.length >= 6) {
      if (frame.slice(2, 4) !== negative) continue;
      return { kind: 'negative', nrc: Number.parseInt(frame.slice(4, 6), 16) };
    }
  }

  return frames.length === 0
    ? { kind: 'silent' }
    : { kind: 'unusable', reason: 'A reply to a different request' };
}

export type NrcAction = 'kwp-fallback' | 'retry-mask' | 'pending' | 'present-unreadable';

export function nrcAction(nrc: number): NrcAction {
  if (nrc === 0x11) return 'kwp-fallback';
  if (nrc === 0x12 || nrc === 0x13 || nrc === 0x31) return 'retry-mask';
  if (nrc === 0x78) return 'pending';
  return 'present-unreadable';
}

/** `19 01` body: sub-function, availability mask, format, then a 16-bit count. */
export function parseDtcCount(body: number[]): number | null {
  if (body.length < 5) return null;
  return (body[3] << 8) | body[4];
}

/** `19 02` body: sub-function, availability mask, then four bytes per fault. */
export function parseDtcGroups(body: number[]): number[][] {
  return chunk(body.slice(2), 4);
}

/** `18` body: a count byte, then three bytes per fault. */
export function parseKwpGroups(body: number[]): number[][] {
  return chunk(body.slice(1), 3);
}

/** `22 F197` body: the two DID bytes, then the name in ASCII. */
export function parseSystemName(body: number[]): string | null {
  const text = body
    .slice(2)
    .filter((byte) => byte >= 0x20 && byte <= 0x7e)
    .map((byte) => String.fromCharCode(byte))
    .join('')
    .trim();

  return text.length > 0 ? text : null;
}

function chunk(bytes: number[], size: number): number[][] {
  const groups: number[][] = [];
  for (let at = 0; at + size <= bytes.length; at += size) {
    groups.push(bytes.slice(at, at + size));
  }
  return groups;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check` then `npm run typecheck`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obd/uds/services.ts scripts/selfcheck.ts
git commit -m "Read a module's answer, including the refusal that proves it exists"
```

---

### Task 3: Four-byte faults, failure types and status

**Files:**
- Create: `src/lib/obd/uds/faults.ts`
- Modify: `scripts/selfcheck.ts`

**Interfaces:**
- Consumes: `decodeDtcBytes` from `src/lib/obd/dtc/parser`
- Produces: `FaultStatus`, `ModuleFault`, `decodeUdsFault(bytes)`, `decodeKwpFault(bytes)`, `faultLabel(fault)`, `FAILURE_TYPES`

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts`:

```ts
import { decodeKwpFault, decodeUdsFault, faultLabel } from '../src/lib/obd/uds/faults';

// ── 20. A four-byte fault says more than mode 03 can ─────────────────────────
section('Module faults');

// 0x40 0x35 is C0035 in exactly the encoding mode 03 uses, so the code the
// catalog already explains falls straight out. 0x11 is the failure type,
// 0x08 is the status byte with confirmedDTC set.
const wheel = decodeUdsFault([0x40, 0x35, 0x11, 0x08]);
if (!wheel) {
  fail('a well-formed fault failed to decode');
} else {
  if (wheel.code !== 'C0035') fail(`decoded as ${wheel.code}, expected C0035`);
  if (wheel.failureType !== 0x11) fail('the failure type byte was lost');
  if (!/short/i.test(wheel.failureTypeLabel ?? '')) fail(`0x11 labelled "${wheel.failureTypeLabel}"`);
  if (faultLabel(wheel) !== 'C0035-11') fail(`labelled ${faultLabel(wheel)}`);

  // The status byte is the thing mode 03 cannot express: whether the fault is
  // happening now or was stored on a previous drive.
  if (wheel.status.failingNow) fail('bit 0 clear means it is not failing right now');
  if (!wheel.status.confirmed) fail('bit 3 set means the fault is confirmed');
}

const live = decodeUdsFault([0x40, 0x35, 0x11, 0x09]);
if (!live?.status.failingNow) fail('bit 0 set means the fault is present now');

// An unknown failure type is shown as its hex value, not guessed at.
const odd = decodeUdsFault([0x40, 0x35, 0xd7, 0x08]);
if (odd?.failureTypeLabel !== '0xD7') fail(`an unknown failure type gave "${odd?.failureTypeLabel}"`);

// KWP faults are three bytes and carry no failure type, so the label has no
// suffix rather than a made-up one.
const older = decodeKwpFault([0x40, 0x35, 0x08]);
if (!older) {
  fail('a KWP fault failed to decode');
} else {
  if (older.code !== 'C0035') fail(`KWP fault decoded as ${older.code}`);
  if (faultLabel(older) !== 'C0035') fail(`a KWP fault was labelled ${faultLabel(older)}`);
}

// Padding must not become a fault, the same way it does not in mode 03.
if (decodeUdsFault([0x00, 0x00, 0x00, 0x00]) !== null) fail('padding decoded as a fault');
if (decodeUdsFault([0x40, 0x35]) !== null) fail('a truncated fault decoded');

console.log('  UDS and KWP faults decode, with status and failure type');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `Cannot find module '../src/lib/obd/uds/faults'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/obd/uds/faults.ts`:

```ts
import { decodeDtcBytes } from '../dtc/parser';

/**
 * What a module reports about one fault.
 *
 * The first two bytes are the code in the same encoding mode 03 uses, so they
 * go through the existing decoder and land in the catalog already written. The
 * third byte says how the circuit failed and the fourth says whether it is
 * failing now — neither of which mode 03 can express at all.
 */
export type FaultStatus = {
  /** ISO 14229 bit 0, testFailed: the fault is present this moment. */
  failingNow: boolean;
  /** ISO 14229 bit 3, confirmedDTC: stored, having failed often enough to count. */
  confirmed: boolean;
  raw: number;
};

export type ModuleFault = {
  code: string;
  /** Null on KWP, which has no failure type byte. */
  failureType: number | null;
  failureTypeLabel: string | null;
  status: FaultStatus;
};

/** ISO 14229-1 Annex D. Only the entries that can be stated plainly. */
export const FAILURE_TYPES: Record<number, string> = {
  0x00: 'No further detail',
  0x11: 'Circuit shorted to ground',
  0x12: 'Circuit shorted to battery',
  0x13: 'Circuit open',
  0x14: 'Circuit shorted to ground or open',
  0x15: 'Circuit shorted to battery or open',
  0x1c: 'Circuit voltage out of range',
  0x21: 'Signal too low',
  0x22: 'Signal too high',
  0x29: 'Signal invalid',
  0x2f: 'Signal erratic',
  0x31: 'No signal',
  0x38: 'Signal below the allowed range',
  0x39: 'Signal above the allowed range',
  0x62: 'Signal does not match another sensor',
  0x64: 'Signal not plausible',
  0x71: 'Actuator stuck',
  0x73: 'Actuator stuck closed',
  0x81: 'Invalid data received',
  0x87: 'Expected message missing',
  0x92: 'Performance or incorrect operation',
};

function statusOf(raw: number): FaultStatus {
  return { failingNow: (raw & 0x01) !== 0, confirmed: (raw & 0x08) !== 0, raw };
}

const hexByte = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;

export function decodeUdsFault(bytes: number[]): ModuleFault | null {
  if (bytes.length < 4) return null;

  const code = decodeDtcBytes(bytes[0], bytes[1]);
  if (!code) return null;

  const failureType = bytes[2];
  return {
    code,
    failureType,
    // An unrecognised byte is shown as itself. Guessing at it would be the
    // same mistake as naming a manufacturer trouble code.
    failureTypeLabel: FAILURE_TYPES[failureType] ?? hexByte(failureType),
    status: statusOf(bytes[3]),
  };
}

export function decodeKwpFault(bytes: number[]): ModuleFault | null {
  if (bytes.length < 3) return null;

  const code = decodeDtcBytes(bytes[0], bytes[1]);
  if (!code) return null;

  return { code, failureType: null, failureTypeLabel: null, status: statusOf(bytes[2]) };
}

/** `C0035-11`, or plain `C0035` when there is no failure type to add. */
export function faultLabel(fault: ModuleFault): string {
  if (fault.failureType === null) return fault.code;
  return `${fault.code}-${fault.failureType.toString(16).toUpperCase().padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check` then `npm run typecheck`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obd/uds/faults.ts scripts/selfcheck.ts
git commit -m "Decode a module fault, and whether it is failing right now"
```

---

### Task 4: Naming the parts of the car

**Files:**
- Create: `src/lib/obd/uds/parts.ts`
- Create: `src/lib/obd/uds/classify.ts`
- Modify: `scripts/selfcheck.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Part`, `PART_LABELS`, `PART_ORDER` from `parts.ts`; `classifyModule({ name, codes, requestId })` from `classify.ts`

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts`:

```ts
import { classifyModule } from '../src/lib/obd/uds/classify';
import { PART_LABELS, PART_ORDER } from '../src/lib/obd/uds/parts';

// ── 21. A discovered module is placed without brand knowledge ────────────────
section('Module classification');

for (const part of PART_ORDER) {
  if (!PART_LABELS[part]) fail(`part "${part}" has no label`);
}
if (new Set(PART_ORDER).size !== PART_ORDER.length) fail('a part is listed twice');

// 1. The module's own name, when it answered 22F197.
const named = (name: string) => classifyModule({ name, codes: [], requestId: '7A0' });
if (named('ABS') !== 'brakes') fail('ABS should be brakes');
if (named('ESP') !== 'brakes') fail('ESP should be brakes');
if (named('Airbag') !== 'restraints') fail('Airbag should be restraints');
if (named('SRS') !== 'restraints') fail('SRS should be restraints');
if (named('EPS') !== 'steering') fail('EPS should be steering');
if (named('Getriebe') !== 'transmission') fail('Getriebe should be transmission');
if (named('Kombi') !== 'instruments') fail('Kombi should be instruments');
if (named('Gateway') !== 'network') fail('Gateway should be network');

// 2. Failing that, the letters of the codes it stores. A module keeps codes in
//    its own domain, so this is available exactly when it matters.
const byCodes = (codes: string[]) => classifyModule({ name: null, codes, requestId: '7A0' });
if (byCodes(['C0035']) !== 'brakes') fail('a C code is chassis');
if (byCodes(['B1234']) !== 'body') fail('a B code is body');
if (byCodes(['U0155']) !== 'network') fail('a U code is network');
if (byCodes(['P0301']) !== 'engine') fail('a P code is powertrain');

// 3. Failing that, the legislated addresses, which are powertrain by definition.
if (classifyModule({ name: null, codes: [], requestId: '7E0' }) !== 'engine') fail('0x7E0 is the engine');
if (classifyModule({ name: null, codes: [], requestId: '7E1' }) !== 'transmission') {
  fail('0x7E1 is the transmission by near-universal convention');
}

// 4. And otherwise it stays unplaced rather than being guessed at.
if (classifyModule({ name: null, codes: [], requestId: '7A0' }) !== 'other') {
  fail('an unnamed module with no codes must not be placed');
}

// The name outranks the codes: a module that told us what it is beats an
// inference from what happens to be stored in it.
if (classifyModule({ name: 'ABS', codes: ['U0155'], requestId: '7E0' }) !== 'brakes') {
  fail('classification precedence is wrong');
}

console.log(`  ${PART_ORDER.length} parts, classified by name then codes then address`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `Cannot find module '../src/lib/obd/uds/parts'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/obd/uds/parts.ts`:

```ts
/** The areas a driver thinks in. Deliberately short. */
export type Part =
  | 'engine'
  | 'transmission'
  | 'brakes'
  | 'restraints'
  | 'steering'
  | 'suspension'
  | 'body'
  | 'instruments'
  | 'network'
  | 'other';

export const PART_LABELS: Record<Part, string> = {
  engine: 'Engine',
  transmission: 'Transmission',
  brakes: 'Brakes and stability',
  restraints: 'Airbags and restraints',
  steering: 'Steering',
  suspension: 'Suspension',
  body: 'Body and comfort',
  instruments: 'Instruments',
  network: 'Network',
  other: 'Other modules',
};

/** Roughly most-consequential first, which is also the order results show in. */
export const PART_ORDER: Part[] = [
  'engine',
  'brakes',
  'restraints',
  'steering',
  'transmission',
  'suspension',
  'body',
  'instruments',
  'network',
  'other',
];
```

Create `src/lib/obd/uds/classify.ts`:

```ts
import type { Part } from './parts';

/**
 * Places a discovered module without any brand knowledge.
 *
 * Nothing here is a lookup table of addresses. The first rule matches a name the
 * module supplied about itself, the second reads the letters of the codes it is
 * actually storing, and the third uses the only addresses the standard fixes.
 * A module that matches none of them stays "other" and is shown by its address,
 * for the same reason an unlisted trouble code says so rather than guessing.
 */

/** Matched against the module's own `22F197` answer. English and German both
 *  turn up in practice, often on the same car. */
const NAME_PATTERNS: Array<[RegExp, Part]> = [
  [/\b(ABS|ESP|ESC|DSC|DSTC|VSA|EBCM)\b|BREMS|BRAKE/i, 'brakes'],
  [/\b(SRS|RCM|ORC|ACU)\b|AIRBAG|RESTRAINT|RUECKHALT/i, 'restraints'],
  [/\b(EPS|EPAS|PSCM)\b|LENK|STEER/i, 'steering'],
  [/\b(TCM|TCU|DSG)\b|GETRIEBE|TRANSMISS|GEARBOX/i, 'transmission'],
  [/NIVEAU|LUFTFEDER|SUSPENS|DAMP|FAHRWERK/i, 'suspension'],
  [/\b(IPC|KOMBI)\b|CLUSTER|INSTRUMENT|TACHO/i, 'instruments'],
  [/GATEWAY|\bGW\b|DIAGNOSTIC BUS/i, 'network'],
  [/\b(BCM|CEM|SAM)\b|KAROSSERIE|BODY|COMFORT|KOMFORT|KLIMA|CLIMATE|HVAC/i, 'body'],
  [/\b(ECM|PCM|EDC|MED|SIMOS|DDE|DME)\b|MOTOR|ENGINE/i, 'engine'],
];

const CODE_LETTERS: Record<string, Part> = {
  P: 'engine',
  C: 'brakes',
  B: 'body',
  U: 'network',
};

/** The only addresses the standard fixes. 0x7E1 is the transmission by a
 *  convention near enough universal to rely on. */
const LEGISLATED: Record<string, Part> = {
  '7E0': 'engine',
  '7E1': 'transmission',
  '7E2': 'engine',
  '7E3': 'engine',
  '7E4': 'engine',
  '7E5': 'engine',
  '7E6': 'engine',
  '7E7': 'engine',
  '18DA00F1': 'engine',
  '18DA01F1': 'transmission',
};

export function classifyModule(input: {
  name: string | null;
  codes: string[];
  requestId: string;
}): Part {
  if (input.name) {
    for (const [pattern, part] of NAME_PATTERNS) {
      if (pattern.test(input.name)) return part;
    }
  }

  // A module stores codes in its own domain, so the first one is representative.
  const first = input.codes[0];
  if (first) {
    const part = CODE_LETTERS[first.charAt(0).toUpperCase()];
    if (part) return part;
  }

  return LEGISLATED[input.requestId.toUpperCase()] ?? 'other';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check` then `npm run typecheck`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obd/uds/parts.ts src/lib/obd/uds/classify.ts scripts/selfcheck.ts
git commit -m "Place a discovered module without knowing the brand"
```

---

### Task 5: The scan plan

**Files:**
- Create: `src/features/scan/lib/scan-plan.ts`
- Modify: `scripts/selfcheck.ts`

**Interfaces:**
- Consumes: `CanAddressing`, `sweepTargets`, `SweepTarget` from `src/lib/obd/uds/addressing`
- Produces: `ScanScope`, `ScanStep`, `buildScanPlan(scope, addressing)`, `estimateSeconds(plan)`

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts`:

```ts
import { buildScanPlan, estimateSeconds } from '../src/features/scan/lib/scan-plan';

// ── 22. A scan does only what was asked of it ────────────────────────────────
section('Scan plans');

// Engine only is the path the app has always taken, and it must stay untouched
// so a K-line car still works exactly as it does today.
if (buildScanPlan({ kind: 'engine' }, 'can11').length !== 0) {
  fail('an engine-only scan should add no module steps at all');
}

const whole = buildScanPlan({ kind: 'whole' }, 'can11');
if (whole.length !== 255) fail(`a whole-car plan has ${whole.length} steps, expected 255`);
if (whole.some((step) => step.kind !== 'discover')) fail('a whole-car plan should be all discovery');
if (whole[0].requestId !== '7E0') fail('a whole-car plan should open at the engine');

// Picking parts skips discovery entirely: the addresses are already known, so
// this is two requests each rather than a sweep. That saving is the whole
// reason to have done the sweep once.
const picked = buildScanPlan({ kind: 'parts', requestIds: ['7E0', '760'] }, 'can11');
if (picked.some((step) => step.kind === 'discover')) fail('a picked-parts scan must not sweep');
if (picked.length !== 2) fail(`a two-part scan has ${picked.length} steps`);
if (picked.map((step) => step.requestId).join(',') !== '7E0,760') fail('picked parts came out reordered');

// A picked address that is not a real sweep target is dropped rather than sent.
const bogus = buildScanPlan({ kind: 'parts', requestIds: ['7E0', 'ZZZ'] }, 'can11');
if (bogus.length !== 1) fail('an address outside the diagnostic band was not dropped');

// The estimate is what the scope screen puts in front of somebody deciding
// whether to wait, so it has to be in the right order of magnitude.
const sweepSeconds = estimateSeconds(whole);
if (sweepSeconds < 20 || sweepSeconds > 90) fail(`a full sweep is estimated at ${sweepSeconds}s`);
if (estimateSeconds(picked) > 5) fail(`two parts estimated at ${estimateSeconds(picked)}s`);

console.log(`  full sweep ${whole.length} steps, about ${sweepSeconds}s`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `Cannot find module '../src/features/scan/lib/scan-plan'`

- [ ] **Step 3: Write the implementation**

Create `src/features/scan/lib/scan-plan.ts`:

```ts
import { sweepTargets, type CanAddressing } from '@/lib/obd/uds/addressing';

/**
 * What the driver asked for.
 *
 * `parts` carries addresses rather than part names because a part is a grouping
 * of whatever modules were found, and two modules can share one. The screen
 * turns a ticked part back into its addresses before asking for a scan.
 */
export type ScanScope =
  | { kind: 'engine' }
  | { kind: 'whole' }
  | { kind: 'parts'; requestIds: string[] };

export type ScanStep = {
  /** `discover` asks whether anything is there; `interrogate` asks what it holds. */
  kind: 'discover' | 'interrogate';
  requestId: string;
  receiveFilter: string | null;
};

/**
 * Roughly what one step costs, for the estimate on the scope screen.
 *
 * A discovery step is `ATSH` plus one probe that usually goes unanswered, so it
 * costs the reply window. An interrogation is two or three real requests to a
 * module that is definitely listening.
 */
const DISCOVER_SECONDS = 0.16;
const INTERROGATE_SECONDS = 0.9;

export function buildScanPlan(scope: ScanScope, addressing: CanAddressing): ScanStep[] {
  if (scope.kind === 'engine') return [];

  const targets = sweepTargets(addressing);

  if (scope.kind === 'whole') {
    return targets.map((target) => ({ kind: 'discover' as const, ...target }));
  }

  // Only addresses this bus actually has. A stored map from another protocol,
  // or a value that has been edited, must not become a command.
  const known = new Map(targets.map((target) => [target.requestId, target]));

  return scope.requestIds
    .map((requestId) => known.get(requestId.toUpperCase()))
    .filter((target): target is NonNullable<typeof target> => target !== undefined)
    .map((target) => ({ kind: 'interrogate' as const, ...target }));
}

export function estimateSeconds(plan: ScanStep[]): number {
  const seconds = plan.reduce(
    (total, step) => total + (step.kind === 'discover' ? DISCOVER_SECONDS : INTERROGATE_SECONDS),
    0,
  );
  return Math.max(1, Math.round(seconds));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check` then `npm run typecheck`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/lib/scan-plan.ts scripts/selfcheck.ts
git commit -m "Turn a chosen scope into the addresses it means"
```

---

### Task 6: Remembering what the car is made of

**Files:**
- Create: `src/features/scan/lib/module-map.ts`
- Modify: `scripts/selfcheck.ts`

**Interfaces:**
- Consumes: `Part`, `PART_ORDER` from `src/lib/obd/uds/parts`
- Produces: `DiscoveredModule`, `ModuleMap`, `MODULE_MAP_VERSION`, `mergeAfterVerify(map, answered, now)`, `groupByPart(modules)`, `mapAppliesTo(map, vin, protocolId)`

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts`:

```ts
import {
  groupByPart,
  mapAppliesTo,
  mergeAfterVerify,
  type ModuleMap,
} from '../src/features/scan/lib/module-map';

// ── 23. What the car is made of survives, carefully ──────────────────────────
section('Module map');

const module = (requestId: string, part: 'engine' | 'brakes' | 'restraints') => ({
  requestId,
  part,
  name: null,
  faultCount: 0,
  stale: false,
  lastSeenAt: '2026-08-01T10:00:00.000Z',
});

const saved: ModuleMap = {
  version: 1,
  vin: 'WAUZZZ8K9FA123456',
  protocolId: '6',
  discoveredAt: '2026-08-01T10:00:00.000Z',
  modules: [module('7E0', 'engine'), module('760', 'brakes'), module('740', 'restraints')],
};

// A module that answers is confirmed and its date moves forward.
const now = '2026-08-10T09:00:00.000Z';
const verified = mergeAfterVerify(saved, ['7E0', '760'], now);
if (verified.modules.length !== 3) fail('re-verifying dropped a module');

const stillThere = verified.modules.find((entry) => entry.requestId === '7E0');
if (stillThere?.stale) fail('a module that answered was marked stale');
if (stillThere?.lastSeenAt !== now) fail('a module that answered kept its old date');

// A module that stays quiet is marked, not deleted. A module that is asleep is
// not a module that has been removed, and deleting it would silently shrink the
// picker with no way for anyone to notice.
const quiet = verified.modules.find((entry) => entry.requestId === '740');
if (!quiet) {
  fail('a silent module was deleted instead of marked');
} else {
  if (!quiet.stale) fail('a silent module should be marked stale');
  if (quiet.lastSeenAt !== '2026-08-01T10:00:00.000Z') fail('a silent module had its date moved');
}

// A stale module that answers again is well again.
const returned = mergeAfterVerify(verified, ['740'], '2026-08-11T09:00:00.000Z');
if (returned.modules.find((entry) => entry.requestId === '740')?.stale) {
  fail('a module that came back is still marked stale');
}

// Applying another car's map would offer addresses this car does not have.
if (!mapAppliesTo(saved, 'WAUZZZ8K9FA123456', '6')) fail('a map should apply to its own car');
if (mapAppliesTo(saved, 'WVWZZZ1KZAW123456', '6')) fail('a map was applied to a different VIN');
if (mapAppliesTo(saved, null, '6')) fail('a map was applied to a car with no readable VIN');
// The addresses only mean anything on the bus they were found on.
if (mapAppliesTo(saved, 'WAUZZZ8K9FA123456', '7')) fail('an 11-bit map was applied to a 29-bit bus');
if (mapAppliesTo(null, 'WAUZZZ8K9FA123456', '6')) fail('a missing map applied to something');

// Results group in a fixed order so the list does not reshuffle between scans.
const grouped = groupByPart(saved.modules);
if (grouped.map((entry) => entry.part).join(',') !== 'engine,brakes,restraints') {
  fail(`grouped as ${grouped.map((entry) => entry.part)}`);
}
if (grouped.some((entry) => entry.modules.length === 0)) fail('an empty part group was emitted');

console.log('  maps merge, go stale rather than vanish, and stay on their own car');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `Cannot find module '../src/features/scan/lib/module-map'`

- [ ] **Step 3: Write the implementation**

Create `src/features/scan/lib/module-map.ts`:

```ts
import { PART_ORDER, type Part } from '@/lib/obd/uds/parts';

export const MODULE_MAP_VERSION = 1;

export type DiscoveredModule = {
  /** The address asked. All a re-read needs, and how a module is identified. */
  requestId: string;
  part: Part;
  /** What the module called itself, when it answered `22F197`. */
  name: string | null;
  /** Null when the module was present but would not say. */
  faultCount: number | null;
  /** Found before, silent on the last check. Shown, not removed. */
  stale: boolean;
  lastSeenAt: string;
};

export type ModuleMap = {
  version: typeof MODULE_MAP_VERSION;
  vin: string;
  /** The addresses only mean anything on the bus they were found on. */
  protocolId: string;
  discoveredAt: string;
  modules: DiscoveredModule[];
};

/**
 * Folds a re-verification back into the saved map.
 *
 * A module that answers is confirmed and dated. One that stays quiet is marked
 * stale and kept: modules sleep, and a driver who saw "Airbag" in the list
 * yesterday should not find it silently gone today with nothing to explain it.
 */
export function mergeAfterVerify(map: ModuleMap, answered: string[], now: string): ModuleMap {
  const heard = new Set(answered.map((requestId) => requestId.toUpperCase()));

  return {
    ...map,
    modules: map.modules.map((entry) =>
      heard.has(entry.requestId.toUpperCase())
        ? { ...entry, stale: false, lastSeenAt: now }
        : { ...entry, stale: true },
    ),
  };
}

/** Whether a saved map describes the car currently plugged in. */
export function mapAppliesTo(
  map: ModuleMap | null,
  vin: string | null,
  protocolId: string | null,
): boolean {
  if (!map || !vin || !protocolId) return false;
  return map.vin === vin && map.protocolId === protocolId;
}

/** Fixed order, so the results list does not reshuffle between two scans. */
export function groupByPart(
  modules: DiscoveredModule[],
): { part: Part; modules: DiscoveredModule[] }[] {
  return PART_ORDER.map((part) => ({
    part,
    modules: modules.filter((entry) => entry.part === part),
  })).filter((group) => group.modules.length > 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check` then `npm run typecheck`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/lib/module-map.ts scripts/selfcheck.ts
git commit -m "Remember a car's modules, and let a quiet one go stale not missing"
```

---

### Task 7: Stop a sweep from looking like a broken link

**Files:**
- Modify: `src/features/connection/lib/elm327.ts` (add a field and a method; guard `noteFailure`)
- Modify: `scripts/selfcheck.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Elm327Client.setTroubleSuspended(suspended: boolean): void`

**Why this task exists:** `Elm327Client` reports the link as broken after `TROUBLE_THRESHOLD` (4) consecutive failures, and the connection provider answers that by restarting the link. A sweep is hundreds of probes at addresses with nothing behind them. Silence measured as `NO DATA` is already safe — `linkReplyHealth` returns `neutral` for it on a `19` request — but a genuine timeout is not, and four in a row would tear down the link mid-scan.

- [ ] **Step 1: Write the failing test**

Append to `scripts/selfcheck.ts`:

```ts
import { TROUBLE_THRESHOLD } from '../src/features/connection/lib/at-commands';

// ── 24. A sweep is not a broken link ─────────────────────────────────────────
section('Trouble reporting during a sweep');

// Four unanswered commands is how the client decides a link has died. A sweep
// walks 255 addresses with nothing behind most of them, so that count is
// reached routinely and means nothing.
if (TROUBLE_THRESHOLD > 8) fail(`a threshold of ${TROUBLE_THRESHOLD} is not a link failure signal`);

// NO DATA on a UDS request is already neutral, which is what keeps an ordinary
// silent address from counting at all.
if (linkReplyHealth('1901AF', 'NO DATA') !== 'neutral') {
  fail('a silent address must not count against the link');
}
// A real adapter failure during a sweep still has to count, or a chip that has
// fallen off the bus would be swept for another forty seconds.
if (linkReplyHealth('1901AF', 'CAN ERROR') !== 'failure') {
  fail('a wedged controller must still be reported during a sweep');
}

console.log('  silence is not failure; adapter faults still are');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check`
Expected: FAIL — `TROUBLE_THRESHOLD` is not exported from `at-commands`.

- [ ] **Step 3: Write the implementation**

In `src/features/connection/lib/at-commands.ts`, move the constant out of `elm327.ts` and export it, keeping its existing comment:

```ts
/**
 * Consecutive failed commands before the link is treated as broken rather
 * than merely slow. Several in a row means the vehicle session was lost —
 * usually after a brownout that also erased the adapter's configuration.
 */
export const TROUBLE_THRESHOLD = 4;
```

In `src/features/connection/lib/elm327.ts`, delete the local `TROUBLE_THRESHOLD` and import it from `./at-commands` alongside the others. Add the field beside `troubleReported`:

```ts
  private troubleSuspended = false;
```

Add the method next to `onTrouble`:

```ts
  /**
   * Stops the link being declared broken while a whole-car sweep runs.
   *
   * The sweep knocks on hundreds of addresses with nothing behind most of them,
   * so a run of unanswered commands is the expected shape of a working scan
   * rather than evidence of anything. Left on, the fourth one would tear the
   * link down and restart it in the middle of the scan.
   *
   * Adapter faults are unaffected: they are reported through the reply itself,
   * not through this count.
   */
  setTroubleSuspended(suspended: boolean): void {
    this.troubleSuspended = suspended;
    if (suspended) {
      this.consecutiveFailures = 0;
      this.troubleReported = false;
    }
  }
```

Guard the counter, as the first line of `noteFailure`:

```ts
  private noteFailure(): void {
    if (this.recovering || this.troubleSuspended) return;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check` then `npm run typecheck`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/connection/lib/elm327.ts src/features/connection/lib/at-commands.ts scripts/selfcheck.ts
git commit -m "Let a sweep knock on empty addresses without killing the link"
```

---

### Task 8: Running a scan against the car

**Files:**
- Create: `src/features/scan/lib/module-map-store.ts`
- Create: `src/features/scan/lib/run-scan.ts`
- Create: `src/features/scan/context/vehicle-scan-provider.tsx`
- Create: `src/features/scan/hooks/use-vehicle-scan.ts`
- Modify: `src/app/_layout.tsx` (mount the provider inside the existing `TroubleCodesProvider`)

**Interfaces:**
- Consumes: everything from Tasks 1–7, plus `Elm327Client` and `useObdConnection`
- Produces: `runScan(client, plan, handlers)`, `loadModuleMap(vin)`, `saveModuleMap(map)`, `VehicleScanValue`, `useVehicleScan()`

- [ ] **Step 1: Write the store and the runner**

Create `src/features/scan/lib/module-map-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MODULE_MAP_VERSION, type ModuleMap } from './module-map';

const key = (vin: string) => `scan.module-map.v${MODULE_MAP_VERSION}.${vin}`;

/** A car with no readable VIN gets no persistence, rather than a shared slot. */
export async function loadModuleMap(vin: string | null): Promise<ModuleMap | null> {
  if (!vin) return null;

  try {
    const raw = await AsyncStorage.getItem(key(vin));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ModuleMap;
    // A map written by an older shape is discarded rather than migrated: it
    // costs one forty-second sweep to rebuild and nothing to get wrong.
    if (parsed.version !== MODULE_MAP_VERSION || parsed.vin !== vin) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveModuleMap(map: ModuleMap): Promise<void> {
  try {
    await AsyncStorage.setItem(key(map.vin), JSON.stringify(map));
  } catch {
    // Losing the map costs one sweep. It is not worth failing a scan over.
  }
}
```

Create `src/features/scan/lib/run-scan.ts`. This is the only file that talks to the adapter, and it makes no decisions the pure layer has not already made:

```ts
import type { Elm327Client } from '@/features/connection/lib/elm327';
import { sweepLinkSettings, type CanAddressing } from '@/lib/obd/uds/addressing';
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
} from '@/lib/obd/uds/services';

import type { ScanStep } from './scan-plan';
import type { DiscoveredModule } from './module-map';

const PROBE_TIMEOUT_MS = 1500;
const READ_TIMEOUT_MS = 5000;

export type ScanProgress = { done: number; total: number; found: number };

export type ScanResult = {
  modules: DiscoveredModule[];
  faults: Record<string, ModuleFault[]>;
  /** True when the caller stopped it, so partial results can be labelled. */
  aborted: boolean;
};

export type ScanHandlers = {
  onProgress?: (progress: ScanProgress) => void;
  /** Checked before every step, so an abort takes effect within one probe. */
  shouldStop?: () => boolean;
};

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
  let aborted = false;

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

      const found = await visit(client, step);
      if (found) {
        modules.push(found.module);
        if (found.faults.length) faults[found.module.requestId] = found.faults;
      }

      handlers.onProgress?.({ done: index + 1, total: plan.length, found: modules.length });
    }
  } finally {
    // Restored on every path, including an adapter that died mid-sweep. A link
    // left filtered to 0x700-0x7FF reads nothing from the engine ever again,
    // and nothing about that heals on its own -- so a restore that will not go
    // through is worth a full reconfiguration rather than a swallowed error.
    let restored = true;
    for (const setting of settings) {
      try {
        await client.sendCommand(setting.restore, 3000);
      } catch {
        restored = false;
      }
    }
    client.setTroubleSuspended(false);
    if (!restored) await client.recover().catch(() => undefined);
  }

  return { modules, faults, aborted };
}

async function visit(
  client: Elm327Client,
  step: ScanStep,
): Promise<{ module: DiscoveredModule; faults: ModuleFault[] } | null> {
  const now = new Date().toISOString();

  try {
    await client.sendCommand(`ATSH${step.requestId}`, 3000);
    if (step.receiveFilter) await client.sendCommand(`ATCRA${step.receiveFilter}`, 3000);
  } catch {
    return null;
  }

  const probe = parseUdsReply(await ask(client, dtcCountRequest(), PROBE_TIMEOUT_MS), 0x19);

  if (probe.kind === 'silent' || probe.kind === 'unusable') return null;

  let count: number | null = null;
  let useKwp = false;

  if (probe.kind === 'positive') {
    count = parseDtcCount(probe.body);
  } else {
    const action = nrcAction(probe.nrc);
    if (action === 'kwp-fallback') {
      useKwp = true;
    } else if (action === 'retry-mask') {
      const retry = parseUdsReply(
        await ask(client, dtcCountRequest(DTC_STATUS_MASK_FALLBACK), PROBE_TIMEOUT_MS),
        0x19,
      );
      if (retry.kind === 'positive') count = parseDtcCount(retry.body);
    }
    // 'pending' and 'present-unreadable' both mean a module is there and will
    // not say more, which is still worth reporting.
  }

  const faults = count === 0 ? [] : await readFaults(client, useKwp);
  const name = await readName(client);

  return {
    module: {
      requestId: step.requestId,
      part: classifyModule({ name, codes: faults.map((fault) => fault.code), requestId: step.requestId }),
      name,
      faultCount: count ?? (faults.length || null),
      stale: false,
      lastSeenAt: now,
    },
    faults,
  };
}

async function readFaults(client: Elm327Client, useKwp: boolean): Promise<ModuleFault[]> {
  const command = useKwp ? KWP_DTC_REQUEST : dtcListRequest();
  const service = useKwp ? 0x18 : 0x19;
  const reply = parseUdsReply(await ask(client, command, READ_TIMEOUT_MS), service);
  if (reply.kind !== 'positive') return [];

  const groups = useKwp ? parseKwpGroups(reply.body) : parseDtcGroups(reply.body);
  const decode = useKwp ? decodeKwpFault : decodeUdsFault;

  return groups.map(decode).filter((fault): fault is ModuleFault => fault !== null);
}

async function readName(client: Elm327Client): Promise<string | null> {
  const reply = parseUdsReply(await ask(client, SYSTEM_NAME_REQUEST, PROBE_TIMEOUT_MS), 0x22);
  return reply.kind === 'positive' ? parseSystemName(reply.body) : null;
}

/** A command that fails is silence, which the parsers already understand. */
async function ask(client: Elm327Client, command: string, timeoutMs: number): Promise<string> {
  try {
    return await client.sendCommand(command, timeoutMs);
  } catch {
    return '';
  }
}
```

- [ ] **Step 2: Write the provider and hook**

Create `src/features/scan/context/vehicle-scan-provider.tsx` exposing:

```ts
export type VehicleScanValue = {
  /** Null until a whole-car scan or a restored map has run. */
  map: ModuleMap | null;
  faults: Record<string, ModuleFault[]>;
  addressing: CanAddressing | null;
  busy: boolean;
  progress: ScanProgress | null;
  error: string | null;
  scan: (scope: ScanScope) => Promise<void>;
  stop: () => void;
};
```

Behaviour:
- `addressing` comes from `addressingFor(client.protocol id)`; null means the scope screen offers engine only.
- On connect, read the VIN with `client.query('0902')` and `parseVin`, `loadModuleMap(vin)`, then if `mapAppliesTo(...)` run a `parts` scan over the remembered addresses using **only** the discovery probe, and fold the answers back with `mergeAfterVerify`.
- `scan({ kind: 'whole' })` builds a plan, runs it, classifies, saves with `saveModuleMap`.
- `scan({ kind: 'parts', requestIds })` runs only those, and merges the results into the existing map rather than replacing it.
- `stop()` flips a ref that `shouldStop` reads.
- A new `client` clears everything, exactly as `TroubleCodesProvider` does.

Create `src/features/scan/hooks/use-vehicle-scan.ts` in the same shape as `use-trouble-codes.ts`.

- [ ] **Step 3: Mount the provider**

In `src/app/_layout.tsx`, wrap the existing tree so `VehicleScanProvider` sits inside the connection provider and beside `TroubleCodesProvider`.

- [ ] **Step 4: Verify**

Run: `npm run check` and `npm run typecheck`
Expected: both clean. Then `npx expo start` and confirm the app still boots and reads engine codes exactly as before — nothing in this task changes that path.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan src/app/_layout.tsx
git commit -m "Walk a scan plan against the car and keep what answered"
```

---

### Task 9: The scope screen and grouped results

**Files:**
- Create: `src/features/scan/screens/scan-scope-screen.tsx`
- Create: `src/features/scan/components/module-group.tsx`
- Modify: `src/features/dtc/screens/codes-screen.tsx`
- Create: `src/app/(live)/scan.tsx`

**Interfaces:**
- Consumes: `useVehicleScan`, `PART_LABELS`, `PART_ORDER`, `groupByPart`, `estimateSeconds`, `buildScanPlan`, `faultLabel`, `resolveDtcDetail`
- Produces: no new exports consumed elsewhere

- [ ] **Step 1: Build the scope screen**

Three states, driven by `addressing` and `map`:

- **Not CAN** (`addressing === null`): only *Engine only*, with the protocol named — "This car is on ISO 9141-2. Only the engine can be reached on that bus."
- **CAN, no map yet**: *Whole car* and *Engine only* as radio options with their estimates from `estimateSeconds(buildScanPlan(...))`, plus a note that individual parts appear once the app has found them.
- **CAN, map present**: the same two, plus a checklist built from `groupByPart(map.modules)` — label from `PART_LABELS`, the module's `name` when it has one and its `requestId` otherwise, stale entries greyed with their `lastSeenAt` date, and a *Find modules again* button that runs a fresh whole-car scan.

The estimate updates with the selection. While `busy`, show `progress.done / progress.total`, the count found so far, and a *Stop* button wired to `stop()`.

Before a whole-car scan starts, a confirmation: the car must be stationary with the ignition on.

- [ ] **Step 2: Build the grouped results**

`module-group.tsx` renders one module: its label, its address in mono, its fault count, and each fault as a row showing `faultLabel(fault)`, the title from `resolveDtcDetail(fault.code)`, and a "happening now" marker when `fault.status.failingNow`. Tapping a row pushes `/code/<code>` — the detail screen already exists and needs no change.

A module that answered with no faults is listed collapsed. "The airbag module is fine" is an answer worth having.

- [ ] **Step 3: Wire it into the Codes screen**

Replace the single "Read codes" action with the scope screen. Engine-only results keep rendering exactly as they do today through `TroubleCodesProvider`; module results render underneath, grouped. Filter chips across the top come from `PART_ORDER` intersected with the parts actually present.

- [ ] **Step 4: Verify**

Run: `npm run check` and `npm run typecheck`, then `npx expo start`.

On a real CAN car, confirm in order: engine-only still reads as before; a whole-car scan finds more than one module and completes in roughly the estimated time; picking one part afterwards takes about a second; and — the one that matters most — after any scan, an ordinary live reading still works, which proves the link settings were restored.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan src/features/dtc/screens/codes-screen.tsx "src/app/(live)/scan.tsx"
git commit -m "Choose what to scan, and show what each module answered"
```

---

## After this plan

`src/lib/obd/vin.ts` and the Vehicle screen changes are a separate, smaller plan:
the spec's identity section is independent of everything above and could be
built before or after it.

## Risk to watch on the first real run

The forty-second estimate assumes each probe costs roughly the reply window plus
a Bluetooth round trip. If the adapter's RFCOMM latency is worse than about
80 ms, a full sweep becomes 60–90 seconds and the curated-shortlist approach the
spec rejected has to come back as an option. Measure it on the first whole-car
scan: `progress.done` against wall-clock time answers it immediately.
