/**
 * Pure-logic checks that need no adapter, no car and no device.
 * Run with: npx tsx <this file>
 */
import { looksLikeObdAdapter, rankAdapterCandidates } from '../src/features/connection/lib/adapter-ranking';
import {
  ADAPTER_INIT_SEQUENCE,
  ADAPTIVE_TIMING,
  FIXED_TIMING,
  KEYWORD_CHECK_OFF,
  MAX_CONTROLLER_RESETS,
  PROTOCOL_CLOSE,
  TROUBLE_THRESHOLD,
} from '../src/features/connection/lib/at-commands';
import { humanizeBluetoothError } from '../src/features/connection/lib/bluetooth-errors';
import {
  IDLE_STATE,
  countsAsLinkTrouble,
  stateAfterAdapterDropped,
} from '../src/features/connection/lib/connection-state';
import { describeUnreachableCar, parsePortVoltage } from '../src/features/connection/lib/connection-report';
import { buildHandshakePlan, worstCaseDuration } from '../src/features/connection/lib/handshake-plan';
import { buildScanPlan, estimateSeconds } from '../src/features/scan/lib/scan-plan';
import { AUTHORED, AUTHORED_CODES } from '../src/lib/obd/dtc/authored';
import { CATALOG_SOURCE_ENTRY_COUNT, DTC_CATALOG } from '../src/lib/obd/dtc/catalog';
import { isValidCode } from '../src/lib/obd/dtc/derive/parse';
import { parseDtcList } from '../src/lib/obd/dtc/parser';
import { resolveDtcDetail } from '../src/lib/obd/dtc/resolve';
import { PID_DEFINITIONS } from '../src/lib/obd/pids';
import { PROTOCOL_NAMES, PROTOCOL_SWEEP, describeProtocolReply } from '../src/lib/obd/protocols';
import {
  extractPayload,
  indicatesControllerFault,
  markerOffset,
  parseResponse,
} from '../src/lib/obd/protocol';
import { acceptsReply, linkReplyHealth, type LinkReplyHealth } from '../src/lib/obd/reply-match';
import {
  addressingFor,
  admitsResponse,
  sweepLinkSettings,
  sweepTargets,
} from '../src/lib/obd/uds/addressing';
import { decodeKwpFault, decodeUdsFault, faultLabel } from '../src/lib/obd/uds/faults';
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
import { classifyModule } from '../src/lib/obd/uds/classify';
import { PART_LABELS, PART_ORDER } from '../src/lib/obd/uds/parts';
import {
  foldScanIntoMap,
  groupByPart,
  mapAppliesTo,
  mergeAfterVerify,
  type DiscoveredModule,
  type ModuleMap,
} from '../src/features/scan/lib/module-map';
import { MAX_CONSECUTIVE_ADAPTER_THROWS, adapterLikelyDead } from '../src/features/scan/lib/run-scan';
import {
  UNITS,
  UNIT_PRESETS,
  convertRange,
  formatMeasurement,
  gaugeFraction,
  type UnitId,
  type UnitPreferences,
} from '../src/lib/units';

let failures = 0;
const fail = (message: string) => {
  failures += 1;
  console.error(`  FAIL  ${message}`);
};
const section = (name: string) => console.log(`\n${name}`);

// ── 1. Conversion round-trips ────────────────────────────────────────────────
section('Unit conversions round-trip');
for (const id of Object.keys(UNITS) as UnitId[]) {
  const spec = UNITS[id];
  for (const value of [-40, 0, 1, 37.5, 100, 6553.5]) {
    const back = spec.toBase(spec.fromBase(value));
    if (Math.abs(back - value) > 1e-9) fail(`${id}: ${value} -> ${back}`);
  }
}
console.log(`  checked ${Object.keys(UNITS).length} units`);

// ── 2. Known reference values ────────────────────────────────────────────────
section('Known conversions');
const near = (label: string, actual: number, expected: number, tol = 0.005) => {
  if (Math.abs(actual - expected) > tol) fail(`${label}: got ${actual}, expected ${expected}`);
};
near('0 °C -> °F', UNITS.degF.fromBase(0), 32);
near('100 °C -> °F', UNITS.degF.fromBase(100), 212);
near('-40 °C -> °F', UNITS.degF.fromBase(-40), -40);
near('100 km/h -> mph', UNITS.mph.fromBase(100), 62.137);
near('100 kPa -> psi', UNITS.psi.fromBase(100), 14.504);
near('100 kPa -> bar', UNITS.bar.fromBase(100), 1);
near('10 L/h -> US gal/h', UNITS.galUSph.fromBase(10), 2.642);
near('10 L/h -> imp gal/h', UNITS.galUKph.fromBase(10), 2.2);
near('100 N·m -> lb-ft', UNITS.lbft.fromBase(100), 73.756);
near('10 g/s -> lb/min', UNITS.lbpm.fromBase(10), 1.323);
near('120 s -> min', UNITS.min.fromBase(120), 2);

// ── 3. Gauge fraction is invariant under conversion ──────────────────────────
section('Gauge geometry is conversion-invariant');
const systems: UnitPreferences[] = [
  { system: 'metric', ...UNIT_PRESETS.metric },
  { system: 'imperial', ...UNIT_PRESETS.imperial },
  { system: 'us', ...UNIT_PRESETS.us },
];
for (const definition of PID_DEFINITIONS) {
  const raw = definition.min + (definition.max - definition.min) * 0.37;
  const rawFraction = gaugeFraction(definition, raw);
  for (const prefs of systems) {
    const range = convertRange(definition, prefs);
    const converted = formatMeasurement(definition, raw, prefs).value;
    const span = range.max - range.min;
    if (Math.abs(span) < 1e-9) continue;
    const convertedFraction = (converted - range.min) / span;
    if (Math.abs(convertedFraction - rawFraction) > 0.01) {
      fail(
        `${definition.pid} ${definition.name} in ${prefs.system}: raw ${rawFraction.toFixed(4)} vs converted ${convertedFraction.toFixed(4)}`,
      );
    }
  }
}
console.log(`  checked ${PID_DEFINITIONS.length} PIDs across ${systems.length} unit systems`);

