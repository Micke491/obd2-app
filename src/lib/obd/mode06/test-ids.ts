/**
 * What a test id is called.
 *
 * J1979 defines test ids per monitor family, so the same number means
 * different things under different monitors — naming them from the id alone
 * would be wrong more often than right. Only the split that is certain is
 * stated: 0x80 and up is manufacturer-defined. Everything else shows as its
 * number, which is still enough to do the job this exists for, which is
 * telling two tests under one monitor apart. Per-cylinder misfire returns
 * several, and without this they render as identical rows with different
 * numbers and no way to tell which is which.
 */
export function describeTest(tid: number): { name: string; manufacturerDefined: boolean } {
  const hex = tid.toString(16).toUpperCase().padStart(2, '0');
  const manufacturerDefined = tid >= 0x80;
  return {
    name: manufacturerDefined ? `Manufacturer test 0x${hex}` : `Test 0x${hex}`,
    manufacturerDefined,
  };
}
