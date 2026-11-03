import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { ListaPorEstado } from "@/components/ListaPorEstado";
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
        A primeira coleta de obras reais ainda não foi publicada.
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
        <ListaPorEstado
          itens={[...data.obras].sort((a, b) => b.valorPrevisto - a.valorPrevisto)}
          uf={(o) => o.uf}
          chave={(o) => o.id}
          renderItem={(o) => (
            <div className="h-full rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-pop)]">
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
            </div>
          )}
        />
      )}
    </section>
  );
}

function Page() {
  return (
    <ProjectPage
      titulo="Obras paradas"
      subtitulo="A prefeitura recebeu o dinheiro. A creche ficou pronta? Veja aqui."
      objetivo="Mostramos obras federais paralisadas no Nordeste, com o que foi previsto e o quanto já foi construído."
      passos={[
        "Juntamos as obras da sua região",
        "Mostramos o valor previsto e o que já foi feito",
        "Você vê o que está parado e pode cobrar",
      ]}
    >
      <ObrasReais />
    </ProjectPage>
  );
}
