export type RpmReading = {
  /** Latest decoded engine speed, or null before the first successful read. */
  rpm: number | null;
  /** Last polling failure. Cleared as soon as a reading succeeds. */
  error: string | null;
  /** Successful decodes this session — proof the loop is live, not just connected. */
  samples: number;
};
