/** Extra beat of suspense before the winner lands. */
export const WINNER_PAUSE_MS = 500;

/** When the last place lands, relative to the start of the reveal. */
export function podiumDurationMs(stepMs: number) {
  return 2 * stepMs + WINNER_PAUSE_MS + 900;
}
