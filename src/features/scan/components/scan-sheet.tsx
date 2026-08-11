import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Meter } from '@/components/meter';
import { Pill } from '@/components/pill';
import { CheckRow, ChoiceRow } from '@/components/rows';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useTroubleCodes } from '@/features/dtc/hooks/use-trouble-codes';
import type { Part } from '@/lib/obd/uds/parts';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { useVehicleScan } from '../hooks/use-vehicle-scan';
import { partStaleness } from '../lib/module-map';
import {
  UNAVAILABLE_REASONS,
  buildScanMenu,
  describeModules,
  requestIdsForMenu,
} from '../lib/scan-menu';
import { ENGINE_ONLY_SECONDS, buildScanPlan, estimateSeconds } from '../lib/scan-plan';

/**
 * What the driver ticked.
 *
 * `whole` is its own case rather than "every part ticked", because the two are
 * not the same request: ticking parts re-reads the addresses already known,
 * while `whole` sweeps every address on the bus looking for ones that have
 * never answered before.
 */
type Selection = { kind: 'whole' } | { kind: 'parts'; parts: Set<Part> };

/** Which half of a run is in flight. A whole-car scan does both, in order. */
type Stage = 'engine' | 'modules';

type Phase = 'choose' | 'confirm' | 'running';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/**
 * The scan flow, start to finish, without leaving the codes tab.
 *
 * Three phases in one panel: pick what to read, confirm it, then watch it
 * happen. The last of those is deliberately impossible to dismiss — the button
 * that started the scan sits behind this sheet, and a driver who cannot tell
 * whether a tap registered will press it again, and again, until something
 * visible happens.
 */
