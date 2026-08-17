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
import {
  ENGINE_ONLY_SECONDS,
  askedFromResult,
  buildScanPlan,
  estimateSeconds,
} from '../src/features/scan/lib/scan-plan';
import {
  UNAVAILABLE_REASONS,
  buildScanMenu,
  describeModules,
  requestIdsForMenu,
} from '../src/features/scan/lib/scan-menu';
import { AUTHORED, AUTHORED_CODES } from '../src/lib/obd/dtc/authored';
import { CATALOG_SOURCE_ENTRY_COUNT, DTC_CATALOG } from '../src/lib/obd/dtc/catalog';
import { isValidCode } from '../src/lib/obd/dtc/derive/parse';
import { parseDtcList } from '../src/lib/obd/dtc/parser';
import { resolveDtcDetail } from '../src/lib/obd/dtc/resolve';
import {
  FAMILY_LABELS,
  FAMILY_ORDER,
  describeMonitor,
  parseMonitorTests,
  type MonitorFamily,
} from '../src/lib/obd/mode06';
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
  restoreAddressing,
  sweepLinkSettings,
  sweepTargets,
} from '../src/lib/obd/uds/addressing';
import { decodeKwpFault, decodeUdsFault, faultLabel, type ModuleFault } from '../src/lib/obd/uds/faults';
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
import { PART_LABELS, PART_ORDER, type Part } from '../src/lib/obd/uds/parts';
import { isPlausibleVin } from '../src/lib/obd/vehicle-info';
import {
  MODULE_MAP_VERSION,
  availableParts,
  foldScanIntoMap,
  mapAppliesTo,
  moduleFaultState,
  partStaleness,
  sortModulesByFaults,
  type DiscoveredModule,
  type ModuleMap,
} from '../src/features/scan/lib/module-map';
import { MAX_CONSECUTIVE_ADAPTER_THROWS, adapterLikelyDead, probeReached } from '../src/features/scan/lib/run-scan';
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

// `sweepLinkSettings` is only what is set once, before the sweep starts.
// `visit()` sets ATSH -- and, on 29-bit, ATCRA -- again for every address for
// the whole sweep's duration, which a restore audit that only walks
// `sweepLinkSettings` never sees. That blind spot is exactly how a sweep
// used to finish with the header still pointed at whichever address answered
// last, silently sending every later OBD request there instead of to the
// functional broadcast. `restoreAddressing` is the fix, checked here on its
// own terms: a command list, not a wired-up call, so this proves the
// commands are right, not that `run-scan.ts` sends them -- that part is
// verified by reading the `finally` block, the same way the rest of
// `runScan`'s orchestration has no direct coverage here either.
for (const addressing of ['can11', 'can29'] as const) {
  const restore = restoreAddressing(addressing);
  if (restore.length === 0) fail(`${addressing} has no addressing restore at all`);
  for (const command of restore) {
    if (!command.startsWith('AT')) fail(`"${command}" is not an AT command`);
  }

  const header = restore.find((command) => command.startsWith('ATSH'));
  if (!header) {
    fail(`${addressing} restore never puts the transmit header back`);
  } else {
    const target = header.slice(4);
    const expected = addressing === 'can11' ? '7DF' : '18DB33F1';
    if (target !== expected) {
      fail(`${addressing} restore sets the header to ${target}, not the functional broadcast ${expected}`);
    }
  }

  // ATAR is what undoes a per-address ATCRA, the same way it undoes the
  // upfront band filter above -- without it the adapter stays listening only
  // for whichever address it was last told to expect a reply from.
  if (!restore.includes('ATAR')) fail(`${addressing} restore does not reopen the receive filter`);
}

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

// A trailing \r is ordinary adapter output, not a second empty line, and
// must not stop the count byte pair from being read.
const trailing = parseUdsReply('5901FF010002\r\r', 0x19);
if (trailing.kind !== 'positive') fail(`a reply with a trailing CR read as ${trailing.kind}`);
if (trailing.kind === 'positive' && parseDtcCount(trailing.body) !== 2) {
  fail(`a trailing CR changed the fault count to ${parseDtcCount(trailing.body)}`);
}

// A truncated 19 01 body -- shorter than the count bytes it should carry --
// has to read as "unknown", not as a wrong number pulled from bytes that
// are not there. This is user-visible: it is what stands between "3 faults"
// and "would not say" on a module's card.
if (parseDtcCount([0x01, 0xff, 0x40]) !== null) fail('a truncated 19 01 body should not produce a count');
if (parseDtcCount([]) !== null) fail('an empty 19 01 body should not produce a count');

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
if (nrcAction(0x13) !== 'retry-mask') fail('incorrectMessageLengthOrInvalidFormat should retry the mask');
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

