# Scanner

An offline OBD-II diagnostic app for Android. It talks to a cheap ELM327
Bluetooth adapter plugged into a car's diagnostic port and turns what the car
says into something readable — live sensor values, trouble codes with real
explanations, readiness monitors, and a sweep that finds control modules
generic OBD-II alone will not reach.

Everything runs on the phone. There is no account, no server, and no network
call anywhere in the app.

## What it does

**Live data**

- **Dashboard** — revs, speed and the handful of readings worth watching while
  the car is running.
- **Live data** — your pinned sensors, polled as fast as the adapter allows.
- **All sensors** — every one of the 68 standard readings the app knows,
  grouped and searchable, with the ones this particular car does not answer for
  hidden by default.

**Faults**

- **Trouble codes** — reads stored, pending and permanent codes (services `03`,
  `07` and `0A`). 52 codes are written out in full; 806 have an explanation in
  the catalog. A code with neither still gets an honest description worked out
  from where its number sits in the standard, and it says which of those it is
  rather than pretending to certainty it does not have.
- **Freeze frame** — the sensor snapshot the car saved at the moment a fault
  was recorded.
- **Readiness monitors** — which self-tests have finished, for both spark and
  compression ignition engines.
- **On-board test results** — the measurements behind those self-tests, and the
  limits the car judges them against, so a test passing at ninety-odd percent
  of its limit reads differently from one passing comfortably. Grouped by
  system and collapsed, with anything failing lifted to the top. The app asks
  the car which tests it has rather than guessing, names the monitors the
  standard lays out regularly, and reports the rest by number instead of
  inventing a name for them.
- **Code lookup** — search any code with no car attached, for when the number
  is written on a garage invoice.

**Whole-car scan**

Generic OBD-II reaches the engine and, on many cars, the transmission. Nothing
else. On a CAN car the scan sweeps the diagnostic address range `0x700`–`0x7FF`
(or the 29-bit equivalent), asks whoever answers for their stored faults with
UDS service `19`, and reports every module that replied — brakes, restraints,
steering, instruments and the rest. It takes about 40 seconds.

Modules found are remembered per VIN and re-verified on connect, so a later
scan can read just the brakes in about a second. A module that stops answering
is marked asleep rather than deleted.

**Read codes** asks what to read before it asks the car: the whole car, or any
combination of engine, brakes, airbags, suspension and the rest. Every part is
listed every time, including the ones this car cannot offer — a greyed row says
whether the protocol cannot reach it or a whole-car scan has simply not found it
yet, which are different problems with different cures. The scan then runs in a
panel that cannot be dismissed, showing what it is asking and how far along it
is, with a Stop that keeps whatever has already been read.

The scan reads only. Clearing codes stays where it was: engine module,
service `04`, nothing else. And no brand-specific data is used or invented
anywhere — modules are found by sweeping, and named only by what they call
themselves over `22 F197`.

Non-CAN cars (ISO 9141-2, KWP, J1850) get the engine-only path and are told
why.

**Vehicle details** — VIN, calibration IDs, CVN and ECU name, plus the
protocol actually negotiated with the car.

**Settings** — metric, imperial, US or per-quantity custom units; light, dark
or follow-the-phone; adapter polling and timeouts; keep-the-screen-on.

## Requirements

- **Android.** The app speaks Bluetooth Classic RFCOMM, which is how ELM327
  adapters work. iOS restricts that to MFi-certified hardware, which these
  adapters are not, so the Android build is the real target.
- **An ELM327 Bluetooth adapter.** Clones are fine and are most of what this
  was tested against.
- **Node 22** and npm for development.

## Getting started

```bash
npm install
```

The app depends on `react-native-bluetooth-classic`, a native module, so
**Expo Go will not run it**. You need a development build:

```bash
npx eas build --profile development --platform android
```

Install the resulting APK, then start the bundler and connect to it:

```bash
npm start
```

For a build you can just hand to somebody, use the `preview` or `production`
profile in `eas.json` — both produce an APK.

## Checks

```bash
npm run typecheck   # tsc --noEmit, strict
npm run check       # the self-check suite
```

`npm run check` runs `scripts/selfcheck.ts` — around 2,000 lines of assertions
over the protocol layer, the DTC catalog, the handshake plan, the UDS
addressing arithmetic, fault decoding, module classification, scan plans, the
module map and the mode 06 monitor tests. It needs no adapter, no car and no device, which is the point:
all the reasoning lives in pure functions that can be checked on a laptop.

## Layout

```
src/
  app/                 expo-router routes; (live) is the connection-guarded group
  components/          the shared UI kit — buttons, cards, rows, meters, text
  features/
    connection/        Bluetooth discovery, the ELM327 client, handshake, permissions
    dashboard/         driving gauges
    live-data/         pinned sensors
    sensors/           the full sensor list
    dtc/               trouble codes and their detail pages
    freeze-frame/      the saved snapshot
    monitors/          readiness and the on-board test walk
    scan/              scan scope, plans, the module map and its storage
    vehicle-info/      VIN and identity
    settings/          preferences and About
    hub/               the home screen and connect panel
  lib/
    obd/               protocol, PIDs, monitors, freeze frame, vehicle info
    obd/dtc/           the code catalog, authored entries, derivation rules
    obd/mode06/        monitor ids, test ids, the support-mask plan, record decoding
    obd/uds/           addressing, services, fault decoding, module classification
    storage/           AsyncStorage-backed settings
    units/             quantities, conversion, formatting
  theme/               tokens, palette, typography, themed styles
  hooks/               PID streaming, units, keep-awake
scripts/
  selfcheck.ts         the check suite
  make-icons.ps1       regenerates the app icons
```

The organising rule is that **nothing that decides what to send, or what a
reply means, touches the transport.** Address generation, handshake ordering,
reply matching, fault decoding and scan planning are all pure functions taking
plain data. The providers walk the steps a plan gives them and hand each reply
to a parser; they do no reasoning of their own. That is what makes the whole
protocol layer testable without hardware.

Paths are aliased: `@/*` resolves to `src/*`.

## What it deliberately does not do

- **No brand-specific tables.** No module address maps, no manufacturer DTC
  meanings, no model decoding from a VIN. Every one of those is somebody's
  reverse-engineered list, incomplete by nature, and wrong in exactly the way
  this app refuses to be wrong about codes it has never seen.
- **No clearing codes outside the engine module.** Reading is safe. Erasing an
  airbag fault that has not been repaired is not.
- **No network.** Not for code lookups, not for telemetry, not for anything.
- **No non-CAN module scanning.** Reaching non-engine modules on K-line and
  J1850 needs per-brand initialisation sequences, which is the first point
  again.

## A note on clearing codes

Clearing a code turns the light off without repairing anything. It also wipes
the readiness monitors, and until those finish running again the car will fail
an emissions test. If the fault is still there, the code comes back.

## License

MIT. See [LICENSE](LICENSE).
