/** Pure registry of which tools run for real on-device (no native imports — safe
 * to import from tests and from operations.ts alike). */
export const REAL_TOOLS = new Set<string>([
  'jpg2pdf',
  'merge',
  'split',
  'extract',
  'rotate',
  'compress',
  'pagenumber',
  'watermark',
  'flatten',
]);

export function isReal(toolId: string): boolean {
  return REAL_TOOLS.has(toolId);
}
