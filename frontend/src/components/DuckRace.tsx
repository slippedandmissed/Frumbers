import { Suspense, useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconCamera,
  IconPlayerSkipForward,
  IconRefresh,
} from "@tabler/icons-react";
import { playerQueryOptions, usePlayer } from "../hooks/usePlayer";
import { Duck } from "./Duck";
import { duckLook, type DuckLook } from "../utils/duckLook";
import { DuckPodium } from "./Podium";
import { podiumDurationMs } from "../utils/podiumTiming";
import {
  SPRINT_MS,
  buildCourse,
  positionAt,
  raceSchedule,
  type Course,
  type RaceSchedule,
} from "../utils/raceCourse";
import { renderShareImage } from "../utils/shareImage";
import { Confetti } from "./Confetti";
import classes from "./DuckRace.module.css";

export type RacerEntry = {
  playerId: string;
  /** Distance score: the leader ends on the finish line. */
  points: number;
  rank: number;
  /** Number shown on the podium (a guess, or total points). */
  podiumValue: number;
  podiumCaption?: string;
};

/**
 * "round" is a quick daytime sprint after each question; "final" is the
 * golden-hour grand finale: slower, with a trophy and confetti.
 */
export type RaceMode = "round" | "final";

const MODES = {
  round: { leadInMs: 1500, baseRaceMs: 6500, countdownFrom: 2, tickMs: 700 },
  final: { leadInMs: 800, baseRaceMs: 11000, countdownFrom: 3, tickMs: 850 },
} as const;

const MAX_RACERS = 10;
const PODIUM_STEP_MS = 1000;
const FINISH_BEAT_MS = 1400;

/** Small seeded PRNG, so every player's race has the same course. */
function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Lane({
  entry,
  index,
  course,
  raceT,
  look,
}: {
  entry: RacerEntry;
  index: number;
  course: Course;
  /** Milliseconds since the starting gun. */
  raceT: number;
  look: DuckLook;
}) {
  const { name } = usePlayer({ playerId: entry.playerId });
  const position = positionAt(course, raceT); // 0..1 along the track
  const crossed = raceT >= course.finishMs;
  const racing = raceT > 0 && !crossed;
  const isWinner = entry.rank === 1;

  return (
    <div className={classes.lane}>
      <div
        className={classes.duckWrap}
        style={{ "--pos": position } as React.CSSProperties}
      >
        <div className={classes.tag}>
          {/* Name only: a live score would give the result away. */}
          <span className={classes.tagName}>{name}</span>
        </div>
        {crossed && isWinner && <span className={classes.crown}>👑</span>}
        <div
          className={classes.bob}
          data-racing={racing || undefined}
          data-cheer={(crossed && isWinner) || undefined}
          style={
            {
              "--bob-speed": `${0.42 + ((index * 37) % 10) / 50}s`,
              "--bob-delay": `${-((index * 53) % 10) / 20}s`,
            } as React.CSSProperties
          }
        >
          <Duck look={look} className={classes.duck} />
        </div>
        <div className={classes.wake} data-racing={racing || undefined} />
        <div className={classes.ripple} />
      </div>
    </div>
  );
}

function LaneSkeleton() {
  return <div className={classes.lane} />;
}

function commentary(raceT: number, schedule: RaceSchedule) {
  const dashStart = schedule.firstFinishMs - SPRINT_MS;
  if (raceT < dashStart * 0.25) return "And they're off!";
  if (raceT < dashStart * 0.7) return "Neck and neck!";
  if (raceT < dashStart) return "Someone's making a move…";
  if (raceT < schedule.firstFinishMs) return "Here they come!";
  return "And they cross the line!";
}

/**
 * Cartoon duck race to the finish line. Distance is proportional to points,
 * so the leader ends on the line and everyone else ends proportionally short.
 * The podium then pops up inside the scene.
 *
 * Everything on screen is a function of "time since the reveal" on the
 * server's clock, and the courses are seeded, so everyone watching sees the
 * same race at the same moment. Only the host can skip (for everyone).
 */
