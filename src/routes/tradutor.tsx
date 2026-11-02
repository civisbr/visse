import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { CidadeCombobox } from "@/components/CidadeCombobox";
import { carregarGastos, explicarMunicipio } from "@/lib/gastos-data";
import { dataBr, diasDesde } from "@/lib/red-flags-data";

export const Route = createFileRoute("/tradutor")({
  head: () =>
    meta(
      "Tradutor de Dados Públicos — Visse?",
      "Balancetes de saúde e educação explicados em linguagem simples para qualquer cidadão.",
    ),
  component: Page,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function traduzir(d: {
  municipio: string;
  receita: number;
  saude: number;
  educacao: number;
  pessoal: number;
  habitantes: number;
}) {
  const pS = (d.saude / d.receita) * 100;
  const pE = (d.educacao / d.receita) * 100;
  const pP = (d.pessoal / d.receita) * 100;
  return [
    `Em ${d.municipio}, a prefeitura arrecadou ${brl(d.receita)} no período. Isso dá cerca de ${brl(d.receita / d.habitantes)} por morador.`,
    `Da receita, ${pS.toFixed(1)}% foi para a saúde (${brl(d.saude / d.habitantes)} por pessoa) e ${pE.toFixed(1)}% para a educação. A lei manda gastar no mínimo 15% em saúde e 25% em educação: por esta conta simplificada, a saúde ficaria ${pS >= 15 ? "acima" : "abaixo"} de 15% e a educação ${pE >= 25 ? "acima" : "abaixo"} de 25% da receita (só uma referência).`,
    `Os salários dos servidores somaram ${pP.toFixed(1)}% da receita. A lei permite no máximo 54% — ${pP > 54 ? "o limite foi ultrapassado, o que merece atenção." : "dentro do limite legal."}`,
  ];
}

function GastosReais() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["gastos"],
    queryFn: carregarGastos,
    retry: 1,
    staleTime: 3_600_000,
  });
  const [cod, setCod] = useState<number | null>(null);
  const lista = useMemo(() => {
    const ordem = new Intl.Collator("pt-BR");
    return [...(data?.municipios ?? [])].sort(
      (a, b) => a.uf.localeCompare(b.uf) || ordem.compare(a.nome, b.nome),
    );
  }, [data]);
  if (isPending)
    return (
      <p role="status" className="mb-8 text-muted-foreground">
        Carregando os dados mais recentes…
      </p>
    );
  if (isError)
    return (
      <p role="alert" className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
        Não foi possível carregar os dados reais agora. Tente de novo mais tarde.
      </p>
    );
  if (!data || data.municipios.length === 0)
    return (
      <p className="mb-8 rounded-lg border border-border bg-card p-4 text-sm">
        A primeira coleta de dados reais ainda não foi publicada. Você pode usar o simulador abaixo
        com números aproximados.
      </p>
    );
  const m = lista.find((x) => x.codIbge === cod) ?? lista[0];
  if (!m) return null;
  const atraso = diasDesde(data.geradoEm);
  return (
    <section className="mb-10" aria-labelledby="gastos-reais">
      <h3 id="gastos-reais" className="text-2xl font-bold">
        Contas reais de {data.exercicio}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {lista.length.toLocaleString("pt-BR")} cidades do Nordeste que já enviaram os dados de{" "}
        {data.exercicio} ao Tesouro · atualizado em {dataBr(data.geradoEm)} · fonte: {data.fonte}
      </p>
      <p className="mt-3 rounded-lg border border-border bg-secondary p-3 text-sm font-semibold">
        {data.aviso}
      </p>
      {atraso > 40 && (
        <p role="status" className="mt-3 text-sm font-bold text-destructive">
          Estes dados têm {atraso} dias e podem estar desatualizados.
        </p>
      )}
      <div className="mt-4 text-sm font-bold">
        <label htmlFor="cidade-gastos">Escolha a cidade</label>
        <CidadeCombobox id="cidade-gastos" cidades={lista} selecionada={m} onSelecionar={setCod} />
      </div>
      <div className="mt-4 rounded-lg border border-border bg-secondary p-5">
        <h4 className="text-xl font-bold">Em palavras simples</h4>
        <div className="mt-3 space-y-3">
          {explicarMunicipio(m, data.exercicio).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Page() {
  const [d, setD] = useState({
    municipio: "Exemplópolis (BA)",
    receita: 120_000_000,
    saude: 21_000_000,
    educacao: 27_500_000,
    pessoal: 63_000_000,
    habitantes: 48_000,
  });
  const [res, setRes] = useState<string[] | null>(null);
  const num = (k: keyof typeof d) => (
    <label className="text-sm font-bold">
      {
        (
          {
            receita: "Dinheiro que entrou (R$)",
            saude: "Gasto com saúde (R$)",
            educacao: "Gasto com escolas (R$)",
            pessoal: "Gasto com salários (R$)",
            habitantes: "Habitantes",
          } as Record<string, string>
        )[k]
      }
      <input
        type="number"
        className="field mt-1"
        value={d[k] as number}
        onChange={(e) => setD({ ...d, [k]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <ProjectPage
      titulo="Entenda os gastos"
      subtitulo="Quanto sua cidade gastou com saúde e escola? Explicamos em palavras simples."
      objetivo="Ninguém precisa ser contador para entender as contas da prefeitura."
      passos={[
        "Pegamos as contas da prefeitura",
        "Traduzimos para o português do dia a dia",
        "Você entende em 1 minuto",
      ]}
    >
      <GastosReais />
      <h3 className="mb-1 text-2xl font-bold">Simulador com seus números</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Exemplo para brincar com valores aproximados. A lei calcula os mínimos de saúde e educação
        sobre impostos e transferências, não sobre toda a receita, então este resultado é só uma
        referência.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setRes(traduzir(d));
          }}
        >
          <label className="text-sm font-bold">
            Município
            <input
              className="field mt-1"
              value={d.municipio}
              onChange={(e) => setD({ ...d, municipio: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {num("receita")}
            {num("habitantes")}
            {num("saude")}
            {num("educacao")}
            {num("pessoal")}
          </div>
          <button className="btn bg-sky text-ink">Explicar pra mim</button>
        </form>
        <div className="rounded-2xl bg-secondary p-5">
          <h3 className="text-xl font-bold">💬 Em palavras simples</h3>
          {res ? (
            <div className="mt-3 space-y-3">
              {res.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">Preencha os números e clique em traduzir.</p>
          )}
        </div>
      </div>
    </ProjectPage>
  );
}
