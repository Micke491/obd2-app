# Choosing a scan, and watching it run

## The problem

Reading trouble codes takes seconds, and the app says almost nothing while it
happens. A driver who does not already know that presses Read again, and again.

Two things are missing. The first is feedback a person cannot miss or mistake
for a dead button. The second is a choice: v2.8.0 can sweep the whole car, but
the only way to ask for less than everything is a checklist of parts that have
already been found, on a screen most drivers will never reach.

## The flow

One tab, four steps, no navigation:

```
[Read codes] -> Choose -> Confirm -> Progress -> results on the tab
                   ^________|           |
                  (Cancel)          (Stop keeps what it found)
```

The choose and confirm phases are dismissible. **The progress phase is not** --
no backdrop tap, no back gesture, no Android hardware back. Stop is the only
way out of it. That is what fixes the repeated press: the button that started
the scan is behind a sheet and cannot be reached until the scan is over.

## The menu

Every part is listed, every time. A menu that hides what it cannot do leaves a
driver guessing whether the app is limited or the car is; a greyed row with a
reason answers that question without being asked.

| Row | Available when | Hint when greyed |
| --- | --- | --- |
| Whole car | anything at all is reachable | -- |
| Engine | always | -- |
| The named parts | the module map has modules filed under that part | see below |

The named parts are Brakes and stability, Airbags and restraints, Steering,
Transmission, Suspension, Body and comfort, Instruments, Network -- `PART_ORDER`
minus `engine` and `other`, in that order, so the menu and the results list
agree.

`other` is left out of the greyed rows deliberately. It is the catch-all for a
module whose address matched no known pattern, so "Other modules -- not found
yet, scan the whole car to look for it" describes nothing a driver could want
or recognise. It appears as a tickable row only when the map actually has
modules filed under it, and never as a greyed one.

Two reasons a part is greyed, and they are not the same fact:

- **Not CAN.** `addressingFor()` returned null, so no module beyond the engine
  can be addressed at all. *"This car's protocol can't reach it."* Permanent
  for this car; scanning will not change it.
- **Not found yet.** CAN, but no whole-car sweep has filed a module under that
  part. *"Not found yet -- scan the whole car to look for it."* Temporary, and
  the hint names the cure.

**Whole car is available whenever any row is**, which in practice means always,
since Engine always is. A car that reveals only an engine and a gearbox can
still be scanned whole -- "whole" means everything reachable, not everything
listed. It greys only if nothing is reachable, which is the no-connection case.

This lives in `scan-menu.ts` as a pure function of `addressing` and the module
map, so the rules above are checkable in `selfcheck.ts` without a car.

## What each choice reads

`ScanScope` already distinguishes the three, and `buildScanPlan` already turns
each into steps. One correction:

**Whole car currently never reads mode 03/07/0A.** `confirmWholeScan` calls
`scan({kind:'whole'})` and nothing else, so a whole-car scan returns module
faults and no engine P-codes at all -- the driver has to run "Engine only"
separately to get the codes they came for. Whole car will mean **engine codes
then module sweep**, under one progress bar. This is the fix that makes "when
the scan finishes you get all the fault codes" true.

| Choice | Reads |
| --- | --- |
| Whole car | mode 03/07/0A, then a sweep of every address on the bus |
| Engine | mode 03/07/0A |
| Ticked parts | the addresses filed under those parts |

## Progress, and stopping

Two engines report progress and the sheet shows whichever is running:

- `useVehicleScan().progress` -- `{done, total, found}`, already wired through
  `runScan`, already respects `stopRef`.
- `useTroubleCodes()` -- **new.** `read()` is four sequential queries (`0101`,
  `03`, `07`, `0A`) with no progress and no way out. It gains a step count and
  a stop check between steps. Four steps is coarse, but it is honest, and it
  makes Stop work on the engine-only path rather than being a button that lies.

Stop keeps what it found. This is already how the scan engine behaves --
`foldScanIntoMap` folds on `result.visited` rather than the plan, so addresses
never reached keep what they had, and a stopped sweep reports the modules that
answered before it stopped. The sheet does not need to add anything; it needs
to not throw the result away.

A module that was asked and stayed quiet is marked stale, not deleted. A scan
that was stopped before reaching a module leaves it exactly as it was.

## Files

| File | Change |
| --- | --- |
| `src/components/sheet.tsx` | New. The app has no modal primitive. Wraps RN `Modal`, themed, with a `dismissible` flag the progress phase sets false. |
| `src/features/scan/lib/scan-menu.ts` | New. Pure: `(addressing, map) -> MenuRow[]`, each row available or greyed with a reason. |
| `src/features/scan/components/scan-sheet.tsx` | New. The three phases as one state machine. |
| `src/features/dtc/screens/codes-screen.tsx` | Footer returns to "Read codes"/"Read again", opening the sheet instead of pushing `/scan`. |
| `src/features/dtc/context/trouble-codes-provider.tsx` | `read()` gains step progress and a stop check. |
| `src/features/scan/screens/scan-scope-screen.tsx` | Deleted, with its `/scan` route. |
| `scripts/selfcheck.ts` | Checks for the menu rules. |

`run-scan.ts`, `scan-plan.ts`, `module-map.ts` and the providers' scan logic are
untouched. This is a new way to ask, not a new engine.

### Why the old screen goes

`scan-scope-screen.tsx` does this job already, on a route the codes screen is
the only entrance to. Keeping both would leave two UIs for one task, diverging
on every later change, and a driver reaching a different one depending on which
button they pressed. Its logic is not lost -- the part checklist, the duration
estimates and the asleep badges all move into the sheet.

## Testing

`selfcheck.ts` covers the pure part, which is the part with rules worth stating:

- A null addressing greys all eight named parts with the protocol reason,
  leaves Engine available, and leaves Whole car available.
- A CAN addressing with an empty map greys the eight with the not-found reason.
- A CAN addressing with brake modules in the map offers Brakes and greys the
  other seven.
- `other` never appears greyed, and does appear once the map files a module
  under it.
- Whole car is greyed only when no row is available.
- Row order matches `PART_ORDER`.

The sheet itself is checked by running the app: the phases advance, the
progress phase refuses to dismiss, Stop returns partial results, and Cancel at
the confirm step asks the car nothing at all.