// A `19 02` reply carrying more than one fault always arrives on a real bus
// as an ISO-TP group -- a byte-count line then sequenced `N:` lines, the
// same shape mode 03 multi-frame replies already have coverage for in
// section 8 -- not as the single flat line every fixture above uses. Same
// twelve bytes as the flat fixture, split at the frame boundary a real
// adapter would use, so the two parses have to agree.
const multiFrame19 = parseUdsReply('00C\r0:5902FF403511\r1:08403612042F\r\r', 0x19);
if (multiFrame19.kind !== 'positive') {
  fail(`a multi-frame 19 02 reply read as ${multiFrame19.kind}, not positive`);
} else {
  const multiGroups = parseDtcGroups(multiFrame19.body);
  if (multiGroups.length !== 2) fail(`a multi-frame fault list decoded ${multiGroups.length} faults, expected 2`);
  if (multiGroups[0]?.join(',') !== '64,53,17,8') fail(`multi-frame first fault decoded as ${multiGroups[0]}`);
  if (multiGroups[1]?.join(',') !== '64,54,18,4') fail(`multi-frame second fault decoded as ${multiGroups[1]}`);
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
// `PART_LABELS` is a `Record<Part, string>`, so the compiler already forces
// it to carry every `Part` -- but nothing forces `PART_ORDER`, a plain
// array, to list them all. A `Part` missing from it is not a type error,
// just a part silently dropped from `groupByPart`, `availableParts` and the
// whole results UI. Combined with the no-duplicates check above, matching
// lengths is enough to prove the two agree.
if (PART_ORDER.length !== Object.keys(PART_LABELS).length) {
  fail(`PART_ORDER lists ${PART_ORDER.length} parts, PART_LABELS knows ${Object.keys(PART_LABELS).length}`);
}

// 1. The module's own name, when it answered 22F197.
const classifyByName = (name: string) => classifyModule({ name, codes: [], requestId: '7A0' });
if (classifyByName('ABS') !== 'brakes') fail('ABS should be brakes');
if (classifyByName('ESP') !== 'brakes') fail('ESP should be brakes');
if (classifyByName('Airbag') !== 'restraints') fail('Airbag should be restraints');
if (classifyByName('SRS') !== 'restraints') fail('SRS should be restraints');
// Restraints has to be checked before instruments, or this name is filed
// under "Cluster" instead: `NAME_PATTERNS` stops at the first match, and
// CLUSTER (instruments) would otherwise beat AIRBAG (restraints) for a name
// that legitimately contains both words. Pinned here, not just relied on by
// ordering, so reordering `NAME_PATTERNS` fails loudly instead of quietly.
if (classifyByName('Airbag Cluster Sensor') !== 'restraints') {
  fail('"Airbag Cluster Sensor" should be restraints, not instruments -- NAME_PATTERNS order regressed');
}
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

// A whole-car plan is all `discover` steps -- `visit()` decides whether to
// interrogate an address only once it has answered, which a static plan has
// no entry for -- so an estimate built from the plan alone used to promise
// about 41s for a sweep that also spends real time on the modules it finds.
// 45 sits above that old, too-low figure and below the corrected one, so a
// regression back to discovery-only trips it.
if (sweepSeconds < 45) {
  fail(`a whole-car estimate of ${sweepSeconds}s ignores the interrogation visit() performs on what it finds`);
}

// The engine-only path never touches the scan engine at all -- its plan is
// always empty -- so its estimate cannot come from `estimateSeconds`, and
// `Math.max(1, 0)` used to be what the scope screen showed for a path the
// design measures at about 3s.
if (ENGINE_ONLY_SECONDS < 2) {
  fail(`the engine-only estimate of ${ENGINE_ONLY_SECONDS}s does not reflect four real requests`);
}

console.log(`  full sweep ${whole.length} steps, about ${sweepSeconds}s; engine-only about ${ENGINE_ONLY_SECONDS}s`);

// ── 22b. A garbled VIN read never becomes a storage key ──────────────────────
section('VIN plausibility gates persistence');

// `parseVin` (in vehicle-info.ts) deliberately returns the raw decoded text,
// unstripped and un-checked, when that text fails this exact predicate --
// right for the Vehicle screen, which should still show whatever came off
// the bus, and wrong for a storage key, which is why `module-map-store.ts`
// gates on it before the value is ever used as one. `loadModuleMap` and
// `saveModuleMap` themselves need AsyncStorage and are not covered here, the
// same way nothing that touches the adapter is; this is the predicate they
// gate on, proven against the shape of text a garbled read actually produces.
if (isPlausibleVin('WAUZZZ8K9FA123456') !== true) fail('a real 17-character VIN should be plausible');
if (isPlausibleVin('VIN NOT AVAILABLE') !== false) fail('adapter filler text must not read as a VIN');
if (isPlausibleVin('WAUZZZ8K9FA12345') !== false) fail('16 characters is one short of a VIN');
// I, O and Q never appear in a real VIN -- excluded precisely so a misread
// character cannot be mistaken for one.
if (isPlausibleVin('WAUZZZ8K9FAI23456') !== false) fail('a VIN-shaped string containing I must not pass');

console.log('  the predicate module-map-store.ts gates on rejects exactly what a garbled decode looks like');

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

// Applying another car's map would offer addresses this car does not have.
if (!mapAppliesTo(saved, 'WAUZZZ8K9FA123456', '6')) fail('a map should apply to its own car');
if (mapAppliesTo(saved, 'WVWZZZ1KZAW123456', '6')) fail('a map was applied to a different VIN');
if (mapAppliesTo(saved, null, '6')) fail('a map was applied to a car with no readable VIN');
// The addresses only mean anything on the bus they were found on.
if (mapAppliesTo(saved, 'WAUZZZ8K9FA123456', '7')) fail('an 11-bit map was applied to a 29-bit bus');
if (mapAppliesTo(null, 'WAUZZZ8K9FA123456', '6')) fail('a missing map applied to something');

console.log('  a map stays on its own car and its own bus');

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

// ── 25b. A silent module is not the same as an address never reached ────────
section('What counts as having reached an address');

// The exact ambiguity this exists to resolve: `ask()` hands back the same
// empty string whether the command threw or the module simply is not there,
// and `parseUdsReply('')` reads identically to `parseUdsReply('NO DATA')` --
// both `'silent'`. Only `threw` tells them apart, which is why `visit()`
// cannot make this call from the parsed reply alone.
if (!probeReached(false, 'silent')) fail('a genuine NO DATA should count as reached');
if (probeReached(true, 'silent')) {
  fail('a thrown probe must not count as reached just because it parses the same as NO DATA');
}
// A module that actually answered -- with data or a refusal -- was obviously
// reached.
if (!probeReached(false, 'positive')) fail('a positive reply should count as reached');
if (!probeReached(false, 'negative')) fail('a negative reply should count as reached');
// A raw adapter fault is the adapter's own trouble, not the module's answer,
// even though nothing threw to produce it.
if (probeReached(false, 'unusable')) fail('a raw CAN ERROR/BUFFER FULL reply must not count as reached');
if (probeReached(true, 'unusable')) fail('a thrown probe must not count as reached');

console.log('  a thrown command is never mistaken for a module that genuinely said nothing');

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

// ── 27. What a scan "asked" is what it reached, not what it was told ─────────
section('Asked set from a scan result');

// The exact case that reintroduced finding A through a side door: a `parts`
// scan for three addresses, stopped after only the first was reached. Using
// `scope.requestIds` here would hand the other two to `foldScanIntoMap` as
// "asked", and a module that was never actually probed would be marked
// stale -- precisely what section 26 forbids.
const interruptedParts = askedFromResult({ kind: 'parts', requestIds: ['7E0', '760', '740'] }, ['7E0']);
if (interruptedParts.join(',') !== '7E0') {
  fail(`an interrupted parts scan asked ${interruptedParts.join(',')}, expected just what it reached`);
}

// A `parts` scan that ran to completion reaches everything it was told to,
// so the two should agree -- this is the case that made the bug easy to miss.
const completedParts = askedFromResult({ kind: 'parts', requestIds: ['7E0', '760'] }, ['7E0', '760']);
if (completedParts.join(',') !== '7E0,760') fail('a completed parts scan should ask everything it reached');

// A `whole` sweep stopped early must narrow the same way, whatever it was
// told to sweep -- `whole` carries no request list at all to fall back to.
const interruptedWhole = askedFromResult({ kind: 'whole' }, ['7E0', '7E1']);
if (interruptedWhole.join(',') !== '7E0,7E1') fail('a whole scan should ask exactly what it visited');

// `engine` never asks a module at all, regardless of what `visited` says --
// there is no scan step behind it that could have produced a visit.
if (askedFromResult({ kind: 'engine' }, ['7E0']).length !== 0) {
  fail('an engine-only scope should never ask a module address');
}

console.log('  asked is what a scan reached, never what it was merely told to try');

// ── 28. What the results screen shows, and what a ticked part means ──────────
section('Results ordering, filter chips, and picked-part addresses');

const resultModules: DiscoveredModule[] = [
  { requestId: '7E0', part: 'engine', name: null, faultCount: 1, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  { requestId: '760', part: 'brakes', name: null, faultCount: 3, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  {
    requestId: '761',
    part: 'brakes',
    name: 'Rear brake module',
    faultCount: 0,
    stale: true,
    lastSeenAt: '2026-08-01T10:00:00.000Z',
  },
  { requestId: '740', part: 'restraints', name: null, faultCount: 0, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
];

// Chips follow the app's fixed part order, not discovery order, and only for
// parts a module was actually filed under -- ten empty chips would be clutter.
const chipParts = availableParts(resultModules);
if (chipParts.join(',') !== 'engine,brakes,restraints') {
  fail(`chip order came out as ${chipParts.join(',')}, expected PART_ORDER's own order`);
}
if (new Set(chipParts).size !== chipParts.length) fail('a part chip was offered twice');
if (availableParts([]).length !== 0) fail('no modules should offer no chips');

// The module carrying the most faults leads.
const orderedByFaults = sortModulesByFaults(resultModules);
if (orderedByFaults.map((entry) => entry.requestId).join(',') !== '760,7E0,740,761') {
  fail(
    `sorted as ${orderedByFaults.map((entry) => entry.requestId).join(',')}, expected the noisiest module first`,
  );
}

// A null count -- present, but would not say how many -- reads the same as
// zero rather than sorting to the top by accident.
const unreadableCountModule: DiscoveredModule = {
  requestId: '7A0',
  part: 'other',
  name: null,
  faultCount: null,
  stale: false,
  lastSeenAt: '2026-08-01T10:00:00.000Z',
};
if (sortModulesByFaults([...resultModules, unreadableCountModule])[0].requestId !== '760') {
  fail('an unreadable count must not outrank a module with a known one');
}

// Equal counts are not left to whatever order the input happened to arrive
// in -- asserted explicitly, both forwards and reversed, rather than trusted
// to fall out of the sort being stable. The tie always breaks the same way on
// address, so the list cannot reshuffle between two renders of the same data.
const tiedModules: DiscoveredModule[] = [
  { requestId: '7E0', part: 'engine', name: null, faultCount: 1, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  { requestId: '761', part: 'brakes', name: null, faultCount: 1, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
];
const tiedForward = sortModulesByFaults(tiedModules).map((entry) => entry.requestId).join(',');
const tiedReversed = sortModulesByFaults([...tiedModules].reverse()).map((entry) => entry.requestId).join(',');
if (tiedForward !== '761,7E0' || tiedReversed !== '761,7E0') {
  fail(`a tie in fault count should always break the same way on address, got ${tiedForward} / ${tiedReversed}`);
}

const resultMap: ModuleMap = {
  version: MODULE_MAP_VERSION,
  vin: 'WAUZZZ8K9FA123456',
  protocolId: '6',
  discoveredAt: '2026-08-01T10:00:00.000Z',
  modules: resultModules,
};
const resultMenu = buildScanMenu(true, 'can11', resultMap);

// Ticking a part with two modules has to give up both addresses, or the
// second module is silently never asked again.
const brakesAddresses = requestIdsForMenu(resultMenu, new Set<Part>(['brakes']));
if (brakesAddresses.join(',') !== '760,761') {
  fail(`ticking brakes gave ${brakesAddresses.join(',')}, expected both brake modules`);
}

// Two ticked parts is just the union. `engine` is not among them: it is its
// own row, read by mode 03 rather than by address, so it contributes no
// address here even when ticked.
const twoPartAddresses = requestIdsForMenu(resultMenu, new Set<Part>(['engine', 'restraints']));
if (twoPartAddresses.join(',') !== '740') fail(`two ticked parts gave ${twoPartAddresses.join(',')}`);

// Nothing ticked asks nothing -- there is no implicit "everything" fallback.
if (requestIdsForMenu(resultMenu, new Set<Part>()).length !== 0) {
  fail('an empty selection should ask for nothing');
}

// Ticking a greyed part must not invent an address for it. The row exists on
// the menu, so this is reachable state, not a hypothetical.
if (requestIdsForMenu(resultMenu, new Set<Part>(['suspension'])).length !== 0) {
  fail('a part with no modules should resolve to no addresses');
}

console.log('  chips follow PART_ORDER, results lead with the noisiest module, ties are deterministic, and a ticked part expands to its addresses');

// ── 29. A part's checklist row says whether it is still answering ────────────
section('Part staleness for the checklist');

const noStaleGroup: DiscoveredModule[] = [
  { requestId: '760', part: 'brakes', name: null, faultCount: 0, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  { requestId: '761', part: 'brakes', name: null, faultCount: 0, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
];
if (partStaleness(noStaleGroup) !== 'awake') fail('every module answering should read as awake');

const allStaleGroup: DiscoveredModule[] = [
  { requestId: '760', part: 'brakes', name: null, faultCount: 0, stale: true, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  { requestId: '761', part: 'brakes', name: null, faultCount: 0, stale: true, lastSeenAt: '2026-08-01T10:00:00.000Z' },
];
if (partStaleness(allStaleGroup) !== 'asleep') fail('every module gone quiet should read as asleep');

// The case the review named: a part is neither "fine" nor "gone" when it is
// a mix, and must not silently fall into either of the easy cases.
const mixedStaleGroup: DiscoveredModule[] = [
  { requestId: '760', part: 'brakes', name: null, faultCount: 0, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  { requestId: '761', part: 'brakes', name: null, faultCount: 0, stale: true, lastSeenAt: '2026-08-01T10:00:00.000Z' },
];
if (partStaleness(mixedStaleGroup) !== 'partly-asleep') {
  fail(`a part with one quiet module out of two read as "${partStaleness(mixedStaleGroup)}", expected partly-asleep`);
}

// A single stale module is still a mix, not a rounding error toward "asleep".
const oneOfThreeStale: DiscoveredModule[] = [
  ...noStaleGroup,
  { requestId: '762', part: 'brakes', name: null, faultCount: 0, stale: true, lastSeenAt: '2026-08-01T10:00:00.000Z' },
];
if (partStaleness(oneOfThreeStale) !== 'partly-asleep') fail('one quiet module among several should not read as fully asleep');

// A part nobody found yet has nothing to be asleep about.
if (partStaleness([]) !== 'awake') fail('a part with no modules should not read as asleep');

console.log('  a part reads awake, partly asleep, or asleep -- never silently rounded to either end');

// ── 30. A module's card says what was actually learned ──────────────────────
section('Module fault state for the results card');

const activeFault: ModuleFault = {
  code: 'C0035',
  failureType: 0x11,
  failureTypeLabel: 'Circuit shorted to ground',
  status: { failingNow: true, confirmed: true, raw: 0x09 },
};
const storedFault: ModuleFault = {
  code: 'C0036',
  failureType: 0x1c,
  failureTypeLabel: 'Circuit voltage out of range',
  status: { failingNow: false, confirmed: true, raw: 0x08 },
};

const freshModule = (faultCount: number | null): DiscoveredModule => ({
  requestId: '760',
  part: 'brakes',
  name: 'ABS',
  faultCount,
  stale: false,
  lastSeenAt: '2026-08-10T09:00:00.000Z',
});

// A real fault list is reported by its own length, not by `faultCount` --
// `19 01`'s count and `19 02`'s list are separate requests and can disagree
// (a byte group that fails to decode is dropped from the list but not from
// the count), and the list is what the card actually renders and lets a
// driver tap into.
const mismatched = moduleFaultState(freshModule(3), [activeFault, storedFault]);
if (mismatched.kind !== 'faults' || mismatched.count !== 2) {
  fail(`a module with 2 decoded faults and faultCount 3 read as ${JSON.stringify(mismatched)}, expected 2 faults`);
}
if (mismatched.kind === 'faults' && !mismatched.failingNow) {
  fail('a fault list containing one failing-now entry should read as failing now');
}

const bothStored = moduleFaultState(freshModule(1), [storedFault]);
if (bothStored.kind === 'faults' && bothStored.failingNow) {
  fail('a fault list with nothing failing now must not read as failing now');
}

// An honest zero, a count with no list, and no count at all -- exactly what
// 19 01 alone said, when there is no list to prefer instead.
if (moduleFaultState(freshModule(0), []).kind !== 'clean') fail('a zero count with no faults should read as clean');
const unreadable = moduleFaultState(freshModule(2), []);
if (unreadable.kind !== 'unreadable' || unreadable.count !== 2) {
  fail(`a nonzero count with no list should read as unreadable with its count, got ${JSON.stringify(unreadable)}`);
}
if (moduleFaultState(freshModule(null), []).kind !== 'unknown') {
  fail('no count and no list should read as unknown, not clean');
}

// The case the review named: a module that went quiet while still carrying
// an old nonzero faultCount from before it stopped answering must read as
// asleep, not as a live refusal to list faults it currently has nothing to
// say about. `foldScanIntoMap` and the provider's own `mergeFaults` always
// clear a module's cached fault list in the same step that marks it stale,
// so a stale module still carrying a fault list is not a shape the app
// should ever actually produce -- but staleness wins regardless, since it
// is the more honest thing to say either way.
const staleWithOldCount: DiscoveredModule = { ...freshModule(2), stale: true };
if (moduleFaultState(staleWithOldCount, []).kind !== 'asleep') {
  fail('a stale module carrying an old faultCount must read as asleep, not unreadable');
}
const staleWithFaults: DiscoveredModule = { ...freshModule(2), stale: true };
if (moduleFaultState(staleWithFaults, [activeFault]).kind !== 'asleep') {
  fail('staleness must win even over a (should-be-impossible) leftover fault list');
}

console.log('  asleep beats a stale count, a real list is reported by its own length, and the rest fall back to what 19 01 alone said');

// ── 31. The scan menu says what it cannot do, and why ────────────────────────
section('Scan menu availability');

const emptyMap: ModuleMap = {
  version: MODULE_MAP_VERSION,
  vin: 'WAUZZZ8K9FA123456',
  protocolId: '6',
  discoveredAt: '2026-08-01T10:00:00.000Z',
  modules: [],
};

// Every part is listed every time. A menu that hides what it cannot reach
// leaves the driver guessing whether the app is limited or the car is.
const NAMED_PART_COUNT = PART_ORDER.filter((part) => part !== 'engine' && part !== 'other').length;

// A car that is not on CAN can be asked about its engine and nothing else.
const notCan = buildScanMenu(true, null, null);
if (notCan.engine.unavailable !== null) fail('the engine should be readable on any protocol');
if (notCan.parts.length !== NAMED_PART_COUNT) {
  fail(`a non-CAN car listed ${notCan.parts.length} parts, expected all ${NAMED_PART_COUNT}`);
}
if (notCan.parts.some((row) => row.unavailable !== 'not-can')) {
  fail('a non-CAN car should blame the protocol for every part it cannot reach');
}
// The whole car is still worth offering: it means everything reachable, which
// on this car is the engine.
if (notCan.wholeCar.unavailable !== null) {
  fail('whole-car should stay available while anything at all is reachable');
}

// On CAN with nothing found yet, the same rows say something different -- and
// the difference matters, because this one has a cure.
const nothingFound = buildScanMenu(true, 'can11', emptyMap);
if (nothingFound.parts.some((row) => row.unavailable !== 'not-found')) {
  fail('a CAN car with an empty map should say the parts have not been found yet');
}
if (nothingFound.wholeCar.unavailable !== null) fail('whole-car should be offered on a CAN car');
if (UNAVAILABLE_REASONS['not-found'] === UNAVAILABLE_REASONS['not-can']) {
  fail('"not found yet" and "protocol cannot reach it" must not read the same');
}

// With brakes in the map, brakes open up and nothing else does.
const brakesKnown = resultMenu.parts.filter((row) => row.unavailable === null);
if (brakesKnown.map((row) => row.part).join(',') !== 'brakes,restraints') {
  fail(`a map with brakes and restraints offered ${brakesKnown.map((row) => row.part).join(',')}`);
}
if (resultMenu.parts.map((row) => row.part).join(',') !== PART_ORDER.filter((p) => p !== 'engine' && p !== 'other').join(',')) {
  fail('menu rows should follow PART_ORDER');
}

// `other` is the catch-all for an address that matched no pattern, so
// "not found yet -- scan the whole car to look for it" would name nothing a
// driver could act on. It earns a row by having something in it, or not at all.
if (resultMenu.parts.some((row) => row.part === 'other')) {
  fail('"other" should not appear while nothing is filed under it');
}
const withOther = buildScanMenu(true, 'can11', {
  ...emptyMap,
  modules: [
    { requestId: '7A1', part: 'other', name: null, faultCount: 0, stale: false, lastSeenAt: '2026-08-01T10:00:00.000Z' },
  ],
});
const otherRow = withOther.parts.find((row) => row.part === 'other');
if (!otherRow) fail('"other" should appear once a module is filed under it');
if (otherRow && otherRow.unavailable !== null) fail('"other" must never appear greyed out');

// Nothing plugged in: nothing on the menu means anything, and the reason is
// the link rather than the car, which is not yet known.
const offline = buildScanMenu(false, null, null);
if (offline.engine.unavailable !== 'no-link') fail('an unplugged adapter cannot read the engine');
if (offline.parts.some((row) => row.unavailable !== 'no-link')) {
  fail('an unplugged adapter should blame the link, not the protocol');
}
if (offline.wholeCar.unavailable !== 'no-link') {
  fail('whole-car should grey out when there is nothing reachable at all');
}

// A row's hint names who is under it, and says which of them have gone quiet.
const brakeRow = resultMenu.parts.find((row) => row.part === 'brakes');
const brakeHint = brakeRow ? describeModules(brakeRow.modules) : '';
if (!brakeHint.includes('760') || !brakeHint.includes('Rear brake module')) {
  fail(`a part's hint should name its modules, got "${brakeHint}"`);
}
if (!brakeHint.includes('asleep')) fail('a stale module should be marked asleep in the hint');

console.log('  every part is listed, greyed rows carry the reason, and "other" only shows when it holds something');

// ── 33. Mode 06 records ──────────────────────────────────────────────────────
section('Mode 06 records decode');

// Two nine-byte records in one reply: catalyst bank 1, then an O2 heater.
const twoRecords = parseMonitorTests('46' + '21850100C8006400FA' + '41851000320019004B');
if (twoRecords.length !== 2) fail(`two records should decode, got ${twoRecords.length}`);
if (twoRecords[0]?.monitorId !== 0x21) fail('first record should be MID 0x21');
if (twoRecords[1]?.testId !== 0x85) fail('second record should carry TID 0x85');

// A trailing fragment that cannot complete a record is dropped, not guessed at.
const raggedRecords = parseMonitorTests('46' + '21850100C8006400FA' + '4185');
if (raggedRecords.length !== 1) fail('an incomplete trailing record must be ignored');

// Padding records are not tests.
const paddedRecords = parseMonitorTests('46' + '000000000000000000' + '21850100C8006400FA');
if (paddedRecords.length !== 1) fail('a zero monitor id is padding and must be skipped');

// Known scaling is applied to the value and to both limits alike.
const scaledTest = parseMonitorTests('46' + '2185020064003200C8');
if (scaledTest[0] && Math.abs(scaledTest[0].value - 10) > 1e-9) {
  fail(`0x02 scaling is x0.1, got ${scaledTest[0]?.value}`);
}
if (scaledTest[0] && !scaledTest[0].scaled) fail('a known scaling id should report scaled');

// Unknown scaling falls through to raw counts rather than inventing a unit.
const rawTest = parseMonitorTests('46' + '2185FF0064003200C8');
if (rawTest[0]?.scaled !== false) fail('an unknown scaling id must report scaled: false');
if (rawTest[0] && rawTest[0].value !== 100) fail('unscaled values stay raw counts');

console.log('  records slice, padding is skipped, scaling applies to value and limits together');

// ── 34. Mode 06 limits are reported as given ─────────────────────────────────
section('Mode 06 limits are reported as given');

// Upper bound only: the minimum comes back as 0x0000.
const upperOnly = parseMonitorTests('46' + '2185010064' + '0000' + '00C8');
if (upperOnly[0]?.limit !== 'upper') {
  fail(`a zero minimum means an upper bound only, got ${upperOnly[0]?.limit}`);
}
if (upperOnly[0]?.fraction !== null) fail('a one-sided test has no position between bounds');

// Lower bound only: the maximum comes back as 0xFFFF.
const lowerOnly = parseMonitorTests('46' + '2185010064' + '0032' + 'FFFF');
if (lowerOnly[0]?.limit !== 'lower') {
  fail(`a 0xFFFF maximum means a lower bound only, got ${lowerOnly[0]?.limit}`);
}

// Both bounds present, and the value's position between them is the whole
// reason to read mode 06 rather than just its pass/fail.
const bothEnds = parseMonitorTests('46' + '2185010064' + '0032' + '00FA');
if (bothEnds[0]?.limit !== 'both') fail('two real bounds should report both');
if (bothEnds[0] && Math.abs((bothEnds[0].fraction ?? -1) - 0.25) > 1e-9) {
  fail(`100 between 50 and 250 is a quarter of the way, got ${bothEnds[0]?.fraction}`);
}

// Neither bound: nothing to judge, and nothing to draw.
const noBounds = parseMonitorTests('46' + '2185010064' + '0000' + 'FFFF');
if (noBounds[0]?.limit !== 'none') fail('no usable bounds should report none');
if (noBounds[0]?.fraction !== null) fail('a fraction needs two bounds; it must be null otherwise');
if (noBounds[0]?.passed !== true) fail('a test with no limits cannot be failed');

// A value under a floor-only test fails on the floor, and is not rescued by
// the 0xFFFF ceiling being read as a real number.
const underFloor = parseMonitorTests('46' + '2185010010' + '0032' + 'FFFF');
if (underFloor[0]?.passed !== false) fail('a value below its only bound has failed');

console.log('  one-sided, two-sided and absent limits are each told apart');

// ── 35. Mode 06 monitor names carry their provenance ─────────────────────────
section('Mode 06 monitor names carry their provenance');

// The table wins where it has an entry.
const namedMonitor = describeMonitor(0x21);
if (namedMonitor.name !== 'Catalyst bank 1') fail(`0x21 is catalyst bank 1, got "${namedMonitor.name}"`);
if (namedMonitor.confidence !== 'named') fail('a table entry is a named monitor');

// Outside the table, position in the standard is arithmetic, not guesswork --
// and the arithmetic has to agree with the table where the two overlap.
const derivedFromTable = describeMonitor(0x05);
if (derivedFromTable.name !== 'O2 sensor bank 2 sensor 1') {
  fail(`the table and the arithmetic disagree at 0x05: "${derivedFromTable.name}"`);
}

const bank3 = describeMonitor(0x0a);
if (!bank3.name.includes('bank 3') || !bank3.name.includes('sensor 2')) {
  fail(`0x0A is bank 3 sensor 2, got "${bank3.name}"`);
}
if (bank3.confidence !== 'derived') fail('a name worked out from the range is derived, not named');
if (bank3.family !== 'o2') fail('0x0A belongs to the O2 family');

const cylinder9 = describeMonitor(0xa9);
if (!cylinder9.name.includes('cylinder 9')) fail(`0xA9 is misfire cylinder 9, got "${cylinder9.name}"`);
if (cylinder9.family !== 'misfire') fail('0xA9 belongs to the misfire family');

const heater = describeMonitor(0x43);
if (!heater.name.toLowerCase().includes('heater')) fail(`0x43 is an O2 heater, got "${heater.name}"`);
if (heater.family !== 'o2-heater') fail('0x43 belongs to the heater family');

// Manufacturer territory is reported, never named.
const vendorMonitor = describeMonitor(0xe1);
if (vendorMonitor.confidence !== 'manufacturer') fail('0xE1 is manufacturer-defined');
if (vendorMonitor.family !== 'manufacturer') fail('0xE1 is filed under manufacturer');
if (/bank|cylinder|catalyst/i.test(vendorMonitor.name)) {
  fail(`a manufacturer MID must not be given a guessed name: "${vendorMonitor.name}"`);
}

// A gap in the standard is admitted rather than papered over.
const gapMonitor = describeMonitor(0x7a);
if (gapMonitor.confidence !== 'unlisted') fail('0x7A is in no known range and must say so');
if (!gapMonitor.name.includes('7A')) fail('an unlisted monitor still shows its number');

// Every family has a label and a place in the order, so the screen can never
// be handed a family it has no heading for.
for (const family of FAMILY_ORDER) {
  if (!FAMILY_LABELS[family]) fail(`family ${family} has no label`);
}
const allFamilies = Object.keys(FAMILY_LABELS) as MonitorFamily[];
for (const family of allFamilies) {
  if (!FAMILY_ORDER.includes(family)) fail(`family ${family} has a label but no place in the order`);
}

// A decoded test carries the provenance through, not just the name.
const provenanced = parseMonitorTests('46' + 'E185010064' + '0032' + '00FA');
if (provenanced[0]?.confidence !== 'manufacturer') {
  fail('a decoded test should carry its monitor provenance');
}
if (provenanced[0]?.family !== 'manufacturer') fail('a decoded test should carry its family');

console.log(`  ${FAMILY_ORDER.length} families; named, derived, manufacturer and unlisted all distinguished`);

// ── Result ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('All checks passed.');
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
