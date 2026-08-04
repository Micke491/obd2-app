/**
 * Pure-logic checks that need no adapter, no car and no device.
 * Run with: npx tsx <this file>
 */
import { AUTHORED, AUTHORED_CODES } from '../src/lib/obd/dtc/authored';
import { DTC_CATALOG } from '../src/lib/obd/dtc/catalog';
import { isValidCode } from '../src/lib/obd/dtc/derive/parse';
import { resolveDtcDetail } from '../src/lib/obd/dtc/resolve';
import { PID_DEFINITIONS } from '../src/lib/obd/pids';
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

// ── Result ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('All checks passed.');
} else {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
