export function Logo({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const claro = tone === "light";
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0 sm:size-10"
        aria-hidden="true"
        fill="none"
      >
        <circle cx="16" cy="19" r="8" fill="var(--sun)" />
        <path d="M4 23 L13 11 L20 23 Z" fill="var(--leaf)" />
        <path
          d="M2 23 H30"
          stroke={claro ? "var(--areia)" : "var(--ink)"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`font-display text-2xl font-black sm:text-3xl ${claro ? "text-areia" : "text-ink"}`}
      >
        Visse<span className={claro ? "text-sun" : "text-coral"}>?</span>
      </span>
    </span>
  );
}
