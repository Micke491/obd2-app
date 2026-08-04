import type { DriveAdvice, DtcSeverity } from '@/lib/obd/dtc';
import type { Theme } from '@/theme';

export type SeverityTint = { color: string; wash: string };

export function severityTint(severity: DtcSeverity, theme: Theme): SeverityTint {
  switch (severity) {
    case 'critical':
      return { color: theme.color.sevCritical, wash: theme.color.sevCriticalWash };
    case 'serious':
      return { color: theme.color.sevSerious, wash: theme.color.sevSeriousWash };
    case 'moderate':
      return { color: theme.color.sevModerate, wash: theme.color.sevModerateWash };
    case 'minor':
      return { color: theme.color.sevMinor, wash: theme.color.sevMinorWash };
    default:
      return { color: theme.color.sevInfo, wash: theme.color.sevInfoWash };
  }
}

export function driveTint(drive: DriveAdvice, theme: Theme): string {
  switch (drive) {
    case 'stop-now':
      return theme.color.sevCritical;
    case 'limp-to-shop':
      return theme.color.sevSerious;
    case 'drive-with-care':
      return theme.color.sevModerate;
    case 'safe-to-drive':
      return theme.color.ok;
    default:
      return theme.color.inkMuted;
  }
}

export const DRIVE_ICON: Record<DriveAdvice, 'hand-back-left' | 'car-arrow-right' | 'car-clock' | 'car' | 'help-circle-outline'> = {
  'stop-now': 'hand-back-left',
  'limp-to-shop': 'car-arrow-right',
  'drive-with-care': 'car-clock',
  'safe-to-drive': 'car',
  unknown: 'help-circle-outline',
};

export const LIKELIHOOD_LABEL = {
  common: 'Common',
  possible: 'Possible',
  rare: 'Less likely',
} as const;

export const WHERE_LABEL = {
  'diy-easy': 'Easy at home',
  'diy-moderate': 'Some tools needed',
  shop: 'Garage job',
} as const;
