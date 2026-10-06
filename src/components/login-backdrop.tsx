import type { CSSProperties } from "react";

/** Coins rising behind the sign-in: [symbol, left %, size px, duration s, delay s, spin deg, opacity]. */
const COINS: [string, number, number, number, number, number, number][] = [
  ["DH", 8, 46, 17, -3, 200, 0.55],
  ["$", 24, 30, 13, -9, -160, 0.4],
  ["€", 44, 38, 19, -14, 220, 0.45],
  ["DH", 62, 30, 15, -6, -180, 0.35],
  ["%", 80, 42, 21, -1, 160, 0.4],
  ["$", 90, 26, 14, -11, -220, 0.35],
  ["DH", 34, 26, 16, -16, 180, 0.3],
  ["€", 72, 48, 23, -19, -200, 0.5],
];

/** Circuit traces (in a 400 × 800 box): a light travels along each. [path, duration s, delay s]. */
const TRACES: [string, number, number][] = [
  ["M-10 130 H70 L100 160 H190 L215 135 H300", 5, 0],
  ["M410 250 H330 L300 280 H230 L205 305 V380", 6, -2],
  ["M-10 430 H60 L90 400 H150 L175 425 H260 L285 400 H410", 7, -4],
  ["M40 -10 V60 L70 90 V230", 4.5, -1],
  ["M330 820 V720 L300 690 H220 L195 665 V600", 6.5, -3],
  ["M-10 640 H40 L70 670 H130", 4, -2.5],
];

/** Where traces meet: small solder points. */
const NODES: [number, number][] = [
  [190, 160],
  [300, 135],
  [205, 380],
  [150, 400],
  [260, 425],
  [70, 230],
  [195, 600],
  [130, 670],
];

/**
 * Connexion's moving background: money (coins rising, a chart drawing
 * itself) on technology (circuit traces with light running along them).
 * CSS only, behind the content, and still for people who ask for less
 * motion (prefers-reduced-motion).
 */
export function LoginBackdrop() {
  return (
    <div aria-hidden className="gx-backdrop pointer-events-none absolute inset-0 overflow-hidden">
      <span className="gx-drift absolute -left-24 top-24 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />
      <span
        className="gx-drift absolute -right-28 bottom-40 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl"
        style={{ animationDelay: "-6s" } as CSSProperties}
      />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" fill="none">
        {TRACES.map(([d, duration, delay]) => (
          <g key={d}>
            <path d={d} stroke="white" strokeOpacity="0.09" strokeWidth="1.5" />
            <path
              d={d}
              pathLength={100}
              className="gx-pulse"
              stroke="#d9f99d"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
            />
          </g>
        ))}
        {NODES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#014d43" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
        ))}
        {/* A rising chart, drawn again and again. */}
        <polyline
          points="20,560 70,540 110,555 160,505 200,520 250,470 290,485 340,430 385,410"
          pathLength={100}
          className="gx-chart"
          stroke="#bef264"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {COINS.map(([symbol, left, size, duration, delay, spin, opacity], i) => (
        <span
          key={i}
          className="gx-coin absolute flex items-center justify-center rounded-full border-2 border-lime-200/60 bg-gradient-to-br from-lime-200/30 to-emerald-900/20 font-extrabold text-lime-100"
          style={
            {
              left: `${left}%`,
              top: "100%",
              width: size,
              height: size,
              fontSize: size * (symbol.length > 1 ? 0.34 : 0.46),
              "--o": opacity,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              "--spin": `${spin}deg`,
            } as CSSProperties
          }
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}
