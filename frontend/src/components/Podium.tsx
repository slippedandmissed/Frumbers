import { Suspense } from "react";
import { Loader, Text } from "@mantine/core";
import { IconCrown } from "@tabler/icons-react";
import { usePlayer } from "../hooks/usePlayer";
import { BigNumber } from "./BigNumber";
import { Duck } from "./Duck";
import type { DuckLook } from "../utils/duckLook";
import { WINNER_PAUSE_MS } from "../utils/podiumTiming";
import classes from "./Podium.module.css";

export type PodiumEntry = {
  playerId: string;
  rank: number;
  value: number;
  caption?: string;
};

const BLOCK_HEIGHT = { 1: 112, 2: 84, 3: 60 } as const;
// Third place is revealed first, the winner last.
const REVEAL_ORDER = { 3: 0, 2: 1, 1: 2 } as const;
function PodiumPlace({
  entry,
  rank,
  look,
  stepMs,
}: {
  entry: PodiumEntry;
  rank: 1 | 2 | 3;
  look: DuckLook;
  stepMs: number;
}) {
  const { name } = usePlayer({ playerId: entry.playerId });
  const delay =
    REVEAL_ORDER[rank] * stepMs + (rank === 1 ? WINNER_PAUSE_MS : 0);
  return (
    <div
      className={classes.place}
      data-rank={rank}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <div className={classes.person}>
        {rank === 1 && <IconCrown className={classes.crown} size={30} />}
        <div className={classes.duckLand}>
          <Duck look={look} width={rank === 1 ? 84 : 68} />
        </div>
        <Text className={classes.name} lineClamp={1}>
          {name}
        </Text>
        {entry.caption && (
          <Text className={classes.caption}>{entry.caption}</Text>
        )}
      </div>
      <div
        className={classes.block}
        style={{ height: BLOCK_HEIGHT[rank] }}
        data-rank={rank}
      >
        <Text className={classes.rank}>{rank}</Text>
        <BigNumber value={entry.value} className={classes.value} />
      </div>
    </div>
  );
}

/**
 * Up to three places, shown inside the race scene: each duck bounces onto its
 * step, bronze then silver then gold. Tied players share a rank and stand side
 * by side, so there can be more than one gold.
 */
export function DuckPodium({
  entries,
  lookOf,
  stepMs = 1000,
  instant = false,
}: {
  entries: PodiumEntry[];
  lookOf: (playerId: string) => DuckLook;
  stepMs?: number;
  /** Jump straight to the finished podium, skipping the staged reveal. */
  instant?: boolean;
}) {
  const places = entries.filter((e) => e.rank <= 3).slice(0, 6);
  // Winner in the middle, runners-up either side.
  const ordered = [
    ...places.filter((e) => e.rank === 2),
    ...places.filter((e) => e.rank === 1),
    ...places.filter((e) => e.rank === 3),
  ];
  return (
    <div className={classes.podium} data-instant={instant || undefined}>
      {ordered.map((entry) => (
        <Suspense key={entry.playerId} fallback={<Loader />}>
          <PodiumPlace
            entry={entry}
            rank={entry.rank as 1 | 2 | 3}
            look={lookOf(entry.playerId)}
            stepMs={stepMs}
          />
        </Suspense>
      ))}
    </div>
  );
}
