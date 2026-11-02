import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";

export function ProjectPage({
  titulo,
  subtitulo,
  objetivo,
  passos,
  children,
}: {
  titulo: string;
  subtitulo: string;
  objetivo: string;
  passos: string[];
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 md:py-12">
      <nav aria-label="Trilha">
        <ol className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <li>
            <Link to="/" className="transition-colors hover:text-primary">
              Visse?
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-ink">
            {titulo}
          </li>
        </ol>
      </nav>

      <section className="pt-6 md:pt-8">
        <h1 className="max-w-3xl font-display text-3xl font-black leading-[0.95] text-ink md:text-[3.5rem]">
          {titulo}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/75">{subtitulo}</p>
        <div className="rule-cordel mt-8" />
      </section>

      <p className="mt-7 max-w-[65ch] leading-relaxed text-muted-foreground">{objetivo}</p>

      <ol className="mt-7 grid gap-4 md:grid-cols-3">
        {passos.map((p, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-border py-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold tabular-nums text-secondary-foreground">
              {i + 1}
            </span>
            <span className="text-sm font-semibold">{p}</span>
            {i < passos.length - 1 && (
              <ArrowRight
                className="ml-auto hidden size-4 shrink-0 text-muted-foreground md:block"
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>

      <section className="mt-12">
        <h2 className="mb-5 text-2xl font-black text-ink">Comece aqui</h2>
        <div className="pop rounded-lg bg-card p-4 md:p-8">{children}</div>
        <p className="mt-4 text-sm text-muted-foreground">
          Os casos de exemplo são fictícios, não são denúncias reais.
        </p>
      </section>
    </main>
  );
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
