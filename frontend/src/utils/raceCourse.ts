/**
 * Duck race movement. Finish *times* are decided purely by rank, not score:
 * the winner crosses the line first, each lower rank a clear gap later, and
 * tied ranks cross together. Mid-race the ducks wander: surges, stalls and,
 * very rarely, a duck paddling backwards, so leads of a fifth of the track
 * can open up and close again. Each duck's wandering is damped before its
 * final dash so the finishing order is what the schedule says.
 *
 * Positions are smooth analytic functions of time (no sampling), so motion
 * is never jerky.
 */

/** Length of every duck's final dash to the line. */
export const SPRINT_MS = 1100;
/** Smallest gap between consecutive distinct finishing places. */
const MIN_GAP_MS = 500;
const MAX_GAP_MS = 1000;
/** Share of the race over which the places finish, at most. */
const FINISH_SPAN = 0.4;
/** Where the pack is when the winner starts their dash. */
const PACK_END = 0.86;
/** How much of its wandering a duck keeps by the time it must dash. */
const SETTLED = 0.06;
const MAX_PRE_DASH = 0.94;

export type RaceSchedule = {
  /** Time at which the last place crosses the line. */
  raceMs: number;
  /** Time at which the winner crosses the line. */
  firstFinishMs: number;
  /** Finish time for each input rank, in order. */
  finishMs: number[];
};

/**
 * `ranks` are competition ranks (ties share one). The race is stretched
 * when there are so many places that gaps would otherwise get too small.
 */
export function raceSchedule(ranks: number[], baseMs: number): RaceSchedule {
  const places = [...new Set(ranks)].sort((a, b) => a - b);
  const m = places.length;
  const raceMs =
    m > 1 ? Math.max(baseMs, ((m - 1) * MIN_GAP_MS) / FINISH_SPAN) : baseMs;
  const gapMs =
    m > 1 ? Math.min(MAX_GAP_MS, (FINISH_SPAN * raceMs) / (m - 1)) : 0;
  const firstFinishMs = raceMs - (m - 1) * gapMs;
  return {
    raceMs,
    firstFinishMs,
    finishMs: ranks.map((r) => firstFinishMs + places.indexOf(r) * gapMs),
  };
}

type Wave = { amp: number; hz: number; phase: number };
/** A smooth bump in position: a surge ahead (amp > 0) or a stall (amp < 0). */
type Bump = { amp: number; centreMs: number; widthMs: number };

export type Course = {
  finishMs: number;
  sprintStartMs: number;
  packEndMs: number;
  waves: Wave[];
  bumps: Bump[];
  /** Position (0..1) and velocity (per ms) when the final dash begins. */
  startValue: number;
  startSlope: number;
};

const smoothstep = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

function prePosition(c: Course, t: number): number {
  // The pack: eases off the line, then steady, creeping on a touch.
  const u = Math.min(t / c.packEndMs, 1);
  const base =
    PACK_END * (0.55 * u + 0.45 * (1 - (1 - u) ** 2)) +
    0.06 * Math.min(Math.max(t - c.packEndMs, 0) / 2000, 1);
  let dev = 0;
  for (const w of c.waves) {
    dev += w.amp * Math.sin((2 * Math.PI * w.hz * t) / 1000 + w.phase);
  }
  for (const b of c.bumps) {
    const z = (t - b.centreMs) / b.widthMs;
    dev += b.amp * Math.exp(-z * z);
  }
  // Full freedom early, then settle back towards the pack before dashing.
  const envelope =
    1 - (1 - SETTLED) * smoothstep((t / c.packEndMs - 0.45) / 0.55);
  const ramp = smoothstep(t / 900);
  return Math.min(Math.max(base + dev * envelope * ramp, 0), MAX_PRE_DASH);
}

export function buildCourse(
  finishMs: number,
  firstFinishMs: number,
  random: () => number,
): Course {
  const packEndMs = firstFinishMs - SPRINT_MS;
  const span = (lo: number, hi: number) => lo + random() * (hi - lo);
  const sign = () => (random() < 0.5 ? -1 : 1);
  const waves = Array.from({ length: 3 }, () => ({
    amp: span(0.012, 0.03),
    hz: span(0.12, 0.3),
    phase: span(0, Math.PI * 2),
  }));
  const bumps: Bump[] = Array.from({ length: 2 }, () => ({
    amp: sign() * span(0.05, 0.1),
    centreMs: span(0.15, 0.7) * packEndMs,
    widthMs: span(800, 1600),
  }));
  // Very rarely a duck stalls hard enough to drift backwards for a moment.
  if (random() < 0.02) {
    bumps.push({
      amp: -span(0.09, 0.12),
      centreMs: span(0.25, 0.6) * packEndMs,
      widthMs: span(200, 300),
    });
  }
  const course: Course = {
    finishMs,
    sprintStartMs: finishMs - SPRINT_MS,
    packEndMs,
    waves,
    bumps,
    startValue: 0,
    startSlope: 0,
  };
  const s = course.sprintStartMs;
  course.startValue = prePosition(course, s);
  course.startSlope = Math.max(
    (prePosition(course, s + 10) - prePosition(course, s - 10)) / 20,
    0,
  );
  return course;
}

/** 0..1 along the track at `tMs` after the starting gun. */
export function positionAt(course: Course, tMs: number): number {
  if (tMs <= 0) return 0;
  if (tMs >= course.finishMs) return 1;
  if (tMs < course.sprintStartMs) return prePosition(course, tMs);
  // Final dash: a cubic Hermite from the duck's own position and speed,
  // accelerating into the line. No sudden stop-start at the join.
  const s = (tMs - course.sprintStartMs) / SPRINT_MS;
  const p0 = course.startValue;
  const delta = 1 - p0;
  const m0 = Math.min(course.startSlope * SPRINT_MS, 2 * delta);
  const m1 = 1.6 * delta;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * p0 +
    (s3 - 2 * s2 + s) * m0 +
    (-2 * s3 + 3 * s2) +
    (s3 - s2) * m1
  );
}