// ── 4. Every PID formats without producing junk ──────────────────────────────
section('PID formatting');
for (const definition of PID_DEFINITIONS) {
  for (const prefs of systems) {
    for (const value of [definition.min, 0, definition.max]) {
      const measurement = formatMeasurement(definition, value, prefs);
      if (!Number.isFinite(measurement.value)) fail(`${definition.pid} produced ${measurement.value}`);
      if (/NaN|Infinity|undefined/.test(measurement.full)) fail(`${definition.pid} -> "${measurement.full}"`);
      if (measurement.text.length > 12) fail(`${definition.pid} -> overlong "${measurement.text}"`);
    }
  }
  if (definition.quantity === undefined) fail(`${definition.pid} has no quantity`);
  if (definition.group === undefined) fail(`${definition.pid} has no group`);
}
console.log(`  checked ${PID_DEFINITIONS.length} PIDs`);

// ── 5. Hand-written entries are well formed ──────────────────────────────────
section('Authored entries');
for (const code of AUTHORED_CODES) {
  if (!isValidCode(code)) fail(`${code} is not a valid DTC`);
  const entry = AUTHORED[code];
  if (entry.meaning.length < 120) fail(`${code}: meaning is thin`);
  if (entry.causes.length < 2) fail(`${code}: needs at least two causes`);
  if (entry.fixes.length < 2) fail(`${code}: needs at least two fixes`);
  if (entry.symptoms.length < 2) fail(`${code}: needs at least two symptoms`);
  // Causes are meant to be ranked, so the first one should be the likely one.
  if (entry.causes[0].likelihood !== 'common') fail(`${code}: first cause is not "common"`);
  for (const related of entry.related ?? []) {
    if (!isValidCode(related)) fail(`${code}: related "${related}" is not a valid code`);
  }
}
console.log(`  ${AUTHORED_CODES.length} authored entries`);

// ── 5b. Every catalog code says what it actually means ───────────────────────
section('Catalog briefs');

const catalogCodes = Object.keys(DTC_CATALOG);

// The catalog is assembled from range files by spreading. A code defined in two
// of them would be silently won by whichever spread came last, taking the other
// description with it and never showing up as a failure anywhere else.
if (catalogCodes.length !== CATALOG_SOURCE_ENTRY_COUNT) {
  fail(
    `${CATALOG_SOURCE_ENTRY_COUNT - catalogCodes.length} code(s) are defined in more than one catalog file`,
  );
}

const seenBriefs = new Map<string, string>();
for (const code of catalogCodes) {
  const entry = DTC_CATALOG[code];
  if (!isValidCode(code)) fail(`${code} is not a valid DTC`);
  if (!entry.title) fail(`${code}: no title`);

  // The brief has one job: say what this code means without being an essay.
  // Too short and it is another restatement of the title; too long and it is
  // the "what it means" section, which already exists below it.
  if (entry.brief.length < 60) fail(`${code}: brief is too thin (${entry.brief.length} chars)`);
  if (entry.brief.length > 300) fail(`${code}: brief is an essay (${entry.brief.length} chars)`);
  if (!/[.!]$/.test(entry.brief.trim())) fail(`${code}: brief does not end in a sentence`);

  // A brief that repeats the SAE wording explains nothing — that wording is
  // already on screen as the heading, and is the reason people search the code.
  if (entry.brief.toLowerCase().includes(entry.title.toLowerCase())) {
    fail(`${code}: brief just restates the title`);
  }

  // Two codes sharing a brief means at least one of them is not being told
  // apart from its neighbour, which is the whole value of having them listed.
  const twin = seenBriefs.get(entry.brief);
  if (twin) fail(`${code} and ${twin} share the same brief`);
  seenBriefs.set(entry.brief, code);

  if (entry.risk && entry.risk.note.length < 40) fail(`${code}: risk override has no justification`);
}
console.log(`  ${catalogCodes.length} catalog entries, ${Object.values(DTC_CATALOG).filter((e) => e.risk).length} with an urgency override`);

// ── 6. No code is ever just a number ─────────────────────────────────────────
section('Every trouble code resolves to a real explanation');

const sample: string[] = [];
for (const letter of ['P', 'C', 'B', 'U']) {
  for (const type of [0, 1, 2, 3]) {
    for (let n = 0; n < 0x1000; n += 0x53) {
      sample.push(`${letter}${type}${n.toString(16).toUpperCase().padStart(3, '0')}`);
    }
  }
}
const codes = [...new Set([...Object.keys(DTC_CATALOG), ...sample])];

let authored = 0;
let catalog = 0;
let derived = 0;
let family = 0;

