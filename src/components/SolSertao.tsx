import type { CSSProperties } from "react";

const raios = [
  { r: 232, op: 0.14 },
  { r: 186, op: 0.2 },
  { r: 140, op: 0.28 },
  { r: 96, op: 0.4 },
];

export function SolSertao({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 280" className={className} fill="none" aria-hidden="true">
      <g stroke="var(--sun)" strokeWidth="2">
        {raios.map((a, i) => (
          <path
            key={a.r}
            className="animate-raio"
            style={{ "--raio-op": a.op, animationDelay: `${i * 90}ms` } as CSSProperties}
            d={`M ${260 - a.r} 256 A ${a.r} ${a.r} 0 0 1 ${260 + a.r} 256`}
          />
        ))}
      </g>
      <path
        className="animate-raio"
        style={{ animationDelay: "360ms" }}
        d="M 208 256 A 52 52 0 0 1 312 256 Z"
        fill="var(--sun)"
      />
      <path d="M 0 256 H 520" stroke="var(--ink)" strokeWidth="2" opacity="0.18" />
    </svg>
  );
}
