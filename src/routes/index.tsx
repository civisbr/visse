import { createFileRoute, Link } from "@tanstack/react-router";
import { projects } from "@/lib/projects";
import { meta } from "@/components/ProjectPage";
import { SolSertao } from "@/components/SolSertao";
import { ArrowUpRight, Flag, HardHat, MessageSquare, Megaphone, MapPin } from "lucide-react";

const icons = [Flag, HardHat, MessageSquare, Megaphone, MapPin];

export const Route = createFileRoute("/")({
  head: () =>
    meta(
      "Visse? — Veja e cobre o que acontece na sua cidade",
      "Descubra problemas com o dinheiro público da sua cidade e cobre as autoridades em poucos toques.",
    ),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-10 md:pb-16">
      <section className="relative isolate pt-10 md:pt-16">
        <SolSertao className="pointer-events-none absolute right-0 top-4 -z-10 w-44 opacity-70 md:-right-6 md:bottom-7 md:top-auto md:h-72 md:w-[33rem] md:opacity-100" />
        <div className="grid gap-7">
          <div>
            <h1 className="font-display text-6xl font-black leading-[0.88] text-ink md:text-8xl">
              Visse<span className="text-primary">?</span>
            </h1>
            <p className="mt-5 max-w-sm text-xl leading-snug text-ink/75 md:text-2xl">
              Dinheiro público. Problemas reais. Sua voz.
            </p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              <span className="mb-1 inline-flex items-center gap-1.5 font-semibold text-ink">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                Nordeste
              </span>
              <br />A cidade também é sua. Viu algo errado? Não deixe passar.
            </p>
          </div>
        </div>
        <div className="rule-cordel mt-9 md:mt-12" />
      </section>

      <div className="pt-9">
        <section>
          <h2 className="text-2xl font-black text-ink">Faça sua parte</h2>
          <div className="mt-2 grid gap-x-12 md:grid-cols-2">
            {projects.map((p, i) => {
              const Icon = icons[i];
              return (
                <Link
                  key={p.to}
                  to={p.to}
                  className="group flex gap-3.5 border-b border-border py-5 transition-colors hover:text-primary"
                >
                  {Icon && (
                    <Icon
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <h3 className="font-sans text-sm font-bold text-ink transition-colors group-hover:text-primary">
                      {p.nome}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.resumo}</p>
                  </div>
                  <ArrowUpRight
                    className="ml-auto mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
          <div className="relative mt-7 overflow-hidden rounded-lg bg-noite px-5 py-6">
            <div
              className="hachura pointer-events-none absolute inset-0 text-sun opacity-60"
              aria-hidden="true"
            />
            <p className="relative font-display text-2xl font-black text-areia">
              Cobre, visse<span className="text-sun">?</span>
            </p>
            <p className="relative mt-2 text-sm leading-relaxed text-areia/75">
              Sem advogado. Sem custo.
              <br />O primeiro passo é seu.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
