export type DtcSeverity = 'critical' | 'serious' | 'moderate' | 'minor' | 'informational';

export type DriveAdvice =
  | 'stop-now'
  | 'limp-to-shop'
  | 'drive-with-care'
  | 'safe-to-drive'
  | 'unknown';

/** Where the explanation came from, so a derived one never reads as gospel. */
export type DtcConfidence = 'authored' | 'catalog' | 'derived' | 'family';

export type DtcSystem =
  | 'fuel-air'
  | 'injector'
  | 'ignition'
  | 'emissions'
  | 'speed-idle'
  | 'computer'
  | 'transmission'
  | 'hybrid'
  | 'chassis'
  | 'body'
  | 'network'
  | 'unknown';

export type DtcCause = { text: string; likelihood: 'common' | 'possible' | 'rare' };
export type DtcFix = { text: string; where: 'diy-easy' | 'diy-moderate' | 'shop' };

/** All three together or none, so urgency and its justification cannot drift apart. */
export type CatalogRisk = { severity: DtcSeverity; drive: DriveAdvice; note: string };

export type CatalogEntry = {
  /** SAE wording, so it matches the garage invoice and every other scan tool. */
  title: string;
  /**
   * What this one code means, in one or two sentences of plain words.
   *
   * The SAE title alone is the reason people end up searching the code online:
   * "manifold absolute pressure circuit range/performance" names a part and a
   * verdict but never says what the car measured or why it objected. This says
   * that, and says only that — it is a caption, not an article.
   */
  brief: string;
  /** Set only where the code family's default urgency would be wrong. */
  risk?: CatalogRisk;
};

export type DtcDetail = {
  code: string;
  /** Short name, SAE wording where there is one. */
  title: string;
  /** Two to four plain sentences. No jargon that is not immediately explained. */
  meaning: string;
  severity: DtcSeverity;
  drive: DriveAdvice;
  /** One sentence justifying the drive advice, in the interface's voice. */
  driveNote: string;
  symptoms: string[];
  /** Ranked, most likely first. */
  causes: DtcCause[];
  /** Ordered cheapest and most likely first. */
  fixes: DtcFix[];
  related: string[];
  system: DtcSystem;
  /** Parsed position, e.g. "Cylinder 3" or "Bank 1 · Sensor 2". */
  locus: string | null;
  confidence: DtcConfidence;
  manufacturerSpecific: boolean;
};

/** What a hand-written entry supplies; the resolver fills in the rest. */
export type AuthoredDtc = Omit<
  DtcDetail,
  'code' | 'confidence' | 'manufacturerSpecific' | 'locus' | 'related'
> &
  Partial<Pick<DtcDetail, 'locus' | 'related'>>;

/** What a derive rule produces before the resolver stamps provenance on it. */
export type DerivedDraft = Omit<DtcDetail, 'code' | 'confidence' | 'manufacturerSpecific'>;

export const SEVERITY_LABELS: Record<DtcSeverity, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
  informational: 'For information',
};

/** The sentence that follows the badge, so severity is never a colour alone. */
export const SEVERITY_SUMMARY: Record<DtcSeverity, string> = {
  critical: 'Stop driving and get help.',
  serious: 'Get this looked at within a week.',
  moderate: 'Book a repair when convenient.',
  minor: 'Worth fixing, but nothing is at risk.',
  informational: 'No fault — this is a status record.',
};

export const DRIVE_LABELS: Record<DriveAdvice, string> = {
  'stop-now': 'No — stop as soon as it is safe',
  'limp-to-shop': 'Short trips only',
  'drive-with-care': 'Yes, but drive gently',
  'safe-to-drive': 'Yes',
  unknown: 'Unclear from this code alone',
};

export const CONFIDENCE_LABELS: Record<DtcConfidence, string> = {
  authored: 'Full description',
  catalog: 'SAE definition',
  derived: 'Read from the code structure',
  family: 'Code family only',
};

export const SYSTEM_LABELS: Record<DtcSystem, string> = {
  'fuel-air': 'Fuel and air metering',
  injector: 'Injector circuit',
  ignition: 'Ignition and misfire',
  emissions: 'Emission controls',
  'speed-idle': 'Speed and idle control',
  computer: 'Control module',
  transmission: 'Transmission',
  hybrid: 'Hybrid propulsion',
  chassis: 'Chassis',
  body: 'Body',
  network: 'Network',
  unknown: 'Unknown',
};