export function DuckRace({
  mode,
  title,
  subtitle,
  entries,
  seed,
  originMs,
  serverOffsetMs,
  skipped,
  onSkip,
  onFinished,
}: {
  mode: RaceMode;
  title: string;
  /** Second line of the downloadable photo. */
  subtitle: string;
  entries: RacerEntry[];
  /** Same for every viewer, e.g. the round or game id. */
  seed: string;
  /** Server-clock time of the reveal, or null if unknown (then: now). */
  originMs: number | null;
  /** Add to Date.now() to get the server's clock. */
  serverOffsetMs: number;
  /** The host skipped the race. */
  skipped: boolean;
  /** Only passed to the host. */
  onSkip?: () => void;
  onFinished: () => void;
}) {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { leadInMs, baseRaceMs, countdownFrom, tickMs } = MODES[mode];
  const podiumMs = podiumDurationMs(PODIUM_STEP_MS);

  // Lanes are in a neutral (id) order so lane 1 doesn't give the winner away.
  const racers = entries
    .slice(0, MAX_RACERS)
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
  const looks = new Map(racers.map((r, i) => [r.playerId, duckLook(i)]));
  const lookOf = (id: string) => looks.get(id) ?? duckLook(0);
  // Finish times depend only on rank (and the field size), so every viewer
  // computes the same schedule.
  const schedule = raceSchedule(
    racers.map((r) => r.rank),
    baseRaceMs,
  );
  const { raceMs } = schedule;
  const raceStart = leadInMs + (countdownFrom + 1) * tickMs;
  const raceEnd = raceStart + raceMs;
  const podiumStart = raceEnd + FINISH_BEAT_MS;

  const [offset] = useState(serverOffsetMs);
  const serverNow = () => Date.now() + offset;
  const [mountedAt] = useState(serverNow);
  const [courses] = useState(() =>
    racers.map((r, i) =>
      buildCourse(
        schedule.finishMs[i]!,
        schedule.firstFinishMs,
        seededRandom(`${seed}:${r.playerId}`),
      ),
    ),
  );

  // A viewer is on exactly one of two timelines:
  //  - "live": the shared one, started by the server's reveal timestamp. Late
  //    joiners land at the right moment of it, and the host can skip it for
  //    everyone.
  //  - "local": a private run, from the countdown. Used for replays and for
  //    anyone arriving after the live reveal is over; anyone can skip it,
  //    which affects only their own screen.
  type Run =
    | { kind: "live" }
    | { kind: "local"; origin: number; skipped: boolean };
  const [run, setRun] = useState<Run>(() => {
    const liveIsOver =
      skipped ||
      (originMs !== null && serverNow() - originMs >= podiumStart + podiumMs);
    return liveIsOver
      ? { kind: "local", origin: serverNow() - leadInMs, skipped: false }
      : { kind: "live" };
  });
  const live = run.kind === "live";
  const origin = run.kind === "local" ? run.origin : (originMs ?? mountedAt);
  const sharedSkip = live && skipped;
  const localSkipped = run.kind === "local" && run.skipped;
  const [runs, setRuns] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(serverNow);

  const elapsed = now - origin;
  const phase = reduced
    ? "podium"
    : sharedSkip || localSkipped
      ? "podium"
      : elapsed < leadInMs
        ? "waiting"
        : elapsed < raceStart
          ? "countdown"
          : elapsed < raceEnd
            ? "racing"
            : elapsed < podiumStart
              ? "finished"
              : "podium";

  // When this viewer's podium reveal started: the shared moment for someone
  // watching live, or when they skipped to it.
  const [podiumSeenAt, setPodiumSeenAt] = useState<number | null>(null);
  if (phase === "podium" && podiumSeenAt === null) {
    setPodiumSeenAt(now);
  }

  const stopAt = (podiumSeenAt ?? origin + podiumStart) + podiumMs + 1000;
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const tick = () => {
      const n = Date.now() + offset;
      setNow(n);
      if (n < stopAt) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [offset, stopAt, reduced]);

  const raceT =
    phase === "racing"
      ? elapsed - raceStart
      : phase === "waiting" || phase === "countdown"
        ? 0
        : raceMs + 1;
  const count = countdownFrom - Math.floor((elapsed - leadInMs) / tickMs);
  const podiumElapsed =
    reduced || localSkipped ? Infinity : now - (podiumSeenAt ?? now);
  const winnerCalled = podiumElapsed >= podiumMs - 600;
  const done = podiumElapsed >= podiumMs + 400;

  useEffect(() => {
    if (done) onFinished();
  }, [done, onFinished]);

  /** Anyone, once the race is over: run it again, privately, from the start. */
  function replay() {
    setPodiumSeenAt(null);
    setRun({ kind: "local", origin: serverNow() - leadInMs, skipped: false });
    setRuns((n) => n + 1);
  }

  /** Skip a private run: straight to the finished podium. */
  function skipLocally() {
    setRun((r) => (r.kind === "local" ? { ...r, skipped: true } : r));
  }

  async function download() {
    setSharing(true);
    try {
      const names = await Promise.all(
        entries.map((e) =>
          queryClient
            .ensureQueryData(playerQueryOptions(e.playerId))
            .then((p) => p.name),
        ),
      );
      const blob = await renderShareImage({
        mode,
        title: title.replace(/^🏆\s*/, ""),
        subtitle,
        valueLabel: mode === "final" ? "pts" : "",
        entries: entries.map((e, i) => ({
          name: names[i]!,
          rank: e.rank,
          value: e.podiumValue,
          caption: e.podiumCaption,
          look: lookOf(e.playerId),
        })),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `frumbers-${mode === "final" ? "grand-final" : "round"}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setSharing(false);
    }
  }

  const racing = phase === "racing";
  const finished = phase === "finished" || phase === "podium";
  // Live: only the host can skip, and for everyone, until the race is over.
  // After that, and on any private run, skipping is local and open to all.
  const showHostSkip = live && !finished && onSkip !== undefined;
  const showLocalSkip = !live && !localSkipped && !done;
  const showReplay = finished && (live || done);
  const headline =
    phase === "countdown"
      ? count > 0
        ? "Ducks, to your marks…"
        : "Quack!"
      : racing
        ? commentary(raceT, schedule)
        : phase === "finished"
          ? "They're across the line! 📸"
          : winnerCalled
            ? "🎉 We have a winner! 🎉"
            : "Drumroll please… 🥁";

  return (
    <div
      className={classes.scene}
      data-mode={mode}
      data-waiting={phase === "waiting" || undefined}
    >
      <div className={classes.sky}>
        <div className={classes.sun} />
        <div
          className={classes.cloud}
          style={
            { "--y": "14%", "--d": "46s", "--s": 1 } as React.CSSProperties
          }
        />
        <div
          className={classes.cloud}
          style={
            { "--y": "34%", "--d": "62s", "--s": 0.7 } as React.CSSProperties
          }
        />
        <div
          className={classes.cloud}
          style={
            { "--y": "6%", "--d": "80s", "--s": 0.85 } as React.CSSProperties
          }
        />
      </div>
      <div className={classes.bank}>
        <span className={classes.bush} style={{ left: "6%" }} />
        <span className={classes.bush} data-small style={{ left: "17%" }} />
        <span className={classes.bush} style={{ left: "58%" }} />
        <span className={classes.bush} data-small style={{ left: "70%" }} />
        <span className={classes.trophy} aria-hidden>
          {mode === "final" ? "🏆" : "🚩"}
        </span>
      </div>

      <div className={classes.chip}>{title}</div>
      <div className={classes.controls}>
        {done && (
          <Button
            size="compact-sm"
            variant="white"
            color="dark"
            leftSection={<IconCamera size={14} />}
            loading={sharing}
            onClick={download}
          >
            Download photo
          </Button>
        )}
        {showReplay && (
          <Button
            size="compact-sm"
            variant="white"
            color="dark"
            leftSection={<IconRefresh size={14} />}
            onClick={replay}
          >
            Replay
          </Button>
        )}
        {showHostSkip && (
          <Button
            size="compact-sm"
            variant="white"
            color="dark"
            leftSection={<IconPlayerSkipForward size={14} />}
            onClick={onSkip}
          >
            Skip for everyone
          </Button>
        )}
        {showLocalSkip && (
          <Button
            size="compact-sm"
            variant="white"
            color="dark"
            leftSection={<IconPlayerSkipForward size={14} />}
            onClick={skipLocally}
          >
            Skip
          </Button>
        )}
      </div>
      <div className={classes.banner} key={headline}>
        {headline}
      </div>

      <div className={classes.river} data-dim={phase === "podium" || undefined}>
        <div className={classes.waves} />
        <div className={classes.waves} data-back />
        {racers.map((entry, i) => (
          <Suspense key={entry.playerId} fallback={<LaneSkeleton />}>
            <Lane
              entry={entry}
              index={i}
              course={courses[i]!}
              raceT={raceT}
              look={lookOf(entry.playerId)}
            />
          </Suspense>
        ))}
        <div className={classes.finishLine} />
      </div>

      {phase === "countdown" && (
        <div className={classes.countdown} key={count}>
          {count > 0 ? count : "GO!"}
        </div>
      )}

      {phase === "podium" && (
        <div className={classes.podiumLayer} key={runs}>
          <DuckPodium
            instant={localSkipped}
            stepMs={PODIUM_STEP_MS}
            lookOf={lookOf}
            entries={entries.map((e) => ({
              playerId: e.playerId,
              rank: e.rank,
              value: e.podiumValue,
              caption: e.podiumCaption,
            }))}
          />
        </div>
      )}
      {phase === "podium" && mode === "final" && !reduced && !localSkipped && (
        <Confetti key={`c${runs}`} />
      )}
      {entries.length > MAX_RACERS && (
        <p className={classes.more}>
          Top {MAX_RACERS} racing; everyone is in the leaderboard below.
        </p>
      )}
    </div>
  );
}
