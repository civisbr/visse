import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Coins, FileText, Flag, HardHat, MapPin } from "lucide-react";
import { projects } from "@/lib/projects";
import { meta } from "@/components/ProjectPage";
import paisagem from "@/assets/paisagem-sertao.webp";
import { carregarResumoGastos } from "@/lib/gastos-data";
import { carregarObras } from "@/lib/obras-data";
import { carregarRedFlags } from "@/lib/red-flags-data";

const icons = [Flag, HardHat, Coins, FileText];

export const Route = createFileRoute("/")({
  head: () =>
    meta(
      "Visse? — Veja e cobre o que acontece na sua cidade",
      "Descubra problemas com o dinheiro público da sua cidade e cobre as autoridades em poucos toques.",
    ),
  component: Index,
});

const passos = [
  { n: "01", titulo: "Observe", texto: "Veja obras, gastos e contratos da sua cidade." },
  { n: "02", titulo: "Entenda", texto: "Confira o que já foi pago e o que foi entregue." },
  { n: "03", titulo: "Cobre", texto: "Questione, acompanhe e exija respostas." },
];

const fmt = (n: number) => n.toLocaleString("pt-BR");

function EmNumeros() {
  const opcoes = { retry: 1, staleTime: 3_600_000 } as const;
  const gastos = useQuery({
    queryKey: ["gastos-resumo"],
    queryFn: carregarResumoGastos,
    ...opcoes,
  });
  const obras = useQuery({ queryKey: ["obras"], queryFn: carregarObras, ...opcoes });
  const contratos = useQuery({ queryKey: ["red-flags"], queryFn: carregarRedFlags, ...opcoes });
  const g = gastos.data;
  const itens = [
    g && {
      to: "/tradutor" as const,
      valor: g.acimaLimite + g.acimaPrudencial + g.acimaAlerta,
      texto: `de ${fmt(g.publicados)} cidades com dados de ${g.exercicio} passaram de um limite da Lei de Responsabilidade Fiscal com gasto de pessoal, segundo as próprias prefeituras. ${fmt(g.acimaLimite)} passaram do máximo.`,
      cta: "Ver no mapa",
    },
    obras.data && {
      to: "/obras" as const,
      valor: obras.data.obras.length,
      texto: "obras federais paralisadas no Nordeste.",
      cta: "Ver as obras",
    },
    contratos.data && {
      to: "/red-flags" as const,
      valor: contratos.data.alertas.length,
      texto: `contratos publicados com sinal de alerta nos últimos ${contratos.data.janelaDias} dias.`,
      cta: "Ver os contratos",
    },
  ].filter((x): x is NonNullable<typeof x> => Boolean(x));
  const carregando = gastos.isPending || obras.isPending || contratos.isPending;
  return (
    <section aria-labelledby="em-numeros">
      <h2 id="em-numeros" className="text-3xl font-black text-ink md:text-4xl">
        Agora, no Nordeste
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dados públicos, revisados toda semana. São indícios automáticos, não acusações.
      </p>
      {itens.length === 0 && (
        <p role="status" className="mt-5 border-y border-border py-4 text-sm text-muted-foreground">
          {carregando ? "Carregando os números…" : "Os números não estão disponíveis agora."}
        </p>
      )}
      <ul className="mt-5 divide-y divide-border border-y border-border">
        {itens.map((i) => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="group flex items-center gap-4 py-4 transition-colors hover:text-primary"
            >
              <span className="min-w-24 shrink-0 font-display text-4xl font-black tabular-nums text-primary md:w-28 md:text-5xl">
                {fmt(i.valor)}
              </span>
              <span className="text-sm leading-snug text-ink/80 group-hover:text-primary">
                {i.texto}
                <span className="mt-1 flex items-center gap-1 font-bold text-ink">
                  {i.cta}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Index() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 md:pb-16">
      <section className="grid items-center gap-8 pt-8 md:grid-cols-[0.9fr_1.1fr] md:pt-12">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-ink/70">
            <MapPin className="size-3.5 text-primary" aria-hidden="true" />
            CivisBR · Cidadania no Nordeste
          </p>
          <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] text-ink md:text-7xl">
            Sua cidade merece um <span className="text-primary">olhar atento.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-snug text-ink/75 md:text-xl">
            Entenda os gastos públicos e transforme sua indignação em ação.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/tradutor"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ver o mapa dos gastos
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center rounded-md border-2 border-ink px-6 py-3 font-bold text-ink transition-colors hover:bg-secondary"
            >
              Como funciona
            </a>
          </div>
        </div>
        <img
          src={paisagem}
          alt=""
          width={1200}
          height={600}
          fetchPriority="high"
          className="mx-auto h-auto w-full max-w-2xl"
        />
      </section>

      <h2 id="como-funciona-titulo" className="sr-only">
        Como funciona
      </h2>
      <ol
        id="como-funciona"
        aria-labelledby="como-funciona-titulo"
        className="mt-10 grid scroll-mt-24 border-y border-ink md:grid-cols-3 md:divide-x md:divide-border"
      >
        {passos.map((p) => (
          <li key={p.n} className="flex items-center gap-4 py-5 md:px-6 md:first:pl-0 md:last:pr-0">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sun font-display text-lg font-black text-ink">
              {p.n}
            </span>
            <div>
              <h3 className="font-display text-xl font-black text-ink">{p.titulo}</h3>
              <p className="text-sm text-ink/75">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <EmNumeros />

        <section aria-labelledby="por-onde">
          <h2 id="por-onde" className="text-3xl font-black text-ink md:text-4xl">
            Por onde começar?
          </h2>
          <div className="mt-3 divide-y divide-border border-b border-border">
            {projects.map((p, i) => {
              const Icon = icons[i];
              return (
                <Link
                  key={p.to}
                  to={p.to}
                  className="group flex items-center gap-4 py-4 transition-colors hover:text-primary"
                >
                  {Icon && (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sun/35 text-ink">
                      <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-black text-ink group-hover:text-primary">
                      {p.nome}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{p.resumo}</p>
                  </div>
                  <ArrowUpRight
                    className="ml-auto size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
          <Link
            to="/gerador"
            className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-noite px-6 py-5 text-areia transition-colors hover:bg-ink"
          >
            <span className="font-display text-2xl font-black md:text-3xl">Sua voz tem força.</span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sun text-ink">
              <ArrowRight className="size-5" aria-hidden="true" />
              <span className="sr-only">Fazer minha denúncia</span>
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
