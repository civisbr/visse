import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";

export const Route = createFileRoute("/tradutor")({
  head: () => meta("Tradutor de Dados Públicos — Visse?", "Balancetes de saúde e educação explicados em linguagem simples para qualquer cidadão."),
  component: Page,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function traduzir(d: { municipio: string; receita: number; saude: number; educacao: number; pessoal: number; habitantes: number }) {
  const pS = (d.saude / d.receita) * 100;
  const pE = (d.educacao / d.receita) * 100;
  const pP = (d.pessoal / d.receita) * 100;
  return [
    `Em ${d.municipio}, a prefeitura arrecadou ${brl(d.receita)} no período. Isso dá cerca de ${brl(d.receita / d.habitantes)} por morador.`,
    `Da receita, ${pS.toFixed(1)}% foi para a saúde (${brl(d.saude / d.habitantes)} por pessoa) e ${pE.toFixed(1)}% para a educação. A lei manda gastar no mínimo 15% em saúde e 25% em educação: ${pS >= 15 ? "o mínimo da saúde foi cumprido" : "o mínimo da saúde NÃO foi atingido"} e ${pE >= 25 ? "o da educação também" : "o da educação NÃO foi atingido"}.`,
    `Os salários dos servidores somaram ${pP.toFixed(1)}% da receita. A lei permite no máximo 54% — ${pP > 54 ? "o limite foi ultrapassado, o que merece atenção." : "dentro do limite legal."}`,
  ];
}

function Page() {
  const [d, setD] = useState({ municipio: "Exemplópolis (BA)", receita: 120_000_000, saude: 21_000_000, educacao: 27_500_000, pessoal: 63_000_000, habitantes: 48_000 });
  const [res, setRes] = useState<string[] | null>(null);
  const num = (k: keyof typeof d) => (
    <label className="text-sm font-bold">
      {({ receita: "Dinheiro que entrou (R$)", saude: "Gasto com saúde (R$)", educacao: "Gasto com escolas (R$)", pessoal: "Gasto com salários (R$)", habitantes: "Habitantes" } as Record<string, string>)[k]}
      <input type="number" className="field mt-1" value={d[k] as number} onChange={(e) => setD({ ...d, [k]: Number(e.target.value) })} />
    </label>
  );
  return (
    <ProjectPage
      emoji="🗣️" cor="bg-sky" titulo="Entenda os gastos"
      subtitulo="Quanto sua cidade gastou com saúde e escola? Explicamos em palavras simples."
      objetivo="Ninguém precisa ser contador para entender as contas da prefeitura."
      passos={["Pegamos as contas da prefeitura", "Traduzimos para o português do dia a dia", "Você entende em 1 minuto"]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setRes(traduzir(d)); }}>
          <label className="text-sm font-bold">Município
            <input className="field mt-1" value={d.municipio} onChange={(e) => setD({ ...d, municipio: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">{num("receita")}{num("habitantes")}{num("saude")}{num("educacao")}{num("pessoal")}</div>
          <button className="btn bg-sky text-ink">Explicar pra mim</button>
        </form>
        <div className="rounded-2xl bg-secondary p-5">
          <h3 className="text-xl font-bold">💬 Em palavras simples</h3>
          {res ? <div className="mt-3 space-y-3">{res.map((p, i) => <p key={i}>{p}</p>)}</div>
            : <p className="mt-3 text-muted-foreground">Preencha os números e clique em traduzir.</p>}
        </div>
      </div>
    </ProjectPage>
  );
}
