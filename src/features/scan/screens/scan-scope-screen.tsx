import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Meter } from '@/components/meter';
import { Pill } from '@/components/pill';
import { CheckRow, ChoiceRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useTroubleCodes } from '@/features/dtc/hooks/use-trouble-codes';
import { PART_LABELS, type Part } from '@/lib/obd/uds/parts';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { useVehicleScan } from '../hooks/use-vehicle-scan';
import { groupByPart, partStaleness, type DiscoveredModule } from '../lib/module-map';
import { buildScanPlan, estimateSeconds, requestIdsForParts } from '../lib/scan-plan';

type Selection = { kind: 'whole' } | { kind: 'engine' } | { kind: 'parts'; parts: Set<Part> };

function formatDuration(seconds: number): string {
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'an earlier scan';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** What a checklist row says beneath the part name: who is filed under it. */
function partHint(modules: DiscoveredModule[]): string {
  return modules
    .map((module) => {
      const label = module.name ?? module.requestId;
      return module.stale ? `${label} — asleep since ${formatLastSeen(module.lastSeenAt)}` : label;
    })
    .join(', ');
}

/**
 * Where a scan is chosen, before anything is asked of the car.
 *
 * Three states, driven by what the connection can reach and what has been
 * found before: a non-CAN car can only offer the engine; a CAN car with
 * nothing discovered yet offers the whole car or the engine; a CAN car with a
 * remembered map adds a checklist of the parts already found, so a later scan
 * can cost a second instead of forty.
 */
export function ScanScopeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { client } = useObdConnection();
  const { map, addressing, busy, progress, error, scan, stop } = useVehicleScan();
  const { read } = useTroubleCodes();

  const [selection, setSelection] = useState<Selection>({ kind: 'whole' });
  const [confirming, setConfirming] = useState(false);

  const onEngineOnly = () => {
    void read();
    router.back();
  };

  if (!addressing) {
    return (
      <Screen edges={{ top: false }}>
        <ScrollView contentContainerStyle={styles.body}>
          <EmptyState
            icon="engine-outline"
            title="Engine only"
            body={`This car is on ${client?.protocol ?? 'a protocol this app cannot sweep'}. Only the engine can be reached on that bus.`}
            action={{ label: 'Read engine only', onPress: onEngineOnly }}
          />
        </ScrollView>
      </Screen>
    );
  }

  const wholeSeconds = estimateSeconds(buildScanPlan({ kind: 'whole' }, addressing));
  const engineSeconds = estimateSeconds(buildScanPlan({ kind: 'engine' }, addressing));

  const groups = map ? groupByPart(map.modules) : [];
  const selectedParts = selection.kind === 'parts' ? selection.parts : new Set<Part>();
  const partsSeconds = map
    ? estimateSeconds(
        buildScanPlan({ kind: 'parts', requestIds: requestIdsForParts(map.modules, selectedParts) }, addressing),
      )
    : 0;

  const togglePart = (part: Part) => {
    setSelection((prev) => {
      const parts = prev.kind === 'parts' ? new Set(prev.parts) : new Set<Part>();
      if (parts.has(part)) parts.delete(part);
      else parts.add(part);
      return { kind: 'parts', parts };
    });
  };

  const requestWholeScan = () => setConfirming(true);
  const cancelWholeScan = () => setConfirming(false);
  const confirmWholeScan = () => {
    setConfirming(false);
    void scan({ kind: 'whole' });
  };

  const onPrimary = () => {
    if (selection.kind === 'whole') requestWholeScan();
    else if (selection.kind === 'engine') onEngineOnly();
    else if (map) void scan({ kind: 'parts', requestIds: requestIdsForParts(map.modules, selection.parts) });
  };

  const primaryLabel =
    selection.kind === 'whole'
      ? 'Scan whole car'
      : selection.kind === 'engine'
        ? 'Read engine only'
        : `Scan ${selection.parts.size} part${selection.parts.size === 1 ? '' : 's'}`;

  const primaryIcon =
    selection.kind === 'whole' ? 'radar' : selection.kind === 'engine' ? 'engine-outline' : 'checkbox-marked-outline';

  const primaryDisabled = selection.kind === 'parts' && selection.parts.size === 0;
  const frozen = busy || confirming;

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {error ? (
          <Card spine={theme.color.danger}>
            <AppText variant="body" tone="danger">
              {error}
            </AppText>
          </Card>
        ) : null}

        {busy ? (
          <Card spine={theme.color.accent}>
            {progress ? (
              <>
                <AppText variant="subheading">
                  Scanning… {progress.done} of {progress.total}
                </AppText>
                <View style={styles.meter}>
                  <Meter fraction={progress.total ? progress.done / progress.total : 0} />
                </View>
                <AppText variant="caption" tone="muted">
                  {progress.found} module{progress.found === 1 ? '' : 's'} found so far.
                </AppText>
              </>
            ) : (
              <AppText variant="subheading">Checking modules found before…</AppText>
            )}
            <View style={styles.stopButton}>
              <Button label="Stop" variant="danger" icon="stop-circle-outline" onPress={stop} />
            </View>
          </Card>
        ) : null}

        <View style={frozen ? styles.frozen : undefined} pointerEvents={frozen ? 'none' : 'auto'}>
          <Section title="What to scan">
            <ChoiceRow
              label="Whole car"
              hint={`About ${formatDuration(wholeSeconds)}. Finds every module that answers, not just the engine.`}
              selected={selection.kind === 'whole'}
              onPress={() => setSelection({ kind: 'whole' })}
            />
            <ChoiceRow
              label="Engine only"
              hint={`About ${formatDuration(engineSeconds)}. The engine computer only, same as before.`}
              selected={selection.kind === 'engine'}
              onPress={() => setSelection({ kind: 'engine' })}
            />
          </Section>

          {!map ? (
            <AppText variant="caption" tone="muted" style={styles.note}>
              Individual parts — brakes, airbags, and the rest — will show up here once a whole-car
              scan has found them.
            </AppText>
          ) : (
            <Section
              title="Known modules"
              hint="Pick specific parts to check again, without a full sweep."
              meta={`${map.modules.length} found`}
            >
              {groups.map((group) => {
                const staleness = partStaleness(group.modules);
                return (
                  <CheckRow
                    key={group.part}
                    label={PART_LABELS[group.part]}
                    hint={partHint(group.modules)}
                    checked={selectedParts.has(group.part)}
                    onPress={() => togglePart(group.part)}
                    badge={
                      staleness === 'awake' ? undefined : (
                        <Pill
                          label={staleness === 'asleep' ? 'Asleep' : 'Partly asleep'}
                          color={theme.color.inkFaint}
                          background={theme.color.surfaceSunken}
                        />
                      )
                    }
                  />
                );
              })}
              {selection.kind === 'parts' && selection.parts.size > 0 ? (
                <AppText variant="caption" tone="muted">
                  About {formatDuration(partsSeconds)} for the selected parts.
                </AppText>
              ) : null}
              <View style={styles.findAgain}>
                <Button label="Find modules again" variant="secondary" icon="radar" onPress={requestWholeScan} />
              </View>
            </Section>
          )}
        </View>

        {confirming ? (
          <Card spine={theme.color.warn}>
            <AppText variant="subheading">Before scanning the whole car</AppText>
            <AppText variant="body" tone="muted" style={styles.confirmBody}>
              Make sure the car is stationary with the ignition on. A whole-car scan sends several
              hundred requests across the bus and takes about {formatDuration(wholeSeconds)}.
            </AppText>
            <View style={styles.confirmButtons}>
              <View style={styles.confirmButton}>
                <Button label="Cancel" variant="secondary" onPress={cancelWholeScan} />
              </View>
              <View style={styles.confirmButton}>
                <Button label="Start scan" variant="primary" onPress={confirmWholeScan} />
              </View>
            </View>
          </Card>
        ) : null}
      </ScrollView>

      {!frozen ? (
        <View style={styles.footer}>
          <Button label={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} icon={primaryIcon} />
        </View>
      ) : null}
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.xxxl },
    note: { marginTop: -t.space.sm },
    frozen: { opacity: 0.45 },
    meter: { marginVertical: t.space.sm },
    stopButton: { marginTop: t.space.md },
    findAgain: { marginTop: t.space.sm },
    confirmBody: { marginTop: t.space.xs, marginBottom: t.space.md },
    confirmButtons: { flexDirection: 'row', gap: t.space.sm },
    confirmButton: { flex: 1 },
    footer: { paddingVertical: t.space.md },
  });
