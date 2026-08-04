import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'ok' | 'warn' | 'danger';

type Variant =
  | 'title' // screen heading
  | 'heading' // section heading inside a screen
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'eyebrow' // tracked uppercase micro-label
  | 'readout' // large tabular number
  | 'mono';

type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
};

/**
 * Weight is always selected by naming the face. Android renders a poor
 * synthetic bold when `fontWeight` is combined with a custom `fontFamily`, so
 * `fontWeight` appears nowhere in this app.
 */
export function AppText({ variant = 'body', tone = 'ink', style, ...rest }: AppTextProps) {
  const styles = useThemedStyles(createStyles);
  return <Text {...rest} style={[styles[variant], styles[tone], style]} />;
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    title: { fontFamily: t.font.displayBold, fontSize: 30, lineHeight: 34, letterSpacing: -0.2 },
    heading: { fontFamily: t.font.display, fontSize: 20, lineHeight: 25 },
    subheading: { fontFamily: t.font.bodySemibold, fontSize: 16, lineHeight: 22 },
    body: { fontFamily: t.font.body, fontSize: 15, lineHeight: 22 },
    bodyStrong: { fontFamily: t.font.bodyMedium, fontSize: 15, lineHeight: 22 },
    caption: { fontFamily: t.font.body, fontSize: 13, lineHeight: 18 },
    eyebrow: {
      fontFamily: t.font.monoMedium,
      fontSize: 10,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    readout: {
      fontFamily: t.font.displayBold,
      fontSize: 34,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    mono: { fontFamily: t.font.mono, fontSize: 13, fontVariant: ['tabular-nums'] },

    ink: { color: t.color.ink },
    muted: { color: t.color.inkMuted },
    faint: { color: t.color.inkFaint },
    accent: { color: t.color.accentInk },
    ok: { color: t.color.ok },
    warn: { color: t.color.warn },
    danger: { color: t.color.danger },
  });
