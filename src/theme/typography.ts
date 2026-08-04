import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexSansCondensed_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-condensed/600SemiBold';
import { IBMPlexSansCondensed_700Bold } from '@expo-google-fonts/ibm-plex-sans-condensed/700Bold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';

/**
 * IBM Plex, commissioned for technical and engineering documentation — the same
 * register a diagnostic report belongs to. Only the seven faces actually used
 * are imported by subpath; pulling the whole families would ship 40 files.
 */
export const FONT_ASSETS = {
  IBMPlexSansCondensed_600SemiBold,
  IBMPlexSansCondensed_700Bold,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
};

/**
 * Android renders a bad synthetic bold when `fontWeight` is combined with a
 * custom `fontFamily`, so weight is only ever selected by naming the face.
 * There should be no `fontWeight` anywhere in this app.
 */
export const fonts = {
  display: 'IBMPlexSansCondensed_600SemiBold',
  displayBold: 'IBMPlexSansCondensed_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemibold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

export type Fonts = typeof fonts;

/** Uppercase micro-label used for section eyebrows and field names. */
export const eyebrow = {
  fontFamily: fonts.monoMedium,
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
} as const;
