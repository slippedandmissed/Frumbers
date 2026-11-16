import { memo } from "react";

import type { DuckLook } from "../utils/duckLook";

const OUTLINE = "#2b2b2b";

/** A chunky cartoon rubber duck, facing right. */
export const Duck = memo(function Duck({
  look,
  width = 64,
  className,
}: {
  look: DuckLook;
  width?: number | string;
  className?: string;
}) {
  const stroke = { stroke: OUTLINE, strokeLinejoin: "round" as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -14 126 114"
      width={width}
      height={typeof width === "number" ? (width * 114) / 126 : undefined}
      className={className}
      aria-hidden
      style={{ display: "block", overflow: "visible" }}
    >
      {/* tail */}
      <path
        d="M16 56 L2 40 Q16 36 30 48 Z"
        fill={look.body}
        strokeWidth={4}
        {...stroke}
      />
      {/* body */}
      <path
        d="M12 58 C12 84 36 94 62 94 C88 94 102 80 102 62 C102 52 94 46 82 46 L30 46 C18 46 12 50 12 58 Z"
        fill={look.body}
        strokeWidth={4.5}
        {...stroke}
      />
      {/* wing */}
      <path
        d="M30 60 C40 52 64 52 72 66 C62 80 36 80 30 60 Z"
        fill={look.wing}
        strokeWidth={3.5}
        {...stroke}
      />
      {/* head */}
      <circle
        cx={86}
        cy={32}
        r={23}
        fill={look.body}
        strokeWidth={4.5}
        {...stroke}
      />
      {/* beak */}
      <path
        d="M103 30 C118 27 125 34 120 41 C116 47 105 47 100 43 Z"
        fill="#ff9f1c"
        strokeWidth={3.5}
        {...stroke}
      />
      {/* cheek + eye */}
      <circle cx={85} cy={40} r={4.5} fill="#ff6f91" opacity={0.55} />
      <circle
        cx={91}
        cy={26}
        r={6}
        fill="#fff"
        stroke={OUTLINE}
        strokeWidth={2.5}
      />
      <circle cx={93} cy={26} r={3} fill={OUTLINE} />
      <circle cx={94} cy={25} r={1} fill="#fff" />

      {look.accessory === "shades" && (
        <g>
          <rect x={80} y={19} width={26} height={13} rx={6} fill="#1b1b1b" />
          <rect
            x={80}
            y={19}
            width={26}
            height={13}
            rx={6}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={2}
          />
          <path
            d="M84 22 L90 22"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.7}
          />
          <path
            d="M64 24 L80 24"
            stroke={OUTLINE}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      )}
      {look.accessory === "partyHat" && (
        <g>
          <path
            d="M72 14 L88 -12 L102 14 Z"
            fill="#ff5f93"
            strokeWidth={3.5}
            {...stroke}
          />
          <path d="M78 6 L96 6" stroke="#fff" strokeWidth={3} opacity={0.8} />
          <circle
            cx={88}
            cy={-12}
            r={5}
            fill="#ffd93b"
            stroke={OUTLINE}
            strokeWidth={2.5}
          />
        </g>
      )}
      {look.accessory === "flower" && (
        <g transform="translate(70 8)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={0}
              cy={-7}
              r={5}
              fill="#ff8fb1"
              stroke={OUTLINE}
              strokeWidth={2}
              transform={`rotate(${a})`}
            />
          ))}
          <circle r={4} fill="#ffd93b" stroke={OUTLINE} strokeWidth={2} />
        </g>
      )}
    </svg>
  );
});
