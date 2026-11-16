import { useEffect, useRef } from "react";
import { Badge } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import classes from "./FrumbersAppShell.module.css";

const REST_ANGLE = -4;
const BURSTS = 3;
const FIRST_BURST_MS = 1500;
const BURST_GAP_MS = 4500;
const SWING = 9; // degrees
const HZ = 3;
const DECAY = 2.2; // per second
const HOVER_DECAY = 7; // winds down quickly once the pointer arrives

/**
 * The "Now on Tuesdays!" sticker. It shakes a few times after page load to
 * catch the eye, and stops for good (winding down, not freezing) as soon as
 * it's hovered. A reload starts it again.
 */
export function TuesdaySticker() {
  const ref = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let amp = 0;
    let phase = 0;
    let last = 0;
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      amp *= Math.exp(-(hovered.current ? HOVER_DECAY : DECAY) * dt);
      phase += 2 * Math.PI * HZ * dt;
      if (amp < 0.05) {
        amp = 0;
        el.style.transform = `rotate(${REST_ANGLE}deg)`;
        return;
      }
      el.style.transform = `rotate(${REST_ANGLE + amp * Math.sin(phase)}deg)`;
      frame = requestAnimationFrame(tick);
    };

    const burst = () => {
      if (hovered.current) return;
      amp = SWING;
      phase = 0;
      last = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };

    for (let i = 0; i < BURSTS; i++) {
      timers.push(setTimeout(burst, FIRST_BURST_MS + i * BURST_GAP_MS));
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <Badge
      ref={ref}
      size="sm"
      className={classes.sticker}
      style={{ transform: `rotate(${REST_ANGLE}deg)` }}
      onMouseEnter={() => {
        hovered.current = true;
      }}
    >
      Now on Tuesdays!
    </Badge>
  );
}
