import { useState } from "react";
import classes from "./Confetti.module.css";

const COLORS = ["#f5b301", "#5389ff", "#51cf66", "#ff6b6b", "#cc5de8"];

/** A one-shot burst of falling confetti. Purely decorative. */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  const [items] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1200,
      duration: 2600 + Math.random() * 2000,
      drift: (Math.random() - 0.5) * 160,
      spin: 360 + Math.random() * 720,
      color: COLORS[i % COLORS.length],
      round: i % 3 === 0,
    })),
  );
  return (
    <div className={classes.root} aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className={classes.piece}
          data-round={p.round || undefined}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
