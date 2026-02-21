/** Gets the musical interval name for a note's position in a chord (e.g., Root, Third, Fifth). */
export function getIntervalNameFromIndex(index: number, noteCount: number): string {
  if (index === 0) return 'Root';
  if (index === 1) return 'Third';
  if (index === 2) return 'Fifth';
  if (index === 3 && noteCount === 4) return 'Seventh';
  return `Note ${index + 1}`;
}
