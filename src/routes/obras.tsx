import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { DenunciaButton } from "@/components/DenunciaButton";

export const Route = createFileRoute("/obras")({
  head: () => meta("Monitor de Obras e Saúde — Visse?", "Escolas, creches e postos de saúde paralisados: compare o dinheiro pago com o que foi construído."),
  component: Page,
});

type Status = "Em andamento" | "Atrasada" | "Paralisada" | "Concluída com atraso crítico";
const obras: { nome: string; cidade: string; tipo: string; valor: number; pago: number; execucao: number; status: Status }[] = [
  { nome: "Creche Proinfância Tipo B", cidade: "Exemplópolis (BA)", tipo: "Creche", valor: 2_100_000, pago: 1_680_000, execucao: 35, status: "Paralisada" },
  { nome: "Escola 6 salas", cidade: "Vila Nova (PE)", tipo: "Escola", valor: 1_500_000, pago: 900_000, execucao: 58, status: "Atrasada" },
  { nome: "UBS Porte II", cidade: "Serra Azul (CE)", tipo: "Posto de saúde", valor: 950_000, pago: 400_000, execucao: 44, status: "Em andamento" },
  { nome: "Quadra coberta escolar", cidade: "Exemplópolis (BA)", tipo: "Escola", valor: 620_000, pago: 620_000, execucao: 100, status: "Concluída com atraso crítico" },
  { nome: "Creche Tipo C", cidade: "Lagoa Seca (PB)", tipo: "Creche", valor: 1_300_000, pago: 1_100_000, execucao: 20, status: "Paralisada" },
];
const corStatus: Record<Status, string> = { "Em andamento": "bg-sky text-ink", Atrasada: "bg-sun text-ink", Paralisada: "bg-coral text-primary-foreground", "Concluída com atraso crítico": "bg-secondary text-secondary-foreground" };
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Page() {
  const [filtro, setFiltro] = useState<Status | "Todas">("Todas");
  const lista = obras.filter((o) => filtro === "Todas" || o.status === filtro);
  return (
    <ProjectPage
      titulo="Obras paradas"
      subtitulo="A prefeitura recebeu o dinheiro. A creche ficou pronta? Veja aqui."
      objetivo="Mostramos escolas, creches e postos de saúde que estão atrasados ou parados."
      passos={["Juntamos as obras da sua região", "Comparamos o dinheiro pago com a obra feita", "Você vê o que está errado e pode cobrar"]}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(["Todas", "Paralisada", "Atrasada", "Em andamento", "Concluída com atraso crítico"] as const).map((s) => (
          <button key={s} onClick={() => setFiltro(s)} className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${filtro === s ? "bg-ink text-background" : "bg-card"}`}>{s}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((o) => {
          const pPago = Math.round((o.pago / o.valor) * 100);
          const alerta = pPago - o.execucao >= 20;
          return (
            <div key={o.nome} className="rounded-2xl border-2 border-ink p-5">
              <div className="flex items-start justify-between gap-2">
                <div><div className="text-lg font-bold">{o.nome}</div><div className="text-sm text-muted-foreground">{o.cidade} · {o.tipo} · {brl(o.valor)}</div></div>
                <span className={`shrink-0 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-bold ${corStatus[o.status]}`}>{o.status}</span>
              </div>
              {[["Dinheiro já pago", pPago, "bg-sky"], ["Obra pronta", o.execucao, "bg-leaf"]].map(([l, v, c]) => (
                <div key={l as string} className="mt-3">
                  <div className="flex justify-between text-sm font-semibold"><span>{l}</span><span>{v}%</span></div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-muted"><div className={`h-full ${c}`} style={{ width: `${v}%` }} /></div>
                </div>
              ))}
              {alerta && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-destructive">⚠️ Pagaram mais do que construíram</span>
                  <DenunciaButton label="Denunciar" denuncia={{
                    orgaoAlvo: `Prefeitura Municipal de ${o.cidade}`,
                    tipoAnomalia: `Obra ${o.status.toLowerCase()} com pagamento superior à execução física`,
                    dadosConcretos: { obra: o.nome, valorPactuado: brl(o.valor), valorPago: brl(o.pago), execucaoFisica: `${o.execucao}%` },
                    fundamentacaoLegal: ["Art. 37 da CF/88", "Lei nº 14.133/2021", "Lei nº 8.429/1992"],
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ProjectPage>
  );
}