for (const code of codes) {
  const detail = resolveDtcDetail(code);
  if (detail.confidence === 'authored') authored += 1;
  else if (detail.confidence === 'catalog') catalog += 1;
  else if (detail.confidence === 'derived') derived += 1;
  else family += 1;

  if (!detail.title || detail.title.length < 4) fail(`${code}: empty title`);
  if (!detail.meaning || detail.meaning.length < 60) fail(`${code}: thin meaning (${detail.meaning.length} chars)`);
  if (!detail.driveNote || detail.driveNote.length < 20) fail(`${code}: no drive advice`);
  if (detail.causes.length === 0) fail(`${code}: no causes`);
  if (detail.fixes.length === 0) fail(`${code}: no fixes`);
  if (detail.symptoms.length === 0) fail(`${code}: no symptoms`);
  if (/undefined|NaN|\[object/.test(detail.meaning + detail.title)) fail(`${code}: junk in text`);
}
console.log(`  ${codes.length} codes resolved`);
console.log(`  authored ${authored} · SAE named ${catalog} · derived ${derived} · family ${family}`);

// ── 7. Derived loci are correct ──────────────────────────────────────────────
section('Derived positions');
const expectLocus = (code: string, expected: string) => {
  const detail = resolveDtcDetail(code);
  if (detail.locus !== expected) fail(`${code}: locus "${detail.locus}", expected "${expected}"`);
};
expectLocus('P0301', 'Cylinder 1');
expectLocus('P0308', 'Cylinder 8');
expectLocus('P030C', 'Cylinder 12'); // hex digit C, not decimal
expectLocus('P0201', 'Cylinder 1');
expectLocus('P020C', 'Cylinder 12');
expectLocus('P0351', 'Cylinder 1');
expectLocus('P035A', 'Cylinder 10');
expectLocus('P0671', 'Cylinder 1');
expectLocus('P0130', 'Bank 1 · Sensor 1');
expectLocus('P0141', 'Bank 1 · Sensor 2');
expectLocus('P0147', 'Bank 1 · Sensor 3');
expectLocus('P0155', 'Bank 2 · Sensor 1');
expectLocus('P0161', 'Bank 2 · Sensor 2');
expectLocus('P0167', 'Bank 2 · Sensor 3');

// The SAE wording wins the title where the catalog has one; the derived module
// name has to show up in the body text instead.
const u0100 = resolveDtcDetail('U0100');
if (u0100.title !== DTC_CATALOG.U0100.title) fail(`U0100 should use the SAE title, got "${u0100.title}"`);
if (!u0100.meaning.includes('engine control module')) fail('U0100 meaning does not name the module');

const u0121 = resolveDtcDetail('U0121');
if (!u0121.meaning.includes('ABS control module')) fail(`U0121 meaning: ${u0121.meaning}`);
if (u0121.severity !== 'serious') fail(`U0121 should be serious, got ${u0121.severity}`);

// A U-code outside the published numbering must stay vague rather than guess.
const u012a = resolveDtcDetail('U012A');
if (u012a.meaning.includes('ABS')) fail('U012A should not claim a module name');

// Hand-written entries outrank both rules and the catalog.
if (resolveDtcDetail('P0300').confidence !== 'authored') fail('P0300 should be authored');
if (resolveDtcDetail('P0420').confidence !== 'authored') fail('P0420 should be authored');
// P0301 has no authored entry but does have a rule and an SAE title.
if (resolveDtcDetail('P0301').confidence !== 'catalog') fail('P0301 should resolve from the catalog tier');

// ── 7b. A named code explains itself, not its neighbourhood ──────────────────
section('Named codes read as the code, not the family');

// This is the regression the catalog briefs exist to stop. A code with no rule
// of its own used to be described by pasting the SAE title in front of a
// paragraph about the whole hundred-block, which named the right corner of the
// car and never the fault — so the screen was read and the code was then looked
// up online anyway.
for (const code of ['P0108', 'P0116', 'P0452', 'P0741', 'P2015']) {
  const detail = resolveDtcDetail(code);
  if (detail.meaning !== DTC_CATALOG[code].brief) {
    fail(`${code} is not being explained by its own catalog line`);
  }
  if (/Codes in this range/.test(detail.meaning)) fail(`${code} still falls back to the family paragraph`);
}

// The family's urgency is a fair guess for most of a block and dangerous for a
// few. These are the few: emissions codes default to "safe to drive", and a
// dead cooling fan is not, while a P05xx default of "moderate" is not what
// somebody with no oil pressure needs to read.
const expectUrgency = (code: string, severity: string, drive: string) => {
  const detail = resolveDtcDetail(code);
  if (detail.severity !== severity || detail.drive !== drive) {
    fail(`${code} resolved as ${detail.severity}/${detail.drive}, expected ${severity}/${drive}`);
  }
};

expectUrgency('P0480', 'serious', 'drive-with-care'); // cooling fan, in the emissions block
expectUrgency('P0524', 'critical', 'stop-now'); // oil pressure too low
expectUrgency('P0217', 'critical', 'stop-now'); // engine has actually overheated
expectUrgency('P0094', 'serious', 'limp-to-shop'); // fuel leaking near a hot engine
expectUrgency('P0563', 'serious', 'limp-to-shop'); // charging system over-voltage
expectUrgency('P0452', 'minor', 'safe-to-drive'); // vapour system fault really is minor
// The compressor relay is an engine computer output, so it inherited a block
// default about the engine protecting itself by limiting power. Losing air
// conditioning is not that, and telling somebody to make short trips only
// because their cabin is warm is the same failure as the cooling fan, inverted.
expectUrgency('P0645', 'minor', 'safe-to-drive');
expectUrgency('P0534', 'minor', 'safe-to-drive');

// P2xxx is its own block, not a continuation of P0xxx. Reading it through the
// P0 table filed every particulate filter code under "fuel and air metering".
if (resolveDtcDetail('P2002').system !== 'emissions') {
  fail(`P2002 is a particulate filter code, resolved as ${resolveDtcDetail('P2002').system}`);
}
if (resolveDtcDetail('P2463').system !== 'emissions') fail('P2463 should be an emissions code');
if (resolveDtcDetail('P0171').system !== 'fuel-air') fail('P0171 should still be a fuel and air code');

// A nonsense string must not throw.
const junk = resolveDtcDetail('hello');
if (junk.title !== 'Not a trouble code') fail(`junk input gave "${junk.title}"`);

// ── 8. Each control unit's reply is read on its own ──────────────────────────
section('Trouble codes are read per control unit');

/** Runs the real pipeline: raw adapter text -> frames -> codes. */
const codesFrom = (raw: string, responseMode: string): string => {
  const response = parseResponse(raw);
  if (!response.ok) return `!${response.reason}`;
  return parseDtcList(response.frames, responseMode)
    .map((dtc) => dtc.code)
    .join(',');
};

const expectCodes = (label: string, raw: string, responseMode: string, expected: string) => {
  const actual = codesFrom(raw, responseMode);
  if (actual !== expected) fail(`${label}: got "${actual}", expected "${expected}"`);
};

// A single unit reporting nothing has always worked; the rest used to invent
// faults on a car whose warning light is off.
expectCodes('one unit, no codes', '43 00 \r\r', '43', '');
expectCodes('two units, no codes', '4300\r4300\r\r', '43', '');
expectCodes('three units, no codes', '4300\r4300\r4300\r\r', '43', '');
expectCodes('two units, no codes, CAN padding', '4300000000\r4300000000\r\r', '43', '');
expectCodes('pending, two units, none', '4700\r4700\r\r', '47', '');
expectCodes('permanent, two units, none', '4A00\r4A00\r\r', '4A', '');

expectCodes('one unit, one code', '43010301\r\r', '43', 'P0301');
expectCodes('two units, only one faulted', '43010301\r4300\r\r', '43', 'P0301');
expectCodes('two units, one code each', '43010301\r43010420\r\r', '43', 'P0301,P0420');
expectCodes('the same code from two units', '43010301\r43010301\r\r', '43', 'P0301');

// Formats that already worked and must keep working.
expectCodes('ISO 9141, no count byte', '43 03 01 04 20 \r\r', '43', 'P0301,P0420');
expectCodes(
  'CAN multi-frame, four codes',
  '008\r0:430401330171\r1:042005000000\r\r',
  '43',
  'P0133,P0171,P0420,P0500',
);
expectCodes('echo left on, separate line', '03\r4300\r\r', '43', '');
expectCodes('echo left on, same line', '034300\r\r', '43', '');
expectCodes('no codes at all', 'NO DATA\r\r', '43', '!No data');
expectCodes('the car refuses the service', '7F0311\r\r', '43', '!The car does not support this service');

// Frames must actually be kept apart, not merely produce the right codes.
const twoUnits = parseResponse('4300\r4300\r\r');
if (!twoUnits.ok || twoUnits.frames.length !== 2) {
  fail(`two units should give two frames, got ${twoUnits.ok ? twoUnits.frames.length : 'an error'}`);
}
const multiFrame = parseResponse('008\r0:430401330171\r1:042005000000\r\r');
if (!multiFrame.ok || multiFrame.frames.length !== 1) {
  fail(`one unit's multi-frame answer should stay one frame, got ${multiFrame.ok ? multiFrame.frames.length : 'an error'}`);
}

// ── 9. Markers are found at byte boundaries only ─────────────────────────────
section('Payload markers are byte-aligned');
if (markerOffset('4300', '43') !== 0) fail('marker at the start was not found');
if (markerOffset('1430', '43') !== -1) fail('a marker straddling two bytes was accepted');
if (markerOffset('143043', '43') !== 4) fail('the aligned marker after a straddling one was missed');
if (extractPayload('1430', '43') !== null) fail('extractPayload accepted a mid-byte marker');
if (extractPayload('410C1AF8', '41', '0C')?.join(',') !== '26,248') {
  fail('extractPayload no longer reads an ordinary mode 01 reply');
}

// ── 10. A reply must answer the command that is waiting ──────────────────────
section('Replies are matched to their command');

const expectMatch = (cmd: string, raw: string, expected: boolean) => {
  if (acceptsReply(cmd, raw) !== expected) {
    fail(`acceptsReply(${JSON.stringify(cmd)}, ${JSON.stringify(raw)}) should be ${expected}`);
  }
};

// The stray messages that used to shift every later reply one command behind.
expectMatch('010C', '', false);
expectMatch('010C', '\r\r', false);
expectMatch('010C', '410B62', false);
expectMatch('0101', '4100BE3EA813', false);

expectMatch('010C', '410C1AF8', true);
expectMatch('010C', '010C\r410C1AF8', true);
expectMatch('010C', 'NO DATA', true);
expectMatch('010C', '?', true);
expectMatch('010C', 'SEARCHING...\r410C1AF8', true);
expectMatch('010C', '7F0112', true);
// A refusal naming a different service is answering a different command.
expectMatch('010C', '7F0312', false);
expectMatch('0101', '41010007E5E5', true);
expectMatch('010C', '410C1AF8\r410C1AF8', true);

expectMatch('03', '4300', true);
expectMatch('03', '43010301', true);
expectMatch('03', 'NO DATA', true);
expectMatch('03', '410C1AF8', false);
// PID 0x43 is absolute load. Its reply contains `43` at a byte boundary, and
// reading that as a stored-code list is exactly how a phantom fault appears.
expectMatch('03', '414300', false);
expectMatch('07', '4300', false);

expectMatch('0902', '014\r0:490201314434\r1:47503030523535', true);
expectMatch('04', 'OK', true);
expectMatch('04', '44', true);

expectMatch('ATE0', 'OK', true);
expectMatch('ATZ', 'ELM327 v1.5', true);
expectMatch('ATE0', '', false);
expectMatch('ATDPN', 'A6', true);

// ── 11. Adapter status messages are never read as data ───────────────────────
section('Adapter status messages are not mistaken for payload');

const expectFailure = (raw: string, expected: string) => {
  const response = parseResponse(raw);
  if (response.ok) {
    fail(`${JSON.stringify(raw)} decoded as payload "${response.hex}" instead of a failure`);
  } else if (response.reason !== expected) {
    fail(`${JSON.stringify(raw)}: reason "${response.reason}", expected "${expected}"`);
  }
};

// A K-line car that fails its initialisation says so in words. Stripping the
// non-hex characters out of those words used to leave `E`, which parsed as a
// successful — and completely invented — payload.
expectFailure('BUS INIT: ERROR\r\r', 'The car did not answer the adapter');
expectFailure('BUS INIT: ...ERROR\r\r', 'The car did not answer the adapter');
expectFailure('BUS INIT:ERROR\r\r', 'The car did not answer the adapter');
expectFailure('BUFFER FULL\r\r', 'Reply too long for the adapter');
expectFailure('ERR94\r\r', 'Adapter internal error ERR94');
expectFailure('<RX ERROR\r\r', 'Garbled reply');
expectFailure('LP ALERT\r\r', 'Adapter going to sleep');
expectFailure('ACT ALERT\r\r', 'Adapter idle');

// The successful form of the same K-line message still carries its payload.
const busInitOk = parseResponse('BUS INIT: OK\r4100BE3EB811\r\r');
if (!busInitOk.ok || busInitOk.hex !== '4100BE3EB811') {
  fail(`a successful bus init should still decode: ${JSON.stringify(busInitOk)}`);
}

/** The status messages that used to be discarded rather than read as answers. */
const ADAPTER_STATUS = ['BUS INIT: ERROR', 'BUFFER FULL', 'ERR94', '<RX ERROR', 'LP ALERT'];

// Each one is an answer to the command that is waiting, not a stray message to
// discard — being discarded is what made the app sit through its whole timeout
// instead of reporting what the adapter had already told it.
for (const raw of ADAPTER_STATUS) expectMatch('0100', raw, true);

section('Adapter failures trigger link recovery');

const expectLinkHealth = (cmd: string, raw: string, expected: LinkReplyHealth) => {
  if (linkReplyHealth(cmd, raw) !== expected) {
    fail(`linkReplyHealth(${JSON.stringify(cmd)}, ${JSON.stringify(raw)}) should be ${expected}`);
  }
};

expectLinkHealth('010C', 'NO DATA', 'failure');
expectLinkHealth('020C00', 'NO DATA', 'neutral');
expectLinkHealth('03', 'NO DATA', 'neutral');
expectLinkHealth('010D', 'CAN ERROR', 'failure');
expectLinkHealth('0105', 'STOPPED', 'failure');
expectLinkHealth('0104', 'LV RESET', 'failure');
expectLinkHealth('010C', '410C1AF8', 'healthy');
expectLinkHealth('010C', '7F0112', 'healthy');
expectLinkHealth('ATZ', '?', 'neutral');

// A link that cannot initialise or has gone out of step is broken, not healthy.
for (const raw of ADAPTER_STATUS) expectLinkHealth('0100', raw, 'failure');

section('A wedged controller is the adapter, not the car');

const expectControllerFault = (raw: string, wedging: boolean) => {
  const response = parseResponse(raw);
  if (response.ok) return fail(`${JSON.stringify(raw)} should decode as a failure`);
  if (indicatesControllerFault(response.reason) !== wedging) {
    fail(`${JSON.stringify(raw)} ("${response.reason}") should be a controller fault: ${wedging}`);
  }
};

// The chip reporting that it transmitted and nothing acknowledged it. That
// drops its controller off the bus, where it stays: every protocol tried
// afterwards gets the same message back, K-line and J1850 included, which have
// no CAN in them at all. Only a reset changes that, so the sweep has to know
// this is the adapter's news and not the car's.
expectControllerFault('CAN ERROR\r\r', true);
expectControllerFault('BUS ERROR\r\r', true);
expectControllerFault('LV RESET\r\r', true);

// A car declining to answer is not the adapter breaking. Resetting the chip on
// any of these would throw away a sweep that is working and add a reset's worth
// of waiting to every protocol left in it.
expectControllerFault('NO DATA\r\r', false);
expectControllerFault('BUS INIT: ERROR\r\r', false);
expectControllerFault('UNABLE TO CONNECT\r\r', false);
expectControllerFault('BUS BUSY\r\r', false);
expectControllerFault('STOPPED\r\r', false);
expectControllerFault('BUFFER FULL\r\r', false);
expectControllerFault('7F0112\r\r', false);

// The sweep clears a wedge by resetting the chip, and there has to be enough
// budget to do it after each CAN protocol that can wedge — otherwise the last
// ones are still being tried on a controller that fell off the bus during the
// first, which is the whole failure this exists to stop. The plan's own restart
// covers the handover to the older buses, so the CAN block needs one fewer.
const canProtocols = PROTOCOL_SWEEP.filter((protocol) => protocol.bus === 'CAN').length;
if (MAX_CONTROLLER_RESETS < canProtocols - 1) {
  fail(
    `${MAX_CONTROLLER_RESETS} resets cannot give each of ${canProtocols} CAN protocols a clean chip`,
  );
}
// Each reset costs a full reconfiguration, so they are not free to hand out.
if (MAX_CONTROLLER_RESETS > canProtocols) {
  fail(`${MAX_CONTROLLER_RESETS} resets would add a reconfiguration to a sweep that is already long`);
}

// ── 12. Protocols can be named one at a time ─────────────────────────────────
section('Protocol sweep is well formed');

const seen = new Set<string>();
for (const protocol of PROTOCOL_SWEEP) {
  if (!/^[1-9A-C]$/.test(protocol.id)) fail(`protocol "${protocol.id}" is not an ELM327 protocol`);
  if (seen.has(protocol.id)) fail(`protocol ${protocol.id} is swept twice`);
  seen.add(protocol.id);
  if (protocol.name !== PROTOCOL_NAMES[protocol.id]) fail(`protocol ${protocol.id} has two names`);
  if (protocol.attempts < 1) fail(`protocol ${protocol.id} is never actually asked`);
  if (protocol.probeTimeoutMs * protocol.attempts < 4000) {
    fail(`protocol ${protocol.id} is given no time to initialise`);
  }
}

// A bus that has to be brought up before it carries anything gets asked twice.
// One request is not a test of a K-line protocol: the adapter spends the whole
// of it on the initialisation handshake, and the car it belonged to is written
// off having never been sent a question.
for (const protocol of PROTOCOL_SWEEP) {
  if (protocol.bus === 'K-line' && protocol.attempts < 2) {
    fail(`${protocol.name} gets one go, which the bus init consumes`);
  }
}

// The 11-bit 500 kbps CAN bus fitted to nearly every car since 2008 is the one
// worth trying first; the slow K-line protocols cost seconds each, so they come
// after everything cheap has been ruled out.
if (PROTOCOL_SWEEP[0].id !== '6') fail('the sweep should start with CAN 11-bit 500 kbps');
const kLineAt = PROTOCOL_SWEEP.findIndex((protocol) => protocol.id === '3');
const canAt = PROTOCOL_SWEEP.findIndex((protocol) => protocol.id === '9');
if (kLineAt < canAt) fail('the slow K-line protocols are being tried before the CAN ones');

// Every protocol an ELM327 can report has to have a name, or the connection
// report ends up telling the driver their car speaks "protocol 9".
for (const id of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C']) {
  if (!PROTOCOL_NAMES[id]) fail(`protocol ${id} has no name`);
}

const expectDescribed = (reply: string, expected: string | null) => {
  const actual = describeProtocolReply(reply);
  if (actual !== expected) fail(`describeProtocolReply(${JSON.stringify(reply)}) gave ${actual}`);
};

expectDescribed('6', 'CAN 11-bit, 500 kbps');
expectDescribed('A6', 'CAN 11-bit, 500 kbps'); // found by auto-detection
expectDescribed('A3\r\r', 'ISO 9141-2');
expectDescribed('3', 'ISO 9141-2');
expectDescribed('A0', null); // auto-detection still searching
expectDescribed('?', null);
expectDescribed('', null);

// ── 13. The car is reached by a plan, not by one guess ───────────────────────
section('Handshake plan');

const cold = buildHandshakePlan(null);

// Auto-detection gets the first two goes, and neither may be abandoned early:
// an ELM327 asked to find the protocol itself is routinely still searching when
// the first request times out, and that silence is progress, not a dead link.
if (cold[0].select !== null || cold[1].select !== null) {
  fail('the plan should open by using whatever protocol is already armed');
}
if (cold[0].abandonable || cold[1].abandonable) {
  fail('a still-running protocol search must not be read as a dead adapter');
}
if (cold[0].timeoutMs <= 15000) {
  fail(`auto-detection is given ${cold[0].timeoutMs}ms, too little to walk the slow protocols`);
}

// Then every bus by name. This is the whole point: one guess from the cheapest
// chip in the chain is not a connection strategy.
const swept = cold.filter((step) => step.select !== null).map((step) => step.select);
if (swept.length !== PROTOCOL_SWEEP.length) {
  fail(`the plan names ${swept.length} protocols, the sweep has ${PROTOCOL_SWEEP.length}`);
}
if (swept.join('') !== PROTOCOL_SWEEP.map((protocol) => protocol.id).join('')) {
  fail(`the plan tries protocols in the wrong order: ${swept.join('')}`);
}
for (const step of cold.filter((entry) => entry.select !== null)) {
  if (!step.abandonable) fail(`${step.label} would keep waiting on an adapter that has gone quiet`);
  if (!step.label.includes(PROTOCOL_NAMES[step.select as string])) {
    fail(`${step.label} does not say which protocol is being tried`);
  }
}

// The adapter is restarted once, on the way from the CAN protocols to the older
// buses. A chip whose CAN controller has dropped off the bus answers CAN ERROR
// to every protocol after it — K-line and J1850 included, which have no CAN in
// them at all — so without this the sweep reports a car that "never answered on
// any protocol" when nothing after the first failure was genuinely tried.
const restarts = cold.filter((step) => step.restart);
if (restarts.length !== 1) fail(`the plan restarts the adapter ${restarts.length} times, expected once`);
if (restarts[0]?.select !== null) {
  fail('the probe after a restart should search, not name a protocol the chip has just forgotten');
}

const restartAt = cold.findIndex((step) => step.restart);
const lastCanAt = cold.map((step) => step.select).lastIndexOf('9');
const firstKLineAt = cold.map((step) => step.select).indexOf('5');
if (!(restartAt > lastCanAt && restartAt < firstKLineAt)) {
  fail('the restart is not sitting between the CAN protocols and the older buses');
}

// A car that has already answered goes straight back to the bus it answered on,
// and does not get asked about it a third time further down the plan.
const warm = buildHandshakePlan('3');
if (!warm[0].label.includes('ISO 9141-2')) fail(`a known protocol should be named: ${warm[0].label}`);
if (warm.some((step) => step.select === '3')) fail('the known protocol is swept as well as armed');
if (warm.length !== cold.length - 1) fail('a known protocol should save exactly one step');
if (warm.filter((step) => step.restart).length !== 1) fail('a warm plan lost its restart');

// A failed attempt has to end. Somebody sitting in a car with the adapter in
// their glovebox should get an answer inside a couple of minutes, not sit
// through every timeout the protocol list can offer.
const worst = worstCaseDuration(cold);
if (worst > 120000) fail(`a hopeless connection would take ${Math.round(worst / 1000)}s to fail`);
console.log(`  ${cold.length} steps, at most ${Math.round(worst / 1000)}s before giving up`);

// ── 13b. A dropped adapter must not take the evidence with it ────────────────
section('A dropped adapter keeps the report of what just failed');

const failedAttempt = {
  ...IDLE_STATE,
  status: 'error' as const,
  adapter: 'ready' as const,
  ecu: 'failed' as const,
  error: 'The car never answered, on any protocol (last: Adapter could not reach the ECU).',
  log: ['Contacting ECU: no answer', 'Trying CAN 11-bit, 500 kbps: CAN bus error'],
};

// The drop lands seconds after the sweep gives up and long before anyone has
// walked to the Adapter screen to read it. Resetting to the idle state took the
// trace with it, so the log was reliably empty by the time it was opened — and
// every attempt to fix a car that would not answer was made blind because of
// it. The report of the attempt that just failed has to survive the drop.
const dropped = stateAfterAdapterDropped(failedAttempt);
if (dropped.log.length !== failedAttempt.log.length) {
  fail(`a drop threw away ${failedAttempt.log.length - dropped.log.length} lines of the report`);
}
if (dropped.status !== 'error') fail('a dropped adapter should read as an error');

// A diagnosis already made says more than the drop that followed it, so it is
// not overwritten by the generic message.
if (dropped.error !== failedAttempt.error) {
  fail(`the diagnosis was replaced with "${dropped.error}"`);
}

// A link that was working and simply fell out has no diagnosis to keep, and
// still has to say something.
const wasConnected = { ...IDLE_STATE, status: 'connected' as const, adapter: 'ready' as const };
const fellOut = stateAfterAdapterDropped(wasConnected);
if (!fellOut.error) fail('a drop from a healthy link reported nothing at all');
if (fellOut.status !== 'error') fail('a drop from a healthy link should read as an error');

// Nothing about the previous link may survive as though it were still live.
if (fellOut.protocol !== null || fellOut.supportedPids.length !== 0) {
  fail('a dropped link left its protocol or sensor list looking current');
}

// ── 14. Every plugged-in adapter gets a turn ─────────────────────────────────
section('Adapter candidates');

const dev = (name: string, address: string) => ({ name, address });
const order = (devices: Array<{ address: string }>) => devices.map((device) => device.address).join(',');

const pairedLot = [dev('Car Stereo', 'AA'), dev('OBDII', 'BB'), dev('Vgate iCar Pro', 'CC')];

// Names that read as an adapter lead, in the order they were paired, and the
// rest follow rather than being dropped.
if (order(rankAdapterCandidates(pairedLot)) !== 'BB,CC,AA') {
  fail(`ranking gave ${order(rankAdapterCandidates(pairedLot))}`);
}
if (order(rankAdapterCandidates([dev('Mystery', 'AA')])) !== 'AA') {
  fail('a single paired device should be tried whatever its name');
}

// Nothing is remembered any more, so a first connection and a hundredth take
// exactly the same path — running twice must not change the answer.
if (order(rankAdapterCandidates(pairedLot)) !== order(rankAdapterCandidates(pairedLot))) {
  fail('ranking is not repeatable, so some state survived a connection');
}

// An adapter fresh out of the box can call itself anything, and refusing to
// dial it is the app declining to try the only device that would have worked.
const oddOnesOut = [dev('Car Stereo', 'AA'), dev('BT-04A', 'BB')];
if (order(rankAdapterCandidates(oddOnesOut)) !== 'AA,BB') {
  fail(`an unrecognised name must still get a turn: ${order(rankAdapterCandidates(oddOnesOut))}`);
}
if (rankAdapterCandidates([]).length !== 0) fail('nothing paired should rank nothing');

if (!looksLikeObdAdapter(dev('V-LINK scan tool', 'AA'))) fail('name matching lost its separators tolerance');
if (looksLikeObdAdapter(dev('Headset', 'AA'))) fail('a headset now reads as an adapter');

// ── 15. Bluetooth failures reach the screen in plain language ────────────────
section('Bluetooth errors are readable');

const javaRead = humanizeBluetoothError(
  'java.io.IOException: read failed, socket might closed or timeout, read ret: -1',
);
if (/java|IOException|ret: -1/i.test(javaRead)) fail(`java leaked through: "${javaRead}"`);
if (!/adapter/i.test(javaRead)) fail(`socket failure is not actionable: "${javaRead}"`);

const permission = humanizeBluetoothError('java.lang.SecurityException: Need BLUETOOTH_CONNECT permission');
if (/java\.|SecurityException/.test(permission)) fail(`class name survived: "${permission}"`);
if (!permission.includes('BLUETOOTH_CONNECT')) fail(`the useful part was lost: "${permission}"`);

if (humanizeBluetoothError('The car never answered') !== 'The car never answered') {
  fail('ordinary messages must pass through untouched');
}

// ── 16. The adapter is told to wait as long as a workshop tool would ─────────
section('Reply window');

const replyWindow = ADAPTER_INIT_SEQUENCE.find((step) => step.cmd.startsWith('ATST'));
if (!replyWindow) {
  fail('nothing sets the reply deadline, so clones keep their 200ms default');
} else {
  const ms = Number.parseInt(replyWindow.cmd.slice(4), 16) * 4.096;
  if (ms < 400) fail(`a ${Math.round(ms)}ms window is still too short for a slow ECU`);
  if (ms > 1100) fail(`a ${Math.round(ms)}ms window makes every silent probe crawl`);
}
if (!ADAPTER_INIT_SEQUENCE.some((step) => step.cmd === ADAPTIVE_TIMING.cmd)) {
  fail('adaptive timing must stay on so a fast car is not slowed to the ceiling');
}

// Adaptive timing is the wrong setting while still looking for a car: the CAN
// probes that fail in milliseconds teach the adapter a deadline far too short
// for the K-line ECU tried a few steps later, and that ECU then reads as NO DATA
// on the very bus it speaks. The sweep pins the window open and hands it back.
if (FIXED_TIMING.cmd !== 'ATAT0') fail(`${FIXED_TIMING.cmd} does not fix the reply window`);
if (ADAPTIVE_TIMING.cmd !== 'ATAT1') fail(`${ADAPTIVE_TIMING.cmd} does not restore adaptive timing`);
if (PROTOCOL_CLOSE.cmd !== 'ATPC') fail(`${PROTOCOL_CLOSE.cmd} does not close the open protocol`);

// A K-line ECU answers the wake-up with two keyword bytes, and an adapter left
// to vet them drops any car whose pair is not the one the standard prescribes —
// reporting UNABLE TO CONNECT, the same thing it says about a car that never
// answered at all. PSA cars are the notorious case. The check has to be off
// before any protocol is tried, or the sweep rules out buses the car speaks.
const keywordStep = ADAPTER_INIT_SEQUENCE.findIndex((step) => step.cmd === KEYWORD_CHECK_OFF);
if (keywordStep === -1) {
  fail('nothing relaxes keyword checking, so a non-standard K-line ECU is dropped');
}
const protocolArmed = ADAPTER_INIT_SEQUENCE.findIndex((step) => step.cmd.startsWith('ATSP'));
if (protocolArmed !== -1 && keywordStep > protocolArmed) {
  fail('keyword checking is relaxed after a protocol is already armed');
}

// Every protocol has to be given long enough to reach a verdict. Both J1850
// probes used to run out of time with the adapter still working, which reports
// a protocol as tried when nothing was learned about it either way.
for (const protocol of PROTOCOL_SWEEP) {
  if (protocol.probeTimeoutMs < 5000 && protocol.bus !== 'CAN') {
    fail(`${protocol.name} gets ${protocol.probeTimeoutMs}ms, too little to bring the bus up`);
  }
}

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

// ── 17. A car that will not answer is told which fault to go and fix ─────────
section('Unreachable cars are diagnosed, not just reported');

const expectVolts = (raw: string, expected: number | null) => {
  const actual = parsePortVoltage(raw);
  if (actual !== expected) fail(`parsePortVoltage(${JSON.stringify(raw)}) gave ${actual}`);
};

expectVolts('12.4V', 12.4);
expectVolts('12.4V\r\r', 12.4);
expectVolts(' 11.9 V ', 11.9);
expectVolts('13V', 13);
expectVolts('', null);
expectVolts('NO DATA', null);
expectVolts('?', null);

// A powered port and a dead one are the two things this failure can mean, and
// they need opposite actions. Naming the voltage is what tells them apart.
const powered = describeUnreachableCar('CAN bus error', 12.4);
if (!powered.includes('12.4V')) fail(`a powered port should say so: ${powered}`);
if (!/ignition/i.test(powered)) fail('a powered port should send the driver to the ignition');
if (/pushed fully/i.test(powered)) fail('a powered port is already pushed fully in');

const unpowered = describeUnreachableCar('No data', 2.1);
if (!/push the adapter fully in/i.test(unpowered)) fail(`a dead port should say so: ${unpowered}`);

const unknown = describeUnreachableCar(null, null);
if (unknown.includes('(last:')) fail('nothing heard should not be reported as something heard');
if (!unknown.includes('never answered')) fail(`the fallback lost its meaning: ${unknown}`);
if (!describeUnreachableCar('CAN bus error', null).includes('(last: CAN bus error)')) {
  fail('what the adapter last said must survive into the message');
}

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

// ── 21. A discovered module is placed without brand knowledge ────────────────
section('Module classification');

for (const part of PART_ORDER) {
  if (!PART_LABELS[part]) fail(`part "${part}" has no label`);
}
if (new Set(PART_ORDER).size !== PART_ORDER.length) fail('a part is listed twice');

// 1. The module's own name, when it answered 22F197.
const classifyByName = (name: string) => classifyModule({ name, codes: [], requestId: '7A0' });
if (classifyByName('ABS') !== 'brakes') fail('ABS should be brakes');
if (classifyByName('ESP') !== 'brakes') fail('ESP should be brakes');
if (classifyByName('Airbag') !== 'restraints') fail('Airbag should be restraints');
if (classifyByName('SRS') !== 'restraints') fail('SRS should be restraints');
if (classifyByName('EPS') !== 'steering') fail('EPS should be steering');
if (classifyByName('Getriebe') !== 'transmission') fail('Getriebe should be transmission');
if (classifyByName('Kombi') !== 'instruments') fail('Kombi should be instruments');
if (classifyByName('Gateway') !== 'network') fail('Gateway should be network');

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

// "Motor" is any electric motor in German, so an unbounded match filed
// seat, window and wiper actuators under the engine.
for (const comfort of ['Sitzmotor links', 'Fensterheber-Motor', 'Wischermotor']) {
  if (classifyByName(comfort) === 'engine') fail(`${comfort} was filed as the engine`);
}
if (classifyByName('ECM') !== 'engine') fail('an engine ECU acronym should still be the engine');

// The codes tier has to beat the address tier, not merely beat nothing.
if (classifyModule({ name: null, codes: ['B1234'], requestId: '7E0' }) !== 'body') {
  fail('a stored body code should outrank the legislated engine address');
}

console.log(`  ${PART_ORDER.length} parts, classified by name then codes then address`);

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

// ── 23. What the car is made of survives, carefully ──────────────────────────
section('Module map');

const moduleData = (requestId: string, part: 'engine' | 'brakes' | 'restraints') => ({
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
  modules: [moduleData('7E0', 'engine'), moduleData('760', 'brakes'), moduleData('740', 'restraints')],
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

// ── 24. A sweep is not a broken link ─────────────────────────────────────────
section('Trouble reporting during a sweep');

// `tsx` does not type-check, so a missing export arrives here as
// `undefined` -- and `undefined > 8` is false, which let this whole section
// report success with nothing imported. Assert the value positively first.
if (typeof TROUBLE_THRESHOLD !== 'number') {
  fail('TROUBLE_THRESHOLD is not exported from at-commands as a number');
}
if (TROUBLE_THRESHOLD !== 4) {
  fail(`TROUBLE_THRESHOLD is ${TROUBLE_THRESHOLD}, expected 4`);
}

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

// A sweep suspends the counter so empty addresses do not read as a dying
// link -- but a reply saying the adapter itself is broken must still get
// through, or a controller that fell off the bus is swept over in silence.
const trouble = (suspended: boolean, fromReply: boolean) =>
  countsAsLinkTrouble({ recovering: false, suspended, fromReply });

if (!trouble(false, false)) fail('an ordinary timeout should count when nothing is suspended');
if (!trouble(false, true)) fail('an adapter fault should count when nothing is suspended');
if (trouble(true, false)) fail("a sweep's routine timeout should not count while suspended");
if (!trouble(true, true)) fail('an adapter fault must still count during a sweep');
if (countsAsLinkTrouble({ recovering: true, suspended: false, fromReply: true })) {
  fail('nothing counts while the link is already restarting');
}

// ── 25. A dead adapter is not the same as an empty bus ───────────────────────
section('Adapter failure during a sweep');

// `tsx` does not type-check (see section 24's note above), so a missing
// export would otherwise arrive here as `undefined` and pass every
// comparison silently. Assert its shape before trusting it numerically.
if (typeof MAX_CONSECUTIVE_ADAPTER_THROWS !== 'number') {
  fail('MAX_CONSECUTIVE_ADAPTER_THROWS is not exported from run-scan as a number');
}
if (MAX_CONSECUTIVE_ADAPTER_THROWS !== 6) {
  fail(`MAX_CONSECUTIVE_ADAPTER_THROWS is ${MAX_CONSECUTIVE_ADAPTER_THROWS}, expected 6`);
}

// An empty address answers NO DATA and resolves normally, which is what most
// of a sweep looks like -- a run of that must never trip this on its own.
if (adapterLikelyDead(0)) fail('a fresh sweep must not start out looking like a dead adapter');
if (adapterLikelyDead(MAX_CONSECUTIVE_ADAPTER_THROWS - 1)) {
  fail('one short of the threshold must not yet call the adapter dead');
}
// Only a command that gets no response at all -- a real rejection -- can ever
// reach the threshold; reaching it is what ends the sweep early.
if (!adapterLikelyDead(MAX_CONSECUTIVE_ADAPTER_THROWS)) {
  fail('reaching the threshold should call the adapter dead');
}
if (!adapterLikelyDead(MAX_CONSECUTIVE_ADAPTER_THROWS + 1)) {
  fail('past the threshold should still call the adapter dead');
}

console.log('  a run of thrown commands, not of silence, is what calls a sweep off early');

// ── 26. Folding a scan back never deletes what it didn't reach ───────────────
section('Folding a scan into the map');

const beforeFold: ModuleMap = {
  version: 1,
  vin: 'WAUZZZ8K9FA123456',
  protocolId: '6',
  discoveredAt: '2026-08-01T10:00:00.000Z',
  modules: [
    { requestId: '7E0', part: 'engine', name: null, faultCount: 2, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
    { requestId: '760', part: 'brakes', name: 'Old name', faultCount: 1, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
    { requestId: '740', part: 'restraints', name: null, faultCount: 0, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  ],
};
// A snapshot taken before folding, to prove the input is never mutated -- a
// React provider holds this exact object in state.
const frozenBefore = JSON.parse(JSON.stringify(beforeFold));

const refreshed: DiscoveredModule = {
  requestId: '7E0',
  part: 'engine',
  name: 'Engine control module',
  faultCount: 0,
  stale: false,
  // Deliberately an old-looking date, to prove the fold uses its own `now`
  // rather than whatever the found entry happened to carry.
  lastSeenAt: '2000-01-01T00:00:00.000Z',
};
const newcomer: DiscoveredModule = {
  requestId: '7A0',
  part: 'other',
  name: null,
  faultCount: 0,
  stale: false,
  lastSeenAt: '2000-01-01T00:00:00.000Z',
};

const foldNow = '2026-08-10T09:00:00.000Z';
// This scan asked 7E0 (found) and 760 (asked, came back silent); 740 was
// never in its plan at all -- the shape of a `parts` scan, or a `whole` sweep
// that was stopped before reaching every address.
const folded = foldScanIntoMap(beforeFold, ['7E0', '760'], [refreshed, newcomer], foldNow);

const foldedEngine = folded.modules.find((entry) => entry.requestId === '7E0');
if (foldedEngine?.name !== 'Engine control module') fail('a found module was not refreshed with fresh data');
if (foldedEngine?.stale) fail('a found module should not stay stale');
if (foldedEngine?.lastSeenAt !== foldNow) fail('a found module should be dated to the fold, not its own visit');

const foldedBrakes = folded.modules.find((entry) => entry.requestId === '760');
if (!foldedBrakes?.stale) fail('an asked-but-silent module should go stale');
if (foldedBrakes?.lastSeenAt !== '2026-08-01T10:00:00.000Z') {
  fail('an asked-but-silent module should keep its old date, not be re-dated');
}
if (foldedBrakes?.name !== 'Old name') fail('an asked-but-silent module should keep its old data, not be blanked');

const foldedRestraints = folded.modules.find((entry) => entry.requestId === '740');
if (foldedRestraints?.stale) fail('a module never asked this scan must not be marked stale');
if (foldedRestraints?.lastSeenAt !== '2026-08-01T10:00:00.000Z') fail('a module never asked must keep its date');

if (!folded.modules.some((entry) => entry.requestId === '7A0')) fail('a newly found module was not appended');
if (folded.modules.length !== 4) fail(`folding produced ${folded.modules.length} modules, expected 4`);

if (JSON.stringify(beforeFold) !== JSON.stringify(frozenBefore)) {
  fail('foldScanIntoMap mutated its input map');
}

console.log('  found refreshes and re-dates, asked-but-silent goes stale, never-asked is untouched, new modules append');

// ── Result ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('All checks passed.');
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
