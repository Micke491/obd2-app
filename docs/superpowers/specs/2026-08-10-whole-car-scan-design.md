# Whole-car scanning, a parts picker, and vehicle identity

Date: 2026-08-10
Status: approved, not yet implemented

## The problem

The app reads services `03`, `07` and `0A`. Those return codes from the
emissions-related control units only — the engine computer, and on some cars the
transmission. Every other module in the car keeps its faults to itself, so an
ABS light, an airbag light or a stability-control fault produces nothing
anywhere in this app. The Vehicle screen already says so:

> ABS, airbag and comfort modules speak manufacturer-specific protocols and
> cannot be reached over generic OBD-II, so a warning light for one of those
> will not appear anywhere in this app.

That note is more pessimistic than the hardware. An ELM327 can address any
module on the bus; what it cannot do is know which address each module lives at,
because that mapping is defined per brand and published by nobody. This design
finds the modules instead of knowing them.

The second half of the note stays true and stays on screen: most of what those
modules store is brand-specific, and this app will not invent meanings for it.

## What is being built

1. **A whole-car scan.** Sweep the diagnostic address range, ask whoever answers
   for their stored faults, report every module that replied.
2. **A parts picker.** After one sweep, the modules found are offered by name so
   a later scan can read just the brakes, or just the airbags, in about a second
   each.
3. **Vehicle identity.** Decode the VIN the app already reads into manufacturer,
   country and model year.

## What is deliberately not being built

- **No clearing codes on non-engine modules.** Reading is inherently safe;
  erasing an airbag fault that has not been repaired is not. Engine clearing
  (service `04`) is untouched.
- **No brand-specific data of any kind.** No module address tables, no
  brand DTC meanings, no VIN model decoding. Every one of those is a table
  somebody reverse-engineered, incomplete by nature, and wrong in exactly the
  way this codebase already refuses to be wrong about unlisted trouble codes.
- **No non-CAN scanning.** K-line and J1850 cars get the engine-only path and an
  explanation. Reaching their non-engine modules needs per-brand initialisation
  sequences, which is the previous point.
- **No network access.** The app stays fully offline.

## Decisions taken, and why

| Decision | Chosen | Rejected |
|---|---|---|
| Module discovery | Sweep and see who answers | Per-brand address tables |
| Address coverage | All 256 of `0x700`–`0x7FF` | A curated shortlist that is silently incomplete |
| Scan scope UI | Whole car, engine only, or picked parts | Depth-only switch |
| Parts list | Earned by one sweep, then remembered per VIN and re-verified on connect | Rebuilt every session; or trusted forever without re-checking |
| Vehicle identity | Manufacturer, country, year — the standardised characters only | A model guess from the manufacturer-defined characters |

## Architecture

Pure logic separated from the transport, the way `handshake-plan.ts` and
`protocol.ts` already are. Everything that decides what to send, or what a reply
means, runs without an adapter and is checked in `scripts/selfcheck.ts`.

```
src/lib/obd/uds/
  addressing.ts     candidate addresses per protocol; CAN filter/mask arithmetic
  services.ts       UDS and KWP request builders; reply parsers; NRC handling
  faults.ts         4-byte UDS fault decoding -> code, failure type, status bits
  classify.ts       module -> part, from its self-reported name or its codes
  parts.ts          the part vocabulary and its labels

src/lib/obd/vin.ts  WMI -> manufacturer and country; year character; check digit

src/features/scan/
  lib/scan-plan.ts        scope + known map -> the ordered list of steps
  lib/module-map.ts       the discovered map: merge, staleness, part grouping
  lib/module-map-store.ts AsyncStorage persistence, keyed by VIN
  context/vehicle-scan-provider.tsx   runs a plan against the client
  screens/scan-scope-screen.tsx       the picker
```

The provider does no reasoning. It walks the steps a plan gives it, hands each
reply to a parser, and collects the result.

## The sweep

### Preconditions

CAN only, decided from `client.protocol`. The car must be stationary with the
ignition on; the scope screen says so and requires a confirmation before a
sweep, because several hundred diagnostic requests is not something to send at
speed.

### Link settings

Set before the sweep and restored in a `finally` on every exit path, including
abort and adapter loss. The restore values are the ones
`ADAPTER_INIT_SEQUENCE` establishes.

| Command | Why | Restored to |
|---|---|---|
| `ATCF700` | Receive filter (11-bit only) | `ATAR` |
| `ATCM700` | Receive mask (11-bit only) | `ATAR` |
| `ATST19` | ~102 ms reply window (`0x19` × 4.096 ms); most addresses are silent | `ATSTFF` |
| `ATAT0` | Fixed timing | `ATAT1` |

