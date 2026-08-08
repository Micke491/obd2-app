/**
 * Pure-logic checks that need no adapter, no car and no device.
 * Run with: npx tsx <this file>
 */
import {
  appendPoint,
  decimate,
  extentOf,
  scaleFor,
  valueAt,
  windowPoints,
  TRACE_CAPACITY,
  type TracePoint,
} from '../src/features/live-data/lib/trace-buffer';
import { buildTraceCsv } from '../src/features/live-data/lib/trace-csv';
import { TRACE_GROUPS, availableGroups } from '../src/features/live-data/lib/trace-groups';
import { AUTHORED, AUTHORED_CODES } from '../src/lib/obd/dtc/authored';
import { DTC_CATALOG } from '../src/lib/obd/dtc/catalog';
import { isValidCode } from '../src/lib/obd/dtc/derive/parse';
import { parseDtcList } from '../src/lib/obd/dtc/parser';
import { resolveDtcDetail } from '../src/lib/obd/dtc/resolve';
import { PID_DEFINITIONS, getPidDefinition } from '../src/lib/obd/pids';
import { extractPayload, markerOffset, parseResponse } from '../src/lib/obd/protocol';
import { acceptsReply, linkReplyHealth, type LinkReplyHealth } from '../src/lib/obd/reply-match';
import { PID_THRESHOLDS, bandFor, describeBand } from '../src/lib/obd/thresholds';
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
expectLocus('P0155', 'Bank 2 · Sensor 1');
expectLocus('P0161', 'Bank 2 · Sensor 2');

// The SAE wording wins the title where the catalog has one; the derived module
// name has to show up in the body text instead.
const u0100 = resolveDtcDetail('U0100');
if (u0100.title !== DTC_CATALOG.U0100) fail(`U0100 should use the SAE title, got "${u0100.title}"`);
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

// ── 11. Safe bands agree with the readings they describe ─────────────────────
section('Threshold bands');

for (const [pid, threshold] of Object.entries(PID_THRESHOLDS)) {
  const definition = getPidDefinition(pid);
  if (!definition) {
    fail(`threshold ${pid} names a PID that does not exist`);
    continue;
  }

  // A limit the sensor can never reach would be a band that never fires.
  for (const [name, bounds] of [
    ['caution', threshold.caution],
    ['alarm', threshold.alarm],
  ] as const) {
    if (!bounds) continue;
    if (bounds.min !== undefined && (bounds.min < definition.min || bounds.min > definition.max)) {
      fail(`${pid} ${name}.min ${bounds.min} is outside ${definition.min}..${definition.max}`);
    }
    if (bounds.max !== undefined && (bounds.max < definition.min || bounds.max > definition.max)) {
      fail(`${pid} ${name}.max ${bounds.max} is outside ${definition.min}..${definition.max}`);
    }
  }

  // Alarm has to be the wider band, or a reading could be an alarm without
  // ever having been a caution.
  const { caution, alarm } = threshold;
  if (caution?.max !== undefined && alarm?.max !== undefined && alarm.max < caution.max) {
    fail(`${pid}: alarm.max ${alarm.max} is tighter than caution.max ${caution.max}`);
  }
  if (caution?.min !== undefined && alarm?.min !== undefined && alarm.min > caution.min) {
    fail(`${pid}: alarm.min ${alarm.min} is tighter than caution.min ${caution.min}`);
  }

  if (threshold.note.length < 60) fail(`${pid}: threshold note is thin`);
}

const expectBand = (pid: string, value: number, expected: string) => {
  const actual = bandFor(pid, value);
  if (actual !== expected) fail(`bandFor(${pid}, ${value}) = ${actual}, expected ${expected}`);
};

