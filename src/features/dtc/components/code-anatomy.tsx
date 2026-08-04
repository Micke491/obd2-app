import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { parseCode } from '@/lib/obd/dtc';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const LETTER_MEANING: Record<string, string> = {
  P: 'Powertrain',
  C: 'Chassis',
  B: 'Body',
  U: 'Network',
};

const TYPE_MEANING: Record<number, string> = {
  0: 'Standard',
  1: 'Maker',
  2: 'Standard',
  3: 'Maker',
};

const P_SYSTEM_MEANING: Record<number, string> = {
  0x0: 'Fuel and air',
  0x1: 'Fuel and air',
  0x2: 'Injectors',
  0x3: 'Ignition',
  0x4: 'Emissions',
  0x5: 'Speed and idle',
  0x6: 'Computer',
  0x7: 'Gearbox',
  0x8: 'Gearbox',
  0x9: 'Gearbox',
  0xa: 'Hybrid',
  0xb: 'Hybrid',
  0xc: 'Hybrid',
};

const OTHER_SYSTEM_MEANING = 'Subsystem';

type Column = { glyph: string; caption: string; span: number };

/**
 * The code, taken apart.
 *
 * A trouble code is not an arbitrary serial number — SAE J2012 gives every
 * character a job, and the app already unpacks exactly these fields off the
 * wire. Showing the decomposition is the most direct possible answer to "what
 * does this number mean", and it teaches the next code too.
 */
export function CodeAnatomy({ code, locus }: { code: string; locus: string | null }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const parsed = parseCode(code);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, [code, fade]);

  const columns = useMemo<Column[]>(() => {
    if (!parsed) return [];
    const systemMeaning =
      parsed.letter === 'P' ? (P_SYSTEM_MEANING[parsed.systemDigit] ?? OTHER_SYSTEM_MEANING) : OTHER_SYSTEM_MEANING;

    return [
      { glyph: code.charAt(0), caption: LETTER_MEANING[parsed.letter] ?? 'System', span: 1 },
      { glyph: code.charAt(1), caption: TYPE_MEANING[parsed.typeDigit] ?? 'Type', span: 1 },
      { glyph: code.charAt(2), caption: systemMeaning, span: 1 },
      { glyph: code.slice(3), caption: locus ?? 'Specific fault', span: 2 },
    ];
  }, [code, locus, parsed]);

  if (!parsed) return null;

  return (
    <View style={styles.root} accessibilityLabel={`Code ${code.split('').join(' ')}`}>
      <View style={styles.glyphRow}>
        {columns.map((column, index) => (
          <View key={index} style={[styles.column, { flex: column.span }]}>
            <AppText variant="readout" style={styles.glyph}>
              {column.glyph}
            </AppText>
          </View>
        ))}
      </View>

      <Animated.View style={[styles.captionRow, { opacity: fade }]}>
        {columns.map((column, index) => (
          <View key={index} style={[styles.column, { flex: column.span }]}>
            <View style={[styles.tick, { backgroundColor: theme.color.ruleStrong }]} />
            <AppText variant="eyebrow" tone="muted" style={styles.caption} numberOfLines={2}>
              {column.caption}
            </AppText>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      paddingVertical: t.space.lg,
      paddingHorizontal: t.space.md,
      backgroundColor: t.color.surfaceSunken,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
    },
    glyphRow: { flexDirection: 'row' },
    captionRow: { flexDirection: 'row', marginTop: t.space.xs },
    column: { alignItems: 'center', gap: t.space.xs },
    glyph: {
      fontFamily: t.font.mono,
      fontSize: 34,
      letterSpacing: 2,
      color: t.color.ink,
    },
    tick: { width: 1, height: 10 },
    caption: { textAlign: 'center' },
  });
