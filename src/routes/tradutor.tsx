import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { CidadeCombobox } from "@/components/CidadeCombobox";
import { MapaAlertas } from "@/components/MapaAlertas";
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
        A primeira coleta de dados reais ainda não foi publicada.
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
      <MapaAlertas
        exercicio={data.exercicio}
        municipios={lista}
        selecionado={m.codIbge}
        onSelecionar={setCod}
      />
      <div className="mt-6 text-sm font-bold">
        <label htmlFor="cidade-gastos">Escolha a cidade</label>
        <CidadeCombobox id="cidade-gastos" cidades={lista} selecionada={m} onSelecionar={setCod} />
      </div>
      <div
        id="contas-cidade"
        tabIndex={-1}
        aria-labelledby="contas-cidade-titulo"
        className="mt-4 scroll-mt-24 rounded-lg border border-border bg-secondary p-5 focus:outline-none focus-visible:outline-2"
      >
        <h4 id="contas-cidade-titulo" className="text-xl font-bold">
          Em palavras simples
        </h4>
        <div className="mt-3 space-y-3">
          {explicarMunicipio(m, data.exercicio).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <a
          href="#mapa-alertas"
          className="mt-4 inline-block text-sm font-bold text-primary underline"
        >
          Voltar ao mapa
        </a>
      </div>
    </section>
  );
}

function Page() {
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
    </ProjectPage>
  );
}