expectBand('05', 90, 'normal'); // a warm engine
expectBand('05', 100, 'normal'); // exactly on the bound is still inside
expectBand('05', 105, 'caution');
expectBand('05', 115, 'alarm');
expectBand('06', 0, 'normal');
expectBand('06', -8, 'normal');
expectBand('06', 14, 'caution');
expectBand('06', -25, 'alarm');
expectBand('42', 14.2, 'normal');
expectBand('42', 11.0, 'alarm');
expectBand('0C', 7000, 'normal'); // no band: redline is not ours to guess
expectBand('14', 0.05, 'normal'); // oxygen sensors are deliberately unbanded
expectBand('ZZ', 999, 'normal'); // an unknown PID must not throw

if (describeBand('05', 90) !== null) fail('a healthy reading should have no band word');
if (describeBand('05', 115) !== 'Very high') fail(`describeBand(05, 115) = ${describeBand('05', 115)}`);
if (describeBand('06', -25) !== 'Very low') fail(`describeBand(06, -25) = ${describeBand('06', -25)}`);
if (describeBand('06', 14) !== 'High') fail(`describeBand(06, 14) = ${describeBand('06', 14)}`);

console.log(`  ${Object.keys(PID_THRESHOLDS).length} banded PIDs`);

// ── 12. The trace buffer keeps what it claims to ─────────────────────────────
section('Trace buffer');

const ring: TracePoint[] = [];
for (let i = 0; i < TRACE_CAPACITY + 500; i += 1) appendPoint(ring, { at: 1000 + i, value: i });
if (ring.length !== TRACE_CAPACITY) fail(`ring holds ${ring.length}, expected ${TRACE_CAPACITY}`);
if (ring[ring.length - 1].value !== TRACE_CAPACITY + 499) fail('the ring dropped the newest point');
if (ring[0].value !== 500) fail(`the ring kept the wrong oldest point: ${ring[0].value}`);

const trace: TracePoint[] = [
  { at: 100, value: 10 },
  { at: 200, value: 30 },
  { at: 300, value: 5 },
  { at: 400, value: 20 },
];

const clipped = windowPoints(trace, 200, 300);
if (clipped.length !== 2 || clipped[0].at !== 200) fail('windowPoints did not clip to the window');
if (windowPoints(trace, 500, 600).length !== 0) fail('an empty window should give no points');

const span = extentOf(trace);
if (span?.min.value !== 5 || span?.max.value !== 30) fail(`extentOf gave ${JSON.stringify(span)}`);
if (extentOf([]) !== null) fail('extentOf of nothing should be null');

if (valueAt(trace, 250)?.value !== 30) fail('valueAt should hold the previous reading');
if (valueAt(trace, 400)?.value !== 20) fail('valueAt should include a reading on the instant');
if (valueAt(trace, 50) !== null) fail('valueAt before the first reading should be null');

// Decimation exists to fit the screen, but a spike is the thing being looked
// for, so it must survive being thinned.
const spiky: TracePoint[] = [];
for (let i = 0; i < 1000; i += 1) spiky.push({ at: i * 100, value: i === 500 ? 999 : 1 });
const thinned = decimate(spiky, 50);
if (thinned.length > 110) fail(`decimate returned ${thinned.length} points, expected ~100`);
if (!thinned.some((point) => point.value === 999)) fail('decimate lost the spike');
for (let i = 1; i < thinned.length; i += 1) {
  if (thinned[i].at < thinned[i - 1].at) fail('decimate returned points out of order');
}
if (decimate(trace, 50) !== trace) fail('a short series should be returned untouched');

const rpm = getPidDefinition('0C')!;
const idle = scaleFor(rpm, [
  { at: 1, value: 800 },
  { at: 2, value: 820 },
]);
if (idle.max - idle.min <= 0) fail('scaleFor produced an empty scale');
if (idle.min < rpm.min || idle.max > rpm.max) fail('scaleFor left the readable range');
// A near-flat signal must not be magnified into apparent noise.
if (idle.max - idle.min < (rpm.max - rpm.min) * 0.1 - 1e-9) fail('scaleFor ignored the span floor');
const full = scaleFor(rpm, [
  { at: 1, value: rpm.min },
  { at: 2, value: rpm.max },
]);
if (full.min !== rpm.min || full.max !== rpm.max) fail('scaleFor should fit the whole range');
if (scaleFor(rpm, []).max !== rpm.max) fail('an empty series should fall back to the full range');

