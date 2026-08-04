import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Card } from '@/components/card';
import { Pill } from '@/components/pill';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import {
  CONFIDENCE_LABELS,
  DRIVE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_SUMMARY,
  SYSTEM_LABELS,
  resolveDtcDetail,
} from '@/lib/obd/dtc';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { CodeAnatomy } from '../components/code-anatomy';
import { DRIVE_ICON, LIKELIHOOD_LABEL, WHERE_LABEL, driveTint, severityTint } from '../components/severity';

export function DtcDetailScreen({ code }: { code: string }) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const detail = useMemo(() => resolveDtcDetail(code), [code]);

  const tint = severityTint(detail.severity, theme);
  const drive = driveTint(detail.drive, theme);

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.badges}>
            <Pill
              label={SEVERITY_LABELS[detail.severity]}
              color={tint.color}
              background={tint.wash}
              filled={detail.severity === 'critical'}
            />
            {detail.manufacturerSpecific ? (
              <Pill
                label="Maker-specific"
                color={theme.color.inkMuted}
                background={theme.color.surfaceSunken}
              />
            ) : null}
          </View>
          <AppText variant="heading">{detail.title}</AppText>
          <AppText variant="caption" style={{ color: tint.color }}>
            {SEVERITY_SUMMARY[detail.severity]}
          </AppText>
        </View>

        <CodeAnatomy code={detail.code} locus={detail.locus} />

        {/* Drive advice comes before the explanation on purpose: it is the one
            thing somebody standing next to a running engine needs first. */}
        <Card spine={drive}>
          <View style={styles.driveHead}>
            <MaterialCommunityIcons name={DRIVE_ICON[detail.drive]} size={20} color={drive} />
            <AppText variant="eyebrow" tone="muted">
              Safe to drive?
            </AppText>
          </View>
          <AppText variant="subheading" style={[styles.driveAnswer, { color: drive }]}>
            {DRIVE_LABELS[detail.drive]}
          </AppText>
          <AppText variant="body" tone="muted">
            {detail.driveNote}
          </AppText>
        </Card>

        <Block title="What it means">
          <AppText variant="body">{detail.meaning}</AppText>
        </Block>

        {detail.symptoms.length ? (
          <Block title="What you might notice">
            {detail.symptoms.map((symptom) => (
              <Bullet key={symptom} text={symptom} />
            ))}
          </Block>
        ) : null}

        {detail.causes.length ? (
          <Block title="Likely causes" hint="Most common first.">
            {detail.causes.map((cause) => (
              <View key={cause.text} style={styles.listRow}>
                <View style={styles.listText}>
                  <AppText variant="body">{cause.text}</AppText>
                </View>
                <AppText variant="eyebrow" tone="faint">
                  {LIKELIHOOD_LABEL[cause.likelihood]}
                </AppText>
              </View>
            ))}
          </Block>
        ) : null}

        {detail.fixes.length ? (
          <Block title="What to check" hint="Cheapest and easiest first.">
            {detail.fixes.map((fix, index) => (
              <View key={fix.text} style={styles.listRow}>
                <AppText variant="mono" tone="faint" style={styles.step}>
                  {index + 1}
                </AppText>
                <View style={styles.listText}>
                  <AppText variant="body">{fix.text}</AppText>
                </View>
                <AppText variant="eyebrow" tone="faint">
                  {WHERE_LABEL[fix.where]}
                </AppText>
              </View>
            ))}
          </Block>
        ) : null}

        {detail.related.length ? (
          <Block title="Related codes">
            <View style={styles.related}>
              {detail.related.map((related) => (
                <View key={related} style={styles.relatedChip}>
                  <AppText
                    variant="mono"
                    tone="accent"
                    onPress={() => router.push(`/code/${related}`)}
                    accessibilityRole="link"
                  >
                    {related}
                  </AppText>
                </View>
              ))}
            </View>
          </Block>
        ) : null}

        <View style={styles.provenance}>
          <AppText variant="caption" tone="faint">
            {SYSTEM_LABELS[detail.system]} · {CONFIDENCE_LABELS[detail.confidence]}
          </AppText>
          <AppText variant="caption" tone="faint">
            {detail.confidence === 'authored'
              ? 'Written for this code.'
              : detail.confidence === 'catalog'
                ? 'Named by the SAE standard; the causes below are typical for this family.'
                : detail.confidence === 'derived'
                  ? 'Read from the structure of the code itself.'
                  : 'Only the area of the car is certain. A maker-specific scan tool will name the exact fault.'}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.block}>
      <AppText variant="eyebrow" tone="accent">
        {title}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="faint">
          {hint}
        </AppText>
      ) : null}
      <View style={styles.blockBody}>{children}</View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: theme.color.ruleStrong }]} />
      <AppText variant="body" style={styles.listText}>
        {text}
      </AppText>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.sm, paddingBottom: t.space.xxxl },
    head: { gap: t.space.sm },
    badges: { flexDirection: 'row', gap: t.space.sm },
    driveHead: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
    driveAnswer: { marginTop: t.space.xs, marginBottom: t.space.xs },
    block: { gap: t.space.xs },
    blockBody: { gap: t.space.sm, marginTop: t.space.xs },
    listRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.space.md,
    },
    listText: { flex: 1 },
    step: { minWidth: 14, paddingTop: 3 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md },
    bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
    related: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
    relatedChip: {
      paddingHorizontal: t.space.md,
      paddingVertical: t.space.sm,
      borderRadius: t.radius.sm,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
      backgroundColor: t.color.surface,
    },
    provenance: {
      gap: t.space.xs,
      paddingTop: t.space.lg,
      borderTopWidth: t.size.hairline,
      borderTopColor: t.color.rule,
    },
  });
