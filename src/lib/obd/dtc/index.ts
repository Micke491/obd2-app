export { resolveDtcDetail } from './resolve';
export { AUTHORED_CODES } from './authored';
export { DTC_CATALOG } from './catalog';
/** On-the-wire parsing. Kept separate from the explanation layer on purpose. */
export { decodeDtcBytes, describeDtc, parseDtcList, type Dtc, type DtcCategory } from './parser';
export { isValidCode, normaliseCode, parseCode, type CodeLetter, type ParsedCode } from './derive/parse';
export {
  CONFIDENCE_LABELS,
  DRIVE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_SUMMARY,
  SYSTEM_LABELS,
  type DriveAdvice,
  type DtcCause,
  type DtcConfidence,
  type DtcDetail,
  type DtcFix,
  type DtcSeverity,
  type DtcSystem,
} from './types';