console.log(`  ring, window, extent, hold, decimation and scaling`);

// ── 13. Trace groups only offer what the car reports ─────────────────────────
section('Trace groups');

for (const group of TRACE_GROUPS) {
  for (const pid of group.pids) {
    if (!getPidDefinition(pid)) fail(`group ${group.id} names unknown PID ${pid}`);
  }
  if (group.hint.length < 40) fail(`group ${group.id}: hint is thin`);
}

// No discovery yet means everything is offered rather than nothing.
if (availableGroups([]).length !== TRACE_GROUPS.length) fail('an empty PID list should offer every group');
const sparse = availableGroups(['0C', '04']);
if (sparse.length !== 2) fail(`a car with only 0C and 04 should get two groups, got ${sparse.length}`);
if (sparse[0].pids.join(',') !== '0C,04') fail(`unsupported PIDs survived: ${sparse[0].pids}`);
if (availableGroups(['FF']).length !== 0) fail('a car reporting none of them should get no groups');

console.log(`  ${TRACE_GROUPS.length} groups`);

// ── 14. The exported CSV is a well-formed table ──────────────────────────────
section('CSV export');

/** Splits a CSV row the way a spreadsheet does, honouring quoted fields. */
const splitCsvRow = (row: string): string[] => {
  const fields: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (quoted) {
      if (char === '"' && row[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields;
};

// PID 06 is "Short term fuel trim, bank 1" — a name with a comma in it, which
// is exactly the header that used to split a table into the wrong shape.
const csvSeries = [
  {
    definition: getPidDefinition('05')!,
    points: [
      { at: 1_700_000_000_000, value: 82 },
      { at: 1_700_000_001_000, value: 84 },
    ],
  },
  {
    definition: getPidDefinition('06')!,
    points: [{ at: 1_700_000_000_500, value: -3.9 }],
  },
];

for (const prefs of systems) {
  const csv = buildTraceCsv(csvSeries, prefs);
  const rows = csv.trimEnd().split('\r\n');

  if (rows.length !== 4) fail(`${prefs.system}: expected a header and three rows, got ${rows.length}`);
  if (/NaN|undefined|Infinity/.test(csv)) fail(`${prefs.system}: junk in the CSV`);

  const widths = new Set(rows.map((row) => splitCsvRow(row).length));
  if (widths.size !== 1) fail(`${prefs.system}: ragged rows, widths ${[...widths].join('/')}`);
  if (!widths.has(4)) fail(`${prefs.system}: expected 4 columns, got ${[...widths]}`);

  const header = splitCsvRow(rows[0]);
  if (!header[2].startsWith('Engine coolant temperature')) fail(`${prefs.system}: bad header ${header[2]}`);
  if (!header[3].startsWith('Short term fuel trim, bank 1')) {
    fail(`${prefs.system}: the comma in a PID name was not quoted: ${header[3]}`);
  }

  // The trim is read half a second after the first coolant sample, so its cell
  // must be empty on the first row rather than borrowed from the future.
  if (splitCsvRow(rows[1])[3] !== '') fail(`${prefs.system}: a value appeared before it was read`);
  if (splitCsvRow(rows[2])[2] !== splitCsvRow(rows[1])[2]) {
    fail(`${prefs.system}: the previous coolant reading was not held`);
  }
  if (splitCsvRow(rows[3])[1] !== '1.000') fail(`${prefs.system}: elapsed seconds are wrong`);
}

if (buildTraceCsv([], systems[0]) !== '') fail('an empty trace should export nothing at all');
if (buildTraceCsv([{ definition: getPidDefinition('05')!, points: [] }], systems[0]) !== '') {
  fail('a trace with no points should export nothing at all');
}

console.log(`  checked across ${systems.length} unit systems`);

// ── Result ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('All checks passed.');
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
