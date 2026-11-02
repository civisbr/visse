import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { DenunciaButton } from "@/components/DenunciaButton";

export const Route = createFileRoute("/red-flags")({
  head: () => meta("Red Flags de Licitações — Visse?", "Radar automático que aponta licitações e contratos suspeitos em pequenos e médios municípios."),
  component: Page,
});

export type Licitacao = { num: string; objeto: string; valor: number; participantes: number; cnpj: string; aberturaCnpj: string; dataLicitacao: string; aditivos: number };

const dados: Licitacao[] = [
  { num: "Pregão 012/2026", objeto: "Merenda escolar", valor: 450_000, participantes: 1, cnpj: "12.345.678/0001-99", aberturaCnpj: "2026-01-15", dataLicitacao: "2026-04-10", aditivos: 0 },
  { num: "Concorrência 003/2026", objeto: "Pavimentação Rua A", valor: 1_200_000, participantes: 4, cnpj: "98.765.432/0001-10", aberturaCnpj: "2012-03-02", dataLicitacao: "2026-02-20", aditivos: 420_000 },
  { num: "Pregão 019/2026", objeto: "Material de limpeza", valor: 80_000, participantes: 6, cnpj: "11.222.333/0001-44", aberturaCnpj: "2018-07-11", dataLicitacao: "2026-05-02", aditivos: 0 },
  { num: "Tomada de Preços 007/2026", objeto: "Reforma posto de saúde", valor: 310_000, participantes: 1, cnpj: "55.666.777/0001-88", aberturaCnpj: "2025-12-01", dataLicitacao: "2026-03-15", aditivos: 95_000 },
  { num: "Pregão 021/2026", objeto: "Combustível frota", valor: 260_000, participantes: 3, cnpj: "33.444.555/0001-66", aberturaCnpj: "2015-09-09", dataLicitacao: "2026-06-01", aditivos: 20_000 },
];

const meses = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

/** Regras do "Filtro de Riscos" descritas no projeto. */
export function avaliar(l: Licitacao) {
  const flags: string[] = [];
  if (l.participantes <= 1) flags.push("Só uma empresa disputou");
  if (meses(l.aberturaCnpj, l.dataLicitacao) < 6 && l.valor > 100_000) flags.push("Empresa aberta há pouco tempo");
  if (l.aditivos / l.valor > 0.25) flags.push("Ficou muito mais caro");
  return flags;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Page() {
  const [soAlertas, setSoAlertas] = useState(false);
  const linhas = useMemo(() => dados.map((l) => ({ l, flags: avaliar(l) })).filter((x) => !soAlertas || x.flags.length), [soAlertas]);
  return (
    <ProjectPage
      emoji="🚩" cor="bg-coral" titulo="Contratos suspeitos"
      subtitulo="Avisamos quando a prefeitura faz uma compra estranha."
      objetivo="Procuramos sinais de alerta: só uma empresa disputando, empresa aberta ontem ganhando muito dinheiro, contrato que fica muito mais caro."
      passos={["Olhamos as compras da prefeitura toda semana", "Marcamos o que parece estranho", "Você recebe o alerta e pode denunciar"]}
    >
      <label className="mb-4 flex items-center gap-2 font-bold">
        <input type="checkbox" className="h-5 w-5 accent-[var(--coral)]" checked={soAlertas} onChange={(e) => setSoAlertas(e.target.checked)} />
        Mostrar só o que é suspeito
      </label>
      <div className="space-y-3">
        {linhas.map(({ l, flags }) => (
          <div key={l.num} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink p-4 ${flags.length ? "bg-coral/15" : "bg-card"}`}>
            <div>
              <div className="font-bold">{l.num} · {l.objeto}</div>
              <div className="text-sm text-muted-foreground">{brl(l.valor)} · {l.participantes} empresa(s) disputando</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {flags.length ? flags.map((f) => <span key={f} className="rounded-full bg-coral px-3 py-0.5 text-xs font-bold text-primary-foreground">🚩 {f}</span>)
                  : <span className="rounded-full bg-leaf px-3 py-0.5 text-xs font-bold text-primary-foreground">✓ Tudo certo</span>}
              </div>
            </div>
            {flags.length > 0 && (
              <DenunciaButton denuncia={{
                orgaoAlvo: "Prefeitura Municipal de Exemplópolis",
                tipoAnomalia: flags.join(", "),
                dadosConcretos: { licitacaoNum: l.num, objeto: l.objeto, valorTotal: brl(l.valor), cnpjVencedor: l.cnpj, dataAberturaCNPJ: new Date(l.aberturaCnpj).toLocaleDateString("pt-BR") },
                fundamentacaoLegal: ["Art. 37, XXI da CF/88", "Lei nº 14.133/2021"],
              }} />
            )}
          </div>
        ))}
      </div>
    </ProjectPage>
  );
}