export function ScanSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { status } = useObdConnection();
  const { map, addressing, busy: scanBusy, progress: scanProgress, scan, stop: stopScan } = useVehicleScan();
  const { read, stop: stopRead, progress: readProgress } = useTroubleCodes();

  const [phase, setPhase] = useState<Phase>('choose');
  const [selection, setSelection] = useState<Selection>({ kind: 'whole' });
  const [stage, setStage] = useState<Stage>('engine');

  // Read by the run loop between its two halves, so Stop during the engine
  // read does not simply roll on into a several-hundred-address sweep.
  const stoppedRef = useRef(false);

  const connected = status === 'connected';
  const menu = useMemo(() => buildScanMenu(connected, addressing, map), [connected, addressing, map]);

  const ticked = selection.kind === 'parts' ? selection.parts : new Set<Part>();

  const sweepSeconds = addressing ? estimateSeconds(buildScanPlan({ kind: 'whole' }, addressing)) : 0;

  const estimate = useMemo(() => {
    if (selection.kind === 'whole') return ENGINE_ONLY_SECONDS + sweepSeconds;
    const engine = ticked.has('engine') ? ENGINE_ONLY_SECONDS : 0;
    const requestIds = requestIdsForMenu(menu, ticked);
    const parts = addressing
      ? estimateSeconds(buildScanPlan({ kind: 'parts', requestIds }, addressing))
      : 0;
    return engine + (requestIds.length > 0 ? parts : 0);
  }, [selection.kind, ticked, menu, addressing, sweepSeconds]);

  const chooseWhole = () => setSelection({ kind: 'whole' });

  const togglePart = (part: Part) => {
    setSelection((prev) => {
      const parts = prev.kind === 'parts' ? new Set(prev.parts) : new Set<Part>();
      if (parts.has(part)) parts.delete(part);
      else parts.add(part);
      return { kind: 'parts', parts };
    });
  };

  const nothingTicked = selection.kind === 'parts' && ticked.size === 0;

  const close = () => {
    setPhase('choose');
    onClose();
  };

  const stopEverything = () => {
    stoppedRef.current = true;
    stopRead();
    stopScan();
  };

  const run = async () => {
    stoppedRef.current = false;
    setPhase('running');

    const wantsEngine = selection.kind === 'whole' || ticked.has('engine');
    const requestIds = selection.kind === 'whole' ? [] : requestIdsForMenu(menu, ticked);

    // The engine's own codes come from mode 03/07/0A, which no address sweep
    // asks for. A whole-car scan that skipped this would return module faults
    // and none of the P-codes the driver came to read.
    if (wantsEngine) {
      setStage('engine');
      await read();
    }

    if (!stoppedRef.current) {
      if (selection.kind === 'whole') {
        setStage('modules');
        await scan({ kind: 'whole' });
      } else if (requestIds.length > 0) {
        setStage('modules');
        await scan({ kind: 'parts', requestIds });
      }
    }

    close();
  };

  if (phase === 'running') {
    const showingEngine = stage === 'engine';
    const fraction = showingEngine
      ? readProgress
        ? readProgress.done / readProgress.total
        : 0
      : scanProgress && scanProgress.total
        ? scanProgress.done / scanProgress.total
        : 0;

    return (
      <Sheet
        visible={visible}
        title="Scanning the car"
        subtitle="Leave the ignition on and the car stationary until this finishes."
        dismissible={false}
        onDismiss={close}
      >
        <View style={styles.progressBlock}>
          <AppText variant="bodyStrong">
            {showingEngine
              ? (readProgress?.label ?? 'Asking the engine computer')
              : scanProgress
                ? 'Looking for other modules'
                : 'Preparing the sweep'}
          </AppText>

          <View style={styles.meter}>
            <Meter fraction={fraction} height={6} />
          </View>

          <AppText variant="caption" tone="muted">
            {showingEngine
              ? readProgress
                ? `Step ${Math.min(readProgress.done + 1, readProgress.total)} of ${readProgress.total}`
                : 'Starting…'
              : scanProgress
                ? `${scanProgress.done} of ${scanProgress.total} addresses · ${scanProgress.found} module${scanProgress.found === 1 ? '' : 's'} found`
                : 'Starting…'}
          </AppText>
        </View>

        <Button label="Stop" variant="danger" icon="stop-circle-outline" onPress={stopEverything} />
        <AppText variant="caption" tone="faint" style={styles.stopNote}>
          Stopping keeps whatever has already been read.
        </AppText>
      </Sheet>
    );
  }

  if (phase === 'confirm') {
    const whole = selection.kind === 'whole';
    return (
      <Sheet visible={visible} title="Start the scan?" onDismiss={close}>
        <AppText variant="body" tone="muted">
          {whole
            ? `Every address on the bus will be asked whether anything is there, then each module that answers is read. About ${formatDuration(estimate)}.`
            : `About ${formatDuration(estimate)}. Only what you ticked is asked.`}
        </AppText>
        <AppText variant="caption" tone="muted" style={styles.confirmNote}>
          Make sure the car is stationary with the ignition on. Nothing is changed or cleared by
          scanning — it only asks.
        </AppText>
        <View style={styles.buttonRow}>
          <View style={styles.button}>
            <Button label="Cancel" variant="secondary" onPress={() => setPhase('choose')} />
          </View>
          <View style={styles.button}>
            <Button label="Scan" icon="radar" onPress={() => void run()} disabled={scanBusy} />
          </View>
        </View>
        {scanBusy ? (
          <AppText variant="caption" tone="muted">
            The adapter is busy checking modules found before. Try again in a moment.
          </AppText>
        ) : null}
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} title="What should I read?" onDismiss={close}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <ChoiceRow
          label="The whole car"
          hint={
            addressing
              ? `Everything that answers, engine included. About ${formatDuration(ENGINE_ONLY_SECONDS + sweepSeconds)}.`
              : 'Everything this car lets the adapter reach.'
          }
          selected={selection.kind === 'whole'}
          onPress={chooseWhole}
        />

        <AppText variant="eyebrow" tone="faint" style={styles.divider}>
          Or pick your own
        </AppText>

        <CheckRow
          label="Engine"
          hint="Confirmed, pending and permanent faults from the engine computer."
          checked={ticked.has('engine')}
          disabled={menu.engine.unavailable !== null}
          onPress={() => togglePart('engine')}
        />

        {menu.parts.map((row) => {
          // A module found before but quiet on the last check is still worth
          // ticking — it may simply have been asleep — so this is a badge on an
          // available row, not a reason to grey it out.
          const staleness = row.unavailable ? 'awake' : partStaleness(row.modules);
          return (
            <CheckRow
              key={row.part}
              label={row.label}
              hint={
                row.unavailable
                  ? UNAVAILABLE_REASONS[row.unavailable]
                  : describeModules(row.modules) || undefined
              }
              checked={ticked.has(row.part)}
              disabled={row.unavailable !== null}
              badge={
                staleness === 'awake' ? undefined : (
                  <Pill
                    label={staleness === 'asleep' ? 'Asleep' : 'Partly asleep'}
                    color={theme.color.inkFaint}
                    background={theme.color.surfaceSunken}
                  />
                )
              }
              onPress={() => togglePart(row.part)}
            />
          );
        })}
      </ScrollView>

      {selection.kind === 'parts' && ticked.size > 0 ? (
        <AppText variant="caption" tone="muted">
          About {formatDuration(estimate)} for what you ticked.
        </AppText>
      ) : null}

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button label="Cancel" variant="secondary" onPress={close} />
        </View>
        <View style={styles.button}>
          <Button
            label="Continue"
            icon="chevron-right"
            onPress={() => setPhase('confirm')}
            disabled={nothingTicked || menu.wholeCar.unavailable !== null}
          />
        </View>
      </View>
    </Sheet>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    // Capped so a car with every part found still leaves the buttons on screen.
    list: { maxHeight: 380 },
    listContent: { gap: t.space.sm, paddingBottom: t.space.xs },
    divider: { marginTop: t.space.md, marginBottom: t.space.xxs },
    progressBlock: { paddingVertical: t.space.sm },
    meter: { marginVertical: t.space.md },
    stopNote: { textAlign: 'center' },
    confirmNote: { marginTop: t.space.sm },
    buttonRow: { flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm },
    button: { flex: 1 },
  });
