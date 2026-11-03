import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { DenunciaButton } from "@/components/DenunciaButton";
import {
  carregarRedFlags,
  dataBr,
  diasDesde,
  linkSeguro,
  type AlertaReal,
} from "@/lib/red-flags-data";
import { ouvidorias, type UF } from "@/lib/minuta";

export const Route = createFileRoute("/red-flags")({
  head: () =>
    meta(
      "Red Flags de Licitações — Visse?",
      "Radar automático que aponta licitações e contratos suspeitos em pequenos e médios municípios.",
    ),
  component: Page,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ROTULO_REGRA: Record<AlertaReal["regra"], string> = {
  "empresa-recente": "CNPJ com menos de 6 meses",
  "aditivo-alto": "Valor acima de 25% do contratado",
};
const AVISO =
  "Indicador estatístico automático sobre dados abertos. Não indica irregularidade nem culpa; serve apenas para priorizar conferência nas fontes oficiais.";
const CONTESTAR =
  "https://github.com/civisbr/visse/issues/new?title=Contesta%C3%A7%C3%A3o%20de%20alerta";
const MAXIMO_EXIBIDO = 50;

function DadosReais() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["red-flags"],
    queryFn: carregarRedFlags,
    staleTime: 3_600_000,
  });
  if (isPending)
    return (
      <p role="status" className="mb-8 text-muted-foreground">
        Carregando os dados mais recentes…
      </p>
    );
  if (isError) {
    return (
      <p role="alert" className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
        Não foi possível carregar os dados reais agora. Tente de novo mais tarde.
      </p>
    );
  }
  if (!data) {
    return (
      <p className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
        A primeira coleta de dados reais ainda não foi publicada.
      </p>
    );
  }
  const atraso = diasDesde(data.geradoEm);
  const lista = data.alertas.slice(0, MAXIMO_EXIBIDO);
  return (
    <section className="mb-10" aria-labelledby="dados-reais">
      <h3 id="dados-reais" className="text-2xl font-bold">
        Contratos reais dos últimos {data.janelaDias} dias
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.analisados.toLocaleString("pt-BR")} contratos de prefeituras do Nordeste analisados ·
        atualizado em {dataBr(data.geradoEm)} · fonte: {data.fonte}
      </p>
      <p className="mt-3 rounded-lg border border-border bg-secondary p-3 text-sm font-semibold">
        {AVISO}{" "}
        <a href={CONTESTAR} target="_blank" rel="noopener noreferrer" className="underline">
          Contestar ou corrigir um alerta
        </a>
        .
      </p>
      {data.cnpjCortados !== null && data.cnpjCortados > 0 && data.cnpjConsultados !== null && (
        <p className="mt-3 text-sm text-muted-foreground">
          A idade da empresa foi conferida em{" "}
          {Math.max(0, data.cnpjConsultados - (data.cnpjFalhas ?? 0)).toLocaleString("pt-BR")} dos
          contratos de R$ 100 mil ou mais, os de maior valor. Os outros{" "}
          {data.cnpjCortados.toLocaleString("pt-BR")} não passaram por essa regra.
        </p>
      )}
      {atraso > 10 && (
        <p role="status" className="mt-3 text-sm font-bold text-destructive">
          Estes dados têm {atraso} dias e podem estar desatualizados.
        </p>
      )}
      {lista.length === 0 ? (
        <p className="mt-4">
          Nenhum contrato atingiu os critérios nesta coleta. Isso não quer dizer que está tudo
          certo: só procuramos aditivo acima de 25% e empresa aberta há menos de 6 meses.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {lista.map((a) => {
            const c = a.contrato;
            const href = linkSeguro(c.link);
            const uf = Object.hasOwn(ouvidorias, c.uf) ? (c.uf as UF) : undefined;
            return (
              <li
                key={c.id + a.regra}
                className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-pop)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold">
                      {c.municipio} ({c.uf}) · {brl(c.valorInicial)}
                    </div>
                    <div className="mt-1 text-sm">{c.objeto}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Fornecedor: {c.fornecedor} · CNPJ {c.cnpj}
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-coral px-3 py-0.5 text-xs font-bold text-primary-foreground">
                      {ROTULO_REGRA[a.regra]}
                    </span>
                    <p className="mt-2 text-sm">{a.detalhe}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Indício automático, não é acusação.
                    </p>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-bold text-primary underline"
                      >
                        Ver o contrato no PNCP<span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    )}
                  </div>
                  {uf && href && (
                    <DenunciaButton
                      label="Preparar representação"
                      confirmar="Conferi os dados do contrato no PNCP e entendo que este é um indício automático, não uma prova."
                      denuncia={{
                        orgaoAlvo: c.orgao,
                        tipoAnomalia: `Indício automático: ${ROTULO_REGRA[a.regra].toLowerCase()}`,
                        dadosConcretos: {
                          contrato: c.id,
                          objeto: c.objeto,
                          valorInicial: brl(c.valorInicial),
                          valorAcumulado: brl(c.valorAcumulado),
                          fornecedor: c.fornecedor,
                          cnpjFornecedor: c.cnpj,
                          dataAssinatura: dataBr(c.assinatura),
                          fonte: href,
                        },
                        fundamentacaoLegal: ["Art. 37, XXI da CF/88", "Lei nº 14.133/2021"],
                        fatos: `${a.detalhe} Trata-se de indício identificado por conferência automática de dados abertos, que requer apuração.`,
                      }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data.alertas.length > MAXIMO_EXIBIDO && (
        <p className="mt-3 text-sm text-muted-foreground">
          Mostrando os {MAXIMO_EXIBIDO} primeiros de {data.alertas.length} indícios.
        </p>
      )}
    </section>
  );
}

function Page() {
  return (
    <ProjectPage
      titulo="Contratos suspeitos"
      subtitulo="Avisamos quando a prefeitura faz uma compra estranha."
      objetivo="Procuramos sinais de alerta: contrato que fica muito mais caro e empresa aberta há pouco tempo ganhando muito dinheiro."
      passos={[
        "Olhamos as compras da prefeitura toda semana",
        "Marcamos o que parece estranho",
        "Você recebe o alerta e pode denunciar",
      ]}
    >
      <DadosReais />
    </ProjectPage>
  );
}
