import { t, type Static } from "elysia";

/**
 * Scoring is percentile based: in each round a player earns the percentage of
 * the *other* guessers they beat (ties split the points), so a round is worth
 * 0-100 points regardless of how many people played. That keeps rounds
 * comparable when players join mid-game. A sole guesser scores 100.
 */

export const RoundResultEntry = t.Object({
  playerId: t.String(),
  guess: t.Number(),
  distance: t.Number(),
  rank: t.Number(),
  points: t.Number(),
});
export type RoundResultEntry = Static<typeof RoundResultEntry>;

export const RoundResult = t.Object({
  roundId: t.String(),
  position: t.Number(),
  question: t.String(),
  answer: t.Number(),
  results: t.Array(RoundResultEntry),
});
export type RoundResult = Static<typeof RoundResult>;

export const PlayerTotal = t.Object({
  playerId: t.String(),
  totalPoints: t.Number(),
  roundsPlayed: t.Number(),
  roundsWon: t.Number(),
  averagePoints: t.Number(),
});
export type PlayerTotal = Static<typeof PlayerTotal>;

export const Standings = t.Object({
  rounds: t.Array(RoundResult),
  totals: t.Array(PlayerTotal),
});
export type Standings = Static<typeof Standings>;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Results for one round, best first. */
export function scoreRound(
  answer: number,
  guesses: { playerId: string; guess: number }[],
): RoundResultEntry[] {
  const withDistance = guesses.map((g) => ({
    ...g,
    distance: Math.abs(g.guess - answer),
  }));
  const n = withDistance.length;
  return withDistance
    .map((g) => {
      const closer = withDistance.filter((o) => o.distance < g.distance).length;
      const tied = withDistance.filter(
        (o) => o.distance === g.distance && o !== g,
      ).length;
      const beaten = n - 1 - closer - tied;
      return {
        ...g,
        rank: closer + 1,
        points: n === 1 ? 100 : round1(((beaten + tied / 2) / (n - 1)) * 100),
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export function totalUp(rounds: RoundResult[]): PlayerTotal[] {
  const byPlayer = new Map<string, Omit<PlayerTotal, "averagePoints">>();
  for (const round of rounds) {
    for (const entry of round.results) {
      const total = byPlayer.get(entry.playerId) ?? {
        playerId: entry.playerId,
        totalPoints: 0,
        roundsPlayed: 0,
        roundsWon: 0,
      };
      total.totalPoints += entry.points;
      total.roundsPlayed += 1;
      if (entry.rank === 1) total.roundsWon += 1;
      byPlayer.set(entry.playerId, total);
    }
  }
  return [...byPlayer.values()]
    .map((total) => ({
      ...total,
      totalPoints: round1(total.totalPoints),
      averagePoints: round1(total.totalPoints / total.roundsPlayed),
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.roundsWon - a.roundsWon ||
        b.averagePoints - a.averagePoints,
    );
}