AT parameters are hexadecimal, so `ATST19` is 25 × 4.096 ms. Commands are
written without spaces, matching `ADAPTER_INIT_SEQUENCE`.

### Headers stay off

An earlier draft of this design turned headers on (`ATH1`) so each reply would
carry its responder's CAN ID. That would have broken every request in the sweep.

`acceptsReply` pairs a reply with the command waiting for it by checking that the
reply opens with the expected response mode — `59` for a `19` request. It refuses
to search for a two-character marker anywhere later in the frame, deliberately,
because `43` appears inside the ordinary mode 01 answer `414300` and accepting
that as a stored-code list is how a healthy car grows a fault. With headers on
the frame reads `7E85901FF010002`, which opens with the header and not with
`59`, so every reply would be discarded as belonging to another command and every
probe would time out.

Measured against the real matcher, headers off works for the whole feature
already, with no change to `reply-match.ts`:

| Reply | `acceptsReply` |
|---|---|
| `5901FF010002` (positive) | accepted |
| `7F1911` (negative) | accepted |
| `NO DATA` (silent address) | accepted |
| `62F1974142530000` (`22F197`) | accepted |
| `5801C03508` (KWP `18`) | accepted |
| `7E85901FF010002` (headers on) | **refused** |

Nothing is lost. A module is identified by the address the app asked, which is
what a targeted re-read needs; the responder's own ID was only ever going to be
decoration.

The filter is the piece that makes this work without brand data. An ELM327
accepts a frame when `(id & mask) == (filter & mask)`, so mask `0x700` with
filter `0x700` admits `0x700`–`0x7FF` and rejects everything below it. Every
diagnostic responder is in that band and no normal bus traffic is, so the app
can leave the response address unspecified and let the module identify itself.
Without this, the response ID would have to be derived from the request ID, and
there is no rule for that: VAG offsets by `0x6A`, BMW addresses through a tester
ID of `0x6F1`, others differ again.

`ATAT0` matters for the same reason it matters in `connectEcu`. Adaptive timing
learns a deadline from the replies it has seen, and a sweep is hundreds of
silent probes followed by one slow module. Leaving it adaptive teaches the
adapter a window too short for the module that was going to answer.

### Phase 1 — discovery

For every candidate address:

```
ATSH <addr>
1901AF
```

`19 01` is `reportNumberOfDTCByStatusMask`. It answers in a single short frame
and does two jobs at once: any reply at all proves a module is there, and a
positive reply carries the fault count outright. The sweep therefore knows which
modules exist and how many faults each holds before fetching a single code.

| Reply | Meaning |
|---|---|
| `59 01 <avail> <fmt> <count-hi> <count-lo>` | Module present, count known |
| `7F 19 11` (serviceNotSupported) | Module present, speaks KWP — mark for the `18` fallback |
| `7F 19 12` / `7F 19 31` | Module present, different mask needed — retry once with `190108` |
| `7F 19 <other>` | Module present, not answering now — record as present, count unknown |
| `7F 19 78` | Response pending — wait one further reply window, then read again |
| Silence | Nothing at that address |

### Replies are parsed raw, not through `parseResponse`

A negative response is the sweep's most valuable signal — `7F 19 11` proves a
module is there and tells us it speaks KWP rather than UDS. But `parseResponse`
folds every negative response into `{ ok: false, reason: 'The car does not
support this service' }`, which throws the NRC byte away and reports the module's
answer as a failure.

So the scan calls `client.sendCommand()` and parses the raw string with its own
parser in `services.ts`. `client.query()` is not used. Nothing in `protocol.ts`
changes — mode 03 keeps the behaviour it has, which is correct for mode 03.

### Trouble reporting is suspended for the sweep

`Elm327Client` reports the link as broken after `TROUBLE_THRESHOLD` (4)
consecutive failed commands, and the connection provider responds by restarting
the link. A sweep is hundreds of probes at unanswered addresses, so a run of four
timeouts is normal rather than evidence of anything.

Silence measured as `NO DATA` is already safe — `linkReplyHealth` returns
`neutral` for it on a `19` request — but a genuine timeout is not. The client
gains `suspendTroubleReporting(boolean)`; the scan provider sets it for the
duration of a sweep and clears it in the same `finally` that restores the link
settings.

Candidate addresses:

- **11-bit CAN** (protocols `6`, `8`): `0x700`–`0x7FF`, excluding `0x7DF`, which
  is the OBD functional broadcast and would produce several modules answering
  one request. 255 addresses.
