import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

export type Licitacao = {
  num: string;
  objeto: string;
  valor: number;
  participantes: number;
  cnpj: string;
  aberturaCnpj: string;
  dataLicitacao: string;
  aditivos: number;
};

const dados: Licitacao[] = [
  {
    num: "Pregão 012/2026",
    objeto: "Merenda escolar",
    valor: 450_000,
    participantes: 1,
    cnpj: "12.345.678/0001-99",
    aberturaCnpj: "2026-01-15",
    dataLicitacao: "2026-04-10",
    aditivos: 0,
  },
  {
    num: "Concorrência 003/2026",
    objeto: "Pavimentação Rua A",
    valor: 1_200_000,
    participantes: 4,
    cnpj: "98.765.432/0001-10",
    aberturaCnpj: "2012-03-02",
    dataLicitacao: "2026-02-20",
    aditivos: 420_000,
  },
  {
    num: "Pregão 019/2026",
    objeto: "Material de limpeza",
    valor: 80_000,
    participantes: 6,
    cnpj: "11.222.333/0001-44",
    aberturaCnpj: "2018-07-11",
    dataLicitacao: "2026-05-02",
    aditivos: 0,
  },
  {
    num: "Tomada de Preços 007/2026",
    objeto: "Reforma posto de saúde",
    valor: 310_000,
    participantes: 1,
    cnpj: "55.666.777/0001-88",
    aberturaCnpj: "2025-12-01",
    dataLicitacao: "2026-03-15",
    aditivos: 95_000,
  },
  {
    num: "Pregão 021/2026",
    objeto: "Combustível frota",
    valor: 260_000,
    participantes: 3,
    cnpj: "33.444.555/0001-66",
    aberturaCnpj: "2015-09-09",
    dataLicitacao: "2026-06-01",
    aditivos: 20_000,
  },
];

const meses = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

/** Regras do "Filtro de Riscos" descritas no projeto. */
export function avaliar(l: Licitacao) {
  const flags: string[] = [];
  if (l.participantes <= 1) flags.push("Só uma empresa disputou");
  if (meses(l.aberturaCnpj, l.dataLicitacao) < 6 && l.valor > 100_000)
    flags.push("Empresa aberta há pouco tempo");
  if (l.aditivos / l.valor > 0.25) flags.push("Ficou muito mais caro");
  return flags;
}

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
        A primeira coleta de dados reais ainda não foi publicada. Os casos abaixo são fictícios, só
        para mostrar como funciona.
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
  const [soAlertas, setSoAlertas] = useState(false);
  const linhas = useMemo(
    () => dados.map((l) => ({ l, flags: avaliar(l) })).filter((x) => !soAlertas || x.flags.length),
    [soAlertas],
  );
  return (
    <ProjectPage
      titulo="Contratos suspeitos"
      subtitulo="Avisamos quando a prefeitura faz uma compra estranha."
      objetivo="Procuramos sinais de alerta: só uma empresa disputando, empresa aberta ontem ganhando muito dinheiro, contrato que fica muito mais caro."
      passos={[
        "Olhamos as compras da prefeitura toda semana",
        "Marcamos o que parece estranho",
        "Você recebe o alerta e pode denunciar",
      ]}
    >
      <DadosReais />
      <h3 className="mb-1 text-2xl font-bold">Como funciona: casos fictícios</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Exemplos inventados para mostrar os sinais de alerta. Não representam contratos reais.
      </p>
      <label className="mb-4 flex items-center gap-2 font-bold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--coral)]"
          checked={soAlertas}
          onChange={(e) => setSoAlertas(e.target.checked)}
        />
        Mostrar só o que é suspeito
      </label>
      <div className="space-y-3">
        {linhas.map(({ l, flags }) => (
          <div
            key={l.num}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink p-4 ${flags.length ? "bg-coral/15" : "bg-card"}`}
          >
            <div>
              <div className="font-bold">
                {l.num} · {l.objeto}
              </div>
              <div className="text-sm text-muted-foreground">
                {brl(l.valor)} · {l.participantes} empresa(s) disputando
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {flags.length ? (
                  flags.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-coral px-3 py-0.5 text-xs font-bold text-primary-foreground"
                    >
                      🚩 {f}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-leaf px-3 py-0.5 text-xs font-bold text-primary-foreground">
                    ✓ Tudo certo
                  </span>
                )}
              </div>
            </div>
            {flags.length > 0 && (
              <DenunciaButton
                denuncia={{
                  orgaoAlvo: "Prefeitura Municipal de Exemplópolis",
                  tipoAnomalia: flags.join(", "),
                  dadosConcretos: {
                    licitacaoNum: l.num,
                    objeto: l.objeto,
                    valorTotal: brl(l.valor),
                    cnpjVencedor: l.cnpj,
                    dataAberturaCNPJ: new Date(l.aberturaCnpj).toLocaleDateString("pt-BR"),
                  },
                  fundamentacaoLegal: ["Art. 37, XXI da CF/88", "Lei nº 14.133/2021"],
                }}
              />
            )}
          </div>
        ))}
      </div>
    </ProjectPage>
  );
}
