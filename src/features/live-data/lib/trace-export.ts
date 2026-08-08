/**
 * The part of exporting that touches the device.
 *
 * Kept apart from buildTraceCsv so the file format can be checked without a
 * filesystem, and so a share sheet that is unavailable fails in one place.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { traceFilename } from './trace-csv';

export type ExportResult =
  | { ok: true; name: string }
  | { ok: false; reason: string };

/**
 * Writes the trace to the cache directory and hands it to the share sheet.
 *
 * The cache directory is right for this: the file only exists to be passed to
 * whichever app the driver picks, and Android is free to reclaim it afterwards.
 */
export async function shareTraceCsv(csv: string): Promise<ExportResult> {
  if (csv.length === 0) {
    return { ok: false, reason: 'There is nothing recorded to export yet.' };
  }

  if (!(await Sharing.isAvailableAsync())) {
    return { ok: false, reason: 'This device has no app that can receive the file.' };
  }

  const name = traceFilename();

  try {
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export trace',
      UTI: 'public.comma-separated-values-text',
    });

    return { ok: true, name };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'The file could not be written.',
    };
  }
}