- **29-bit CAN** (protocols `7`, `9`): `18DA{tt}F1` for `tt` = `0x00`–`0xFF`,
  excluding `0x33` for the same reason. 255 addresses.

  29-bit does **not** use the band filter. ISO 15765-4 normal fixed addressing
  makes the response ID derivable — `18DAF1{tt}` — so each address sets
  `ATCRA18DAF1{tt}` instead, which is exact rather than a band. `ATCF`/`ATCM`
  are not sent at all on 29-bit, since `ATCRA` would override them anyway and
  having both set is the kind of half-applied configuration that is impossible
  to reason about afterwards.

Order: `0x7E0`–`0x7E7` first, because those are the legislated addresses and the
engine is almost certainly among them, so the first result appears within a
second. Then the rest ascending.

### Phase 2 — interrogation

Only for addresses that answered phase 1.

```
1902AF     full fault list, only when the phase 1 count is non-zero
22F197     the module's own name for itself
```

`19 02` is `reportDTCByStatusMask`; the reply is `59 02 <avail>` followed by four
bytes per fault. `22 F197` is `ReadDataByIdentifier` for
`systemNameOrEngineType`; the reply is `62 F1 97` followed by ASCII. Many
modules implement it, some do not, and a refusal is not an error.

KWP fallback for modules that refused `19` with NRC `0x11`:

```
1800FF00   readDiagnosticTroubleCodesByStatus, all groups
```

The reply is `58 <count>` followed by three bytes per fault: a two-byte code and
a status byte.

### Cost

| Scan | Requests | Time |
|---|---|---|
| Whole car | 255 × (`ATSH` + `1901AF`), then ~10 modules × 2 | ~40 s |
| Picked parts | 2 per part | ~1 s per part |
| Re-verify on connect | 1 per remembered module | ~2 s |
| Engine only | Unchanged: `0101`, `03`, `07`, `0A` | ~3 s |

### Progress and abort

The provider reports `{ done, total, foundSoFar }` after every address. Forty
seconds is long enough to want out, so the scope screen shows an abort button
throughout; aborting keeps whatever was found and restores the link settings.

## Faults

A UDS fault is four bytes.

| Bytes | Meaning | Handling |
|---|---|---|
| 1–2 | The code, in the same encoding mode 03 uses | Straight into the existing `decodeDtcBytes(a, b)` — `C0035` falls out unchanged |
| 3 | Failure type byte, ISO 14229 Annex D | Displayed as a suffix: `C0035-11` |
| 4 | Status bits | Bit 0 `testFailed`, bit 3 `confirmedDTC` |

The status byte is worth something mode 03 cannot offer: it separates a fault
that is **failing right now** from one **stored from a previous drive**. Both
are shown, labelled.

Failure type bytes are standardised and get a short label table — `0x11` short
to ground, `0x12` short to battery, `0x1C` out of range, and so on — with an
unknown byte shown as its hex value rather than a guess.

Resolution is unchanged: every code goes through `resolveDtcDetail`. A generic
code gets the full explanation the catalog already holds. A brand code gets the
honest family text the app already produces for unlisted codes. **The catalog is
not touched by this work.**

## Parts

A fixed, small vocabulary:

`engine`, `transmission`, `brakes`, `restraints`, `steering`, `suspension`,
`body`, `instruments`, `network`, `other`

Each discovered module is classified in this order, stopping at the first hit:

1. **Its own name.** The `22F197` ASCII matched against keyword patterns — `ABS`,
   `ESP`, `DSC`, `SRS`, `AIRBAG`, `EPS`, `LENK`, `GETRIEBE`, `KOMBI`, and so on,
   covering the English and German words that appear in practice.
2. **The letters of the codes it stores.** `C` is chassis and maps to brakes,
   `B` to body, `U` to network, `P` to engine. Only usable when the module has
   faults, which is when it matters most.
3. **The legislated addresses.** `0x7E0`–`0x7E7` is powertrain by definition.
4. **`other`**, labelled by its address — "Unknown module at 0x7A8".

Step 1 is a keyword match on a name the module itself supplied. It is not a
brand table, and it never invents a name.

## The scope screen

Replaces the single "Read codes" button on the Codes screen.

**Before a car has been swept**, two choices: *Whole car* (~40 s) and *Engine
only* (~3 s), plus an explanation that the individual parts appear once the app
has found them.

**After a sweep**, the same two plus a checklist of the parts actually found,
each with its address, and an estimate that updates with the selection.

**On a non-CAN car**, only *Engine only*, with the protocol named — "This car is
on ISO 9141-2. Only the engine can be reached on that bus."

Results are grouped by module, most faults first, with filter chips by part. A
module that answered with no faults is listed too, collapsed, because "the
airbag module is fine" is an answer worth having.

## Remembering the car

Keyed by VIN, in AsyncStorage under `scan.module-map.v1.<vin>`:

