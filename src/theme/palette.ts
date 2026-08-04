export type ThemeName = 'light' | 'dark';

/**
 * Two grounds, one product.
 *
 * Light is inspection-certificate stock — pale grey with a cool green cast, the
 * paper an emissions report is printed on. Dark is the same room at night: cool
 * graphite, never blue-black. The accent is a hazard-label signal orange rather
 * than a muted terracotta, because it has to read as "look here" at a glance.
 */
export type Palette = {
  ground: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;

  ink: string;
  inkMuted: string;
  inkFaint: string;
  /** Text placed on top of a filled accent/severity block. */
  onFill: string;

  rule: string;
  ruleStrong: string;

  /** Fills, icons and large text. Below 4.5:1 on ground — never small text. */
  accent: string;
  /** Darkened accent that clears AA for small text. */
  accentInk: string;
  accentWash: string;

  ok: string;
  okWash: string;
  warn: string;
  warnWash: string;
  danger: string;
  dangerWash: string;

  /**
   * Severity ramp separated by hue, not lightness: red, orange, amber, slate,
   * grey. Colour never carries the meaning alone — every badge also has a word.
   */
  sevCritical: string;
  sevCriticalWash: string;
  sevSerious: string;
  sevSeriousWash: string;
  sevModerate: string;
  sevModerateWash: string;
  sevMinor: string;
  sevMinorWash: string;
  sevInfo: string;
  sevInfoWash: string;

  scrim: string;
};

export const LIGHT: Palette = {
  ground: '#E8EAE5',
  surface: '#F7F8F5',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#DDE0DA',

  ink: '#14181A',
  inkMuted: '#545C60',
  inkFaint: '#838C90',
  onFill: '#FFFFFF',

  rule: '#CDD2CB',
  ruleStrong: '#B4BBB2',

  accent: '#D2410E',
  accentInk: '#B93709',
  accentWash: '#FBE6DC',

  ok: '#16624A',
  okWash: '#E0EBE4',
  warn: '#8A6206',
  warnWash: '#F6EDD8',
  danger: '#A81E12',
  dangerWash: '#F8E2DE',

  sevCritical: '#8E1409',
  sevCriticalWash: '#F6DCD8',
  sevSerious: '#B93709',
  sevSeriousWash: '#FBE6DC',
  sevModerate: '#8A6206',
  sevModerateWash: '#F6EDD8',
  sevMinor: '#2E5A7A',
  sevMinorWash: '#E0E9EF',
  sevInfo: '#545C60',
  sevInfoWash: '#E2E5E0',

  scrim: 'rgba(20, 24, 26, 0.45)',
};

export const DARK: Palette = {
  ground: '#101314',
  surface: '#191D1F',
  surfaceRaised: '#212628',
  surfaceSunken: '#0A0C0D',

  ink: '#EDF0EE',
  inkMuted: '#97A0A2',
  inkFaint: '#646C6E',
  onFill: '#14181A',

  rule: '#262B2D',
  ruleStrong: '#383F41',

  accent: '#FF6B2C',
  accentInk: '#FF834A',
  accentWash: '#2C1810',

  ok: '#4EA983',
  okWash: '#16211C',
  warn: '#D9A233',
  warnWash: '#241D10',
  danger: '#E85A4A',
  dangerWash: '#2A1614',

  sevCritical: '#F0584A',
  sevCriticalWash: '#2A1513',
  sevSerious: '#FF6B2C',
  sevSeriousWash: '#2C1810',
  sevModerate: '#D9A233',
  sevModerateWash: '#241D10',
  sevMinor: '#6FA8CC',
  sevMinorWash: '#14202A',
  sevInfo: '#97A0A2',
  sevInfoWash: '#1E2325',

  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const PALETTES: Record<ThemeName, Palette> = { light: LIGHT, dark: DARK };
