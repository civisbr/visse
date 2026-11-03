import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { CidadeCombobox } from "@/components/CidadeCombobox";
import { MapaAlertas } from "@/components/MapaAlertas";
import { carregarGastos, explicarMunicipio, type ArquivoGastos } from "@/lib/gastos-data";
import { dataBr, diasDesde } from "@/lib/red-flags-data";

export const Route = createFileRoute("/tradutor")({
  head: () =>
    meta(
      "Tradutor de Dados Públicos — Visse?",
      "Balancetes de saúde e educação explicados em linguagem simples para qualquer cidadão.",
    ),
  component: Page,
});

type Ano = "fechado" | "corrente";
const ARQUIVO: Record<Ano, ArquivoGastos> = { fechado: "gastos", corrente: "gastos-corrente" };

function GastosReais() {
  const corrente = useQuery({
    queryKey: ["gastos", ARQUIVO.corrente],
    queryFn: () => carregarGastos(ARQUIVO.corrente),
    retry: 1,
    staleTime: 3_600_000,
  });
  const fechado = useQuery({
    queryKey: ["gastos", ARQUIVO.fechado],
    queryFn: () => carregarGastos(ARQUIVO.fechado),
    retry: 1,
    staleTime: 3_600_000,
  });
  const [ano, setAno] = useState<Ano>("fechado");
  const [cod, setCod] = useState<number | null>(null);
  // Passado o fim do ano, o arquivo parcial do ano que já fechou não pode continuar como "em andamento".
  const temCorrente =
    !!corrente.data &&
    !!fechado.data &&
    corrente.data.exercicio > fechado.data.exercicio &&
    corrente.data.exercicio === new Date().getFullYear();
  const atual: Ano = temCorrente ? ano : "fechado";
  const dadosAtuais = atual === "corrente" ? corrente.data : fechado.data;
  // Cidade escolhida que ainda não enviou os dados do ano em andamento: avisa em vez de trocar de cidade calado.
  const semDados =
    atual === "corrente" &&
    cod !== null &&
    dadosAtuais &&
    !dadosAtuais.municipios.some((x) => x.codIbge === cod)
      ? fechado.data?.municipios.find((x) => x.codIbge === cod)?.nome
      : undefined;
  return (
    <>
      {temCorrente && corrente.data && fechado.data && (
        <div role="group" aria-label="Ano dos dados" className="mb-5 flex flex-wrap gap-2">
          {(["fechado", "corrente"] as const).map((a) => {
            const d = a === "fechado" ? fechado.data : corrente.data;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={atual === a}
                onClick={() => setAno(a)}
                className={`rounded-md border-2 border-ink px-4 py-2 text-sm font-bold transition-colors ${atual === a ? "bg-ink text-areia" : "bg-card hover:bg-secondary"}`}
              >
                {d?.exercicio}
                <span className="ml-1.5 font-normal">
                  {a === "fechado" ? "(ano fechado)" : "(em andamento)"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Contas key={atual} arquivo={ARQUIVO[atual]} cod={cod} setCod={setCod} semDados={semDados} />
    </>
  );
}

function Contas({
  arquivo,
  cod,
  setCod,
  semDados,
}: {
  arquivo: ArquivoGastos;
  cod: number | null;
  setCod: (c: number) => void;
  semDados?: string | undefined;
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["gastos", arquivo],
    queryFn: () => carregarGastos(arquivo),
    retry: 1,
    staleTime: 3_600_000,
  });
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
        {data.parcial
          ? `Contas parciais de ${data.exercicio}`
          : `Contas reais de ${data.exercicio}`}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {lista.length.toLocaleString("pt-BR")} cidades do Nordeste que já enviaram os dados de{" "}
        {data.exercicio} ao Tesouro · atualizado em {dataBr(data.geradoEm)} · fonte: {data.fonte}
      </p>
      <p className="mt-3 rounded-lg border border-border bg-secondary p-3 text-sm font-semibold">
        {data.aviso}
      </p>
      {data.parcial && (
        <p className="mt-3 rounded-lg border-2 border-ink bg-card p-3 text-sm font-semibold">
          O ano de {data.exercicio} ainda não fechou. Cada cidade aparece com o último bimestre que
          enviou ao Tesouro, e muitas ainda não enviaram, então o mapa mostra só parte do Nordeste.
          O percentual de pessoal vem do último quadrimestre ou semestre enviado. Não compare estes
          valores com os de um ano fechado.
        </p>
      )}
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
      {semDados && (
        <p role="status" className="mt-4 rounded-lg border border-border bg-card p-3 text-sm">
          {semDados} ainda não enviou os dados de {data.exercicio}. Mostrando {m.nome} no lugar.
        </p>
      )}
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