```ts
type StoredModuleMap = {
  version: 1;
  vin: string;
  protocolId: string;
  discoveredAt: string;      // ISO date
  modules: {
    requestId: string;       // "7E0" — the address asked, which is all a re-read needs
    part: Part;
    name: string | null;     // from 22F197, null when it did not answer
    lastSeenAt: string;
  }[];
};
```

A car with no readable VIN gets no persistence and falls back to session-only.

**Re-verify on connect.** When a saved map matches the connected car's VIN, the
app pings each remembered address with `1901AF` — about two seconds — before
showing the picker. A module that does not answer is marked **stale**, not
deleted: a module that is asleep is not a module that has been removed. Stale
entries are shown greyed with the date they were last seen, and a *Find modules
again* button re-runs the full sweep.

This is the one piece of remembered state in the app, and `05936bb` removed the
last lot deliberately. The difference is what it is remembering: adapter ranking
was a guess about hardware that changed the connection path, and getting it
wrong meant not dialling the adapter that would have worked. This is an
observation about one specific car, verified on every connect, and its failure
mode is a two-second ping followed by a greyed row.

## Vehicle identity

`src/lib/obd/vin.ts`, pure, from the VIN the Vehicle screen already reads:

- **Characters 1–3, the WMI** → manufacturer and country of build. Assigned by
  SAE and ISO, published, stable. Roughly 150 entries covers every brand
  somebody is likely to plug this into.
- **Character 9** → check digit. North American VINs carry a weighted checksum;
  verifying it proves the VIN was read off the bus correctly rather than
  corrupted. European VINs frequently do not use it, so a failure is reported as
  "not verifiable", never as "wrong".
- **Character 10** → model year, from the standard cycle.

Characters 4–8 and 11 are manufacturer-defined and are **shown but not
interpreted**. The Vehicle screen displays the VIN with its segments annotated,
saying plainly that the middle section is the manufacturer's own coding.

An unparseable or implausible VIN yields nothing rather than a wrong
manufacturer.

## Error handling

| Situation | Behaviour |
|---|---|
| Not a CAN protocol | Scope screen offers engine only, naming the protocol |
| Adapter drops mid-sweep | Keep partial results, report how far it got — the principle of `4d3ff33` |
| User aborts | Keep partial results, restore link settings |
| Module answers phase 1 but not phase 2 | Listed with its count and "could not read the list" |
| Module answers `7F 19 78` (pending) | One further wait, then treated as unreadable |
| No module answers at all | "Nothing on this car answered outside the engine" — a real answer, not an error |
| Link settings fail to restore | Force a full `recover()` rather than leaving the adapter filtered |

## Testing

Everything below runs in `scripts/selfcheck.ts` with no adapter, no car and no
device, matching how the rest of this app's logic is checked.

**Addressing**
- `0x700`–`0x7FF` generated, `0x7DF` excluded, `0x7E0`–`0x7E7` ordered first
- 29-bit candidates well formed, `0x33` excluded
- filter arithmetic: `(0x7A8 & 0x700) == 0x700` admits, `(0x6FF & 0x700)` rejects
- every link setting set by the sweep has a restore command

**Services**
- positive `59 01` parsed to a count; `59 02` to a fault list
- each NRC routed correctly, including `0x11` to the KWP fallback
- multi-frame replies with headers on, which is a frame shape the existing
  parser has never seen
- a reply from an address other than the one asked is attributed to its real
  responder, not the request

**Faults**
- 4-byte decoding against known samples, including that bytes 1–2 through
  `decodeDtcBytes` give the same string mode 03 would have given
- status bits: failing-now versus stored
- unknown failure type bytes render as hex rather than a guess

**Classification**
- precedence: name beats code letters beats legislated address beats `other`
- a module with no name and no faults lands in `other` with its address

**Plans**
- whole-car plan contains discovery; a picked-parts plan does not
- a picked-parts plan touches only the addresses picked
- engine-only plan is byte-for-byte what the app sends today

**Module map**
- merge keeps a module that answered and marks a silent one stale rather than
  dropping it
- a map for a different VIN is never applied

**VIN**
- WMI lookup, year character, check digit on a known-good North American VIN
- a corrupted VIN yields nothing rather than a wrong manufacturer
- a European VIN with no check digit reports "not verifiable"

## Build order

Three commits, each independently useful and independently checkable.

1. **The UDS layer.** `addressing`, `services`, `faults`, `classify`, `parts`,
   and their tests. No UI, no transport. Provable on its own.
2. **The scan engine and the picker.** Plan, map, store, provider, scope screen,
   grouped results.
3. **Vehicle identity.** `vin.ts` and the Vehicle screen changes. Independent of
   1 and 2, and could be done first if the scan work stalls on hardware.
