import type { CSSProperties } from "react";

const raios = [190, 156, 122, 92];

// Casario, igreja, flamboyant e mandacaru em formas chapadas, com hachura de xilogravura.
export function PaisagemSertao({ className = "" }: { className?: string }) {
  const telha = "var(--coral)";
  const cal = "var(--card)";
  const tinta = "var(--ink)";
  return (
    <svg
      viewBox="0 0 640 380"
      className={`overflow-hidden rounded-lg ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="hachura-terra" width="10" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3H10" stroke={tinta} strokeWidth="1.2" opacity="0.55" />
        </pattern>
        <pattern
          id="hachura-serra"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <path d="M0 0V6" stroke="var(--sun)" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>
      <g stroke="var(--sun)" strokeWidth="2">
        {raios.map((r, i) => (
          <path
            key={r}
            className="animate-raio"
            style={{ "--raio-op": 0.25 + i * 0.12, animationDelay: `${i * 90}ms` } as CSSProperties}
            d={`M ${300 - r} 205 A ${r} ${r} 0 0 1 ${300 + r} 205`}
          />
        ))}
      </g>
      <path
        className="animate-raio"
        style={{ animationDelay: "360ms" }}
        d="M 224 205 A 76 76 0 0 1 376 205 Z"
        fill="var(--sun)"
      />
      <path
        d="M0 250 L90 205 L170 235 L260 190 L350 230 L450 195 L560 235 L640 210 V270 H0Z"
        fill={tinta}
        opacity="0.88"
      />
      <path
        d="M0 250 L90 205 L170 235 L260 190 L350 230 L450 195 L560 235 L640 210 V270 H0Z"
        fill="url(#hachura-serra)"
      />

      <path d="M0 262 H640 V380 H0Z" fill={telha} />
      <path d="M0 262 H640 V380 H0Z" fill="url(#hachura-terra)" />

      <g stroke={tinta} strokeWidth="2.5" strokeLinejoin="round">
        <rect x="396" y="168" width="96" height="104" fill={cal} />
        <path d="M388 172 L444 128 L500 172Z" fill={telha} />
        <rect x="430" y="104" width="30" height="64" fill={cal} />
        <path d="M426 108 L445 84 L464 108Z" fill={telha} />
        <path d="M445 84 V62 M436 70 H454" strokeLinecap="round" />
        <path d="M436 156 V140 a9 9 0 0 1 18 0 V156Z" fill={tinta} />
        <path
          d="M410 258 V224 a12 12 0 0 1 24 0 V258Z M458 258 V224 a12 12 0 0 1 24 0 V258Z"
          fill={tinta}
        />
        <path d="M438 258 V240 a7 7 0 0 1 14 0 V258Z" fill={tinta} />

        <rect x="276" y="198" width="108" height="64" fill="var(--leaf)" />
        <path d="M268 202 L330 172 L392 202Z" fill={telha} />
        <rect x="292" y="218" width="16" height="44" fill={tinta} />
        <rect x="324" y="218" width="16" height="22" fill={cal} />
        <rect x="350" y="218" width="16" height="22" fill={cal} />

        <rect x="168" y="204" width="104" height="58" fill={cal} />
        <path d="M160 208 L190 178 L282 178 L282 208Z" fill={telha} />
        <rect x="182" y="222" width="14" height="40" fill={tinta} />
        <rect x="210" y="222" width="14" height="20" fill={tinta} />
        <rect x="238" y="222" width="14" height="20" fill={tinta} />

        <rect x="496" y="212" width="110" height="50" fill={cal} />
        <path d="M488 216 L514 188 L612 188 L612 216Z" fill={telha} />
        <rect x="510" y="228" width="13" height="34" fill={tinta} />
        <rect x="538" y="228" width="13" height="20" fill={tinta} />
        <rect x="566" y="228" width="13" height="20" fill={tinta} />
      </g>

      <g stroke={tinta} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M98 270 V212 M98 238 L74 214 M98 232 L124 208" fill="none" strokeWidth="6" />
        {[
          [98, 176, 40],
          [64, 200, 28],
          [132, 198, 30],
          [84, 156, 24],
          [118, 160, 24],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={telha} />
        ))}
        <path d="M580 270 V120 a14 14 0 0 1 28 0 V270Z" fill="var(--leaf)" />
        <path d="M580 214 H556 a12 12 0 0 1 -12 -12 V170 a11 11 0 0 1 22 0 V190 H580" fill="none" />
        <path d="M608 196 H626 a10 10 0 0 0 10 -10 V158 a10 10 0 0 0 -20 0 V176 H608" fill="none" />
        <path
          d="M594 128 V262 M586 150 V250 M602 150 V250"
          stroke={tinta}
          strokeWidth="1.2"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}
