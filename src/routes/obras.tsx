import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { DenunciaButton } from "@/components/DenunciaButton";
import { carregarObras } from "@/lib/obras-data";
import { dataBr, diasDesde } from "@/lib/red-flags-data";

export const Route = createFileRoute("/obras")({
  head: () =>
    meta(
      "Monitor de Obras e Saúde — Visse?",
      "Escolas, creches e postos de saúde paralisados: compare o dinheiro pago com o que foi construído.",
    ),
  component: Page,
});

type Status = "Em andamento" | "Atrasada" | "Paralisada" | "Concluída com atraso crítico";
const obras: {
  nome: string;
  cidade: string;
  tipo: string;
  valor: number;
  pago: number;
  execucao: number;
  status: Status;
}[] = [
  {
    nome: "Creche Proinfância Tipo B",
    cidade: "Exemplópolis (BA)",
    tipo: "Creche",
    valor: 2_100_000,
    pago: 1_680_000,
    execucao: 35,
    status: "Paralisada",
  },
  {
    nome: "Escola 6 salas",
    cidade: "Vila Nova (PE)",
    tipo: "Escola",
    valor: 1_500_000,
    pago: 900_000,
    execucao: 58,
    status: "Atrasada",
  },
  {
    nome: "UBS Porte II",
    cidade: "Serra Azul (CE)",
    tipo: "Posto de saúde",
    valor: 950_000,
    pago: 400_000,
    execucao: 44,
    status: "Em andamento",
  },
  {
    nome: "Quadra coberta escolar",
    cidade: "Exemplópolis (BA)",
    tipo: "Escola",
    valor: 620_000,
    pago: 620_000,
    execucao: 100,
    status: "Concluída com atraso crítico",
  },
  {
    nome: "Creche Tipo C",
    cidade: "Lagoa Seca (PB)",
    tipo: "Creche",
    valor: 1_300_000,
    pago: 1_100_000,
    execucao: 20,
    status: "Paralisada",
  },
];
const corStatus: Record<Status, string> = {
  "Em andamento": "bg-sky text-ink",
  Atrasada: "bg-sun text-ink",
  Paralisada: "bg-coral text-primary-foreground",
  "Concluída com atraso crítico": "bg-secondary text-secondary-foreground",
};
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function ObrasReais() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["obras"],
    queryFn: carregarObras,
    retry: 1,
    staleTime: 3_600_000,
  });
  if (isPending)
    return (
      <p role="status" className="mb-8 text-muted-foreground">
        Carregando os dados mais recentes…
      </p>
    );
  if (isError)
    return (
      <p role="alert" className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
        Não foi possível carregar as obras reais agora. Tente de novo mais tarde.
      </p>
    );
  if (!data)
    return (
      <p className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
        A primeira coleta de obras reais ainda não foi publicada. Os casos abaixo são fictícios, só
        para mostrar como funciona.
      </p>
    );
  const atraso = diasDesde(data.geradoEm);
  return (
    <section className="mb-10" aria-labelledby="obras-reais">
      <h3 id="obras-reais" className="text-2xl font-bold">
        Obras federais paralisadas no Nordeste
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.obras.length} maiores obras por estado · atualizado em {dataBr(data.geradoEm)} ·
        fonte:{" "}
        <a
          href="https://obrasgov.gestao.gov.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {data.fonte}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </p>
      <p className="mt-3 rounded-lg border border-border bg-secondary p-3 text-sm font-semibold">
        Dados do cadastro federal de obras (ObrasGov) como estavam na data da coleta. A situação
        pode ter mudado; confirme na fonte oficial antes de cobrar o órgão.{" "}
        <a
          href="https://github.com/civisbr/visse/issues/new?title=Contesta%C3%A7%C3%A3o%20de%20obra"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Contestar ou corrigir
        </a>
        .
      </p>
      {atraso > 10 && (
        <p role="status" className="mt-3 text-sm font-bold text-destructive">
          Estes dados têm {atraso} dias e podem estar desatualizados.
        </p>
      )}
      {data.obras.length === 0 ? (
        <p className="mt-4">Nenhuma obra paralisada nesta coleta.</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {data.obras.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-pop)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold">{o.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {o.uf} · {o.tipo} · {brl(o.valorPrevisto)} previstos
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Executor: {o.executor} · ID {o.id}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {o.situacao}
                </span>
              </div>
              {o.execucaoFisica === null && (
                <p className="mt-3 text-sm text-muted-foreground">Execução física não informada.</p>
              )}
              {o.execucaoFisica !== null && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Obra pronta (informada)</span>
                    <span>{o.execucaoFisica}%</span>
                  </div>
                  <div
                    className="mt-1 h-3 overflow-hidden rounded-full border border-ink bg-muted"
                    role="img"
                    aria-label={`${o.execucaoFisica}% da obra executada`}
                  >
                    <div className="h-full bg-leaf" style={{ width: `${o.execucaoFisica}%` }} />
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {o.dataFinalPrevista && <>Prazo previsto: {dataBr(o.dataFinalPrevista)}. </>}
                {o.dataSituacao && <>Situação registrada em {dataBr(o.dataSituacao)}.</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Page() {
  const [filtro, setFiltro] = useState<Status | "Todas">("Todas");
  const lista = obras.filter((o) => filtro === "Todas" || o.status === filtro);
  return (
    <ProjectPage
      titulo="Obras paradas"
      subtitulo="A prefeitura recebeu o dinheiro. A creche ficou pronta? Veja aqui."
      objetivo="Mostramos escolas, creches e postos de saúde que estão atrasados ou parados."
      passos={[
        "Juntamos as obras da sua região",
        "Comparamos o dinheiro pago com a obra feita",
        "Você vê o que está errado e pode cobrar",
      ]}
    >
      <ObrasReais />
      <h3 className="mb-1 text-2xl font-bold">Como funciona: casos fictícios</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Exemplos inventados para mostrar a comparação. Não representam obras reais.
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            "Todas",
            "Paralisada",
            "Atrasada",
            "Em andamento",
            "Concluída com atraso crítico",
          ] as const
        ).map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${filtro === s ? "bg-ink text-background" : "bg-card"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((o) => {
          const pPago = Math.round((o.pago / o.valor) * 100);
          const alerta = pPago - o.execucao >= 20;
          return (
            <div key={o.nome} className="rounded-2xl border-2 border-ink p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">{o.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {o.cidade} · {o.tipo} · {brl(o.valor)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-bold ${corStatus[o.status]}`}
                >
                  {o.status}
                </span>
              </div>
              {[
                ["Dinheiro já pago", pPago, "bg-sky"],
                ["Obra pronta", o.execucao, "bg-leaf"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="mt-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{l}</span>
                    <span>{v}%</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-muted">
                    <div className={`h-full ${c}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
              {alerta && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-destructive">
                    ⚠️ Pagaram mais do que construíram
                  </span>
                  <DenunciaButton
                    label="Denunciar"
                    denuncia={{
                      orgaoAlvo: `Prefeitura Municipal de ${o.cidade}`,
                      tipoAnomalia: `Obra ${o.status.toLowerCase()} com pagamento superior à execução física`,
                      dadosConcretos: {
                        obra: o.nome,
                        valorPactuado: brl(o.valor),
                        valorPago: brl(o.pago),
                        execucaoFisica: `${o.execucao}%`,
                      },
                      fundamentacaoLegal: [
                        "Art. 37 da CF/88",
                        "Lei nº 14.133/2021",
                        "Lei nº 8.429/1992",
                      ],
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ProjectPage>
  );
}
