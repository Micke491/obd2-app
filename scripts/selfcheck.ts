/**
 * Pure-logic checks that need no adapter, no car and no device.
 * Run with: npx tsx <this file>
 */
import { looksLikeObdAdapter, rankAdapterCandidates } from '../src/features/connection/lib/adapter-ranking';
import { ADAPTER_INIT_SEQUENCE } from '../src/features/connection/lib/at-commands';
import { humanizeBluetoothError } from '../src/features/connection/lib/bluetooth-errors';
import { buildHandshakePlan, worstCaseDuration } from '../src/features/connection/lib/handshake-plan';
import { AUTHORED, AUTHORED_CODES } from '../src/lib/obd/dtc/authored';
import { DTC_CATALOG } from '../src/lib/obd/dtc/catalog';
import { isValidCode } from '../src/lib/obd/dtc/derive/parse';
import { parseDtcList } from '../src/lib/obd/dtc/parser';
import { resolveDtcDetail } from '../src/lib/obd/dtc/resolve';
import { PID_DEFINITIONS } from '../src/lib/obd/pids';
import { PROTOCOL_NAMES, PROTOCOL_SWEEP, describeProtocolReply } from '../src/lib/obd/protocols';
import { extractPayload, markerOffset, parseResponse } from '../src/lib/obd/protocol';
import { acceptsReply, linkReplyHealth, type LinkReplyHealth } from '../src/lib/obd/reply-match';
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

// ── 12. Protocols can be named one at a time ─────────────────────────────────
section('Protocol sweep is well formed');

const seen = new Set<string>();
for (const protocol of PROTOCOL_SWEEP) {
  if (!/^[1-9A-C]$/.test(protocol.id)) fail(`protocol "${protocol.id}" is not an ELM327 protocol`);
  if (seen.has(protocol.id)) fail(`protocol ${protocol.id} is swept twice`);
  seen.add(protocol.id);
  if (protocol.name !== PROTOCOL_NAMES[protocol.id]) fail(`protocol ${protocol.id} has two names`);
  if (protocol.probeTimeoutMs < 3000) fail(`protocol ${protocol.id} is given no time to initialise`);
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

// A car that has already answered goes straight back to the bus it answered on,
// and does not get asked about it a third time further down the plan.
const warm = buildHandshakePlan('3');
if (!warm[0].label.includes('ISO 9141-2')) fail(`a known protocol should be named: ${warm[0].label}`);
if (warm.some((step) => step.select === '3')) fail('the known protocol is swept as well as armed');
if (warm.length !== cold.length - 1) fail('a known protocol should save exactly one step');

// A failed attempt has to end. Somebody sitting in a car with the adapter in
// their glovebox should get an answer inside a couple of minutes, not sit
// through every timeout the protocol list can offer.
const worst = worstCaseDuration(cold);
if (worst > 120000) fail(`a hopeless connection would take ${Math.round(worst / 1000)}s to fail`);
console.log(`  ${cold.length} steps, at most ${Math.round(worst / 1000)}s before giving up`);

// ── 14. Every plugged-in adapter gets a turn ─────────────────────────────────
section('Adapter candidates');

const dev = (name: string, address: string) => ({ name, address });
const order = (devices: Array<{ address: string }>) => devices.map((device) => device.address).join(',');

const pairedLot = [dev('Car Stereo', 'AA'), dev('OBDII', 'BB'), dev('Vgate iCar Pro', 'CC')];

// The remembered adapter leads but the other OBD-looking one still follows —
// swapping adapters must not end the attempt at the first dead socket.
if (order(rankAdapterCandidates(pairedLot, 'CC')) !== 'CC,BB') {
  fail(`swap case gave ${order(rankAdapterCandidates(pairedLot, 'CC'))}`);
}
// A remembered address that is no longer paired falls back to the heuristic.
if (order(rankAdapterCandidates(pairedLot, 'ZZ')) !== 'BB,CC') fail('stale remembered address was not ignored');
if (order(rankAdapterCandidates(pairedLot, null)) !== 'BB,CC') fail('name heuristic no longer ranks');
// Remembering a device the heuristic would never pick must still work.
if (order(rankAdapterCandidates([dev('WEIRD-NAME', 'AA'), dev('Headset', 'BB')], 'AA')) !== 'AA') {
  fail('a remembered oddly-named adapter was dropped');
}
if (order(rankAdapterCandidates([dev('Mystery', 'AA')], null)) !== 'AA') {
  fail('a single paired device should be tried whatever its name');
}
if (rankAdapterCandidates([dev('Car Stereo', 'AA'), dev('Headset', 'BB')], null).length !== 0) {
  fail('two non-OBD devices should rank nothing rather than guess');
}
if (!looksLikeObdAdapter(dev('V-LINK scan tool', 'AA'))) fail('name matching lost its separators tolerance');

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
if (!ADAPTER_INIT_SEQUENCE.some((step) => step.cmd === 'ATAT1')) {
  fail('adaptive timing must stay on so a fast car is not slowed to the ceiling');
}

// ── Result ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('All checks passed.');
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
