import { mkdir, writeFile } from "node:fs/promises";
import {
  extrairDespesas,
  extrairPessoal,
  selecionarPiloto,
  type Ente,
  type ItemSiconfi,
} from "./gastos-regras";

const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
const HEADERS = {
  "user-agent": "visse-dados/1.0 (+https://github.com/civisbr/visse)",
  accept: "application/json",
};
const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function get<T>(url: string, tentativas = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(45_000) });
      if (!r.ok) {
        if (r.status >= 400 && r.status < 500 && r.status !== 429) i = tentativas;
        throw new Error(`HTTP ${r.status}`);
      }
      return (await r.json()) as T;
    } catch (e) {
      if (i >= tentativas) throw new Error(`${url}: ${(e as Error).message}`);
      await pausa(2000 * i);
    }
  }
}

const itens = async (rota: string, q: Record<string, string>) =>
  (await get<{ items?: ItemSiconfi[] }>(`${BASE}/${rota}?${new URLSearchParams(q)}`)).items ?? [];

const respEntes = await get<{ items: Ente[]; hasMore?: boolean }>(`${BASE}/entes`);
if (respEntes.hasMore) throw new Error("/entes paginou; a lista está incompleta");
const entes = respEntes.items;
if (!Array.isArray(entes) || entes.length < 1000) throw new Error("Lista de entes inesperada");
const piloto = selecionarPiloto(entes);
if (piloto.length === 0) throw new Error("Nenhum município selecionado");

type Coletado = {
  codIbge: number;
  nome: string;
  uf: string;
  populacao: number;
  despesaTotal: number;
  saude: number;
  educacao: number;
  pessoal: ReturnType<typeof extrairPessoal>;
  rgfPeriodicidade: "quadrimestral" | "semestral" | null;
};

// Usa o exercício completo mais recente em que a maioria dos municípios já enviou os dados.
// Só recua de ano quando a causa é falta de envio; falha de rede aborta, para não publicar ano velho por engano.
const anoAtual = new Date().getFullYear();
let municipios: Coletado[] = [];
let exercicio = 0;
let semDespesas = 0;
let falhas: string[] = [];

for (const ano of [anoAtual - 1, anoAtual - 2]) {
  const achados: Coletado[] = [];
  semDespesas = 0;
  falhas = [];
  for (const e of piloto) {
    try {
      const desp = extrairDespesas(
        await itens("rreo", {
          an_exercicio: String(ano),
          nr_periodo: "6",
          co_tipo_demonstrativo: "RREO",
          no_anexo: "RREO-Anexo 02",
          id_ente: String(e.cod_ibge),
        }),
      );
      if (!desp) {
        semDespesas++;
        console.log(`::notice::${e.cod_ibge} ${e.ente}: sem despesas por função em ${ano}`);
        continue;
      }
      // Município pequeno pode publicar o RGF por semestre em vez de quadrimestre.
      const rgf = async (p: string, n: string) =>
        extrairPessoal(
          await itens("rgf", {
            an_exercicio: String(ano),
            in_periodicidade: p,
            nr_periodo: n,
            co_tipo_demonstrativo: "RGF",
            no_anexo: "RGF-Anexo 01",
            co_esfera: "M",
            co_poder: "E",
            id_ente: String(e.cod_ibge),
          }),
        );
      let pessoal: Coletado["pessoal"] = null;
      let rgfPeriodicidade: Coletado["rgfPeriodicidade"] = null;
      try {
        pessoal = await rgf("Q", "3");
        if (pessoal) rgfPeriodicidade = "quadrimestral";
        else {
          pessoal = await rgf("S", "2");
          if (pessoal) rgfPeriodicidade = "semestral";
        }
      } catch (err) {
        console.log(
          `::warning::${e.cod_ibge} ${e.ente}: RGF indisponível (${(err as Error).message})`,
        );
      }
      if (!pessoal) console.log(`::notice::${e.cod_ibge} ${e.ente}: sem RGF de pessoal em ${ano}`);
      achados.push({
        codIbge: e.cod_ibge,
        nome: e.ente,
        uf: e.uf,
        populacao: e.populacao,
        ...desp,
        pessoal,
        rgfPeriodicidade,
      });
    } catch (err) {
      falhas.push(`${e.cod_ibge}: ${(err as Error).message}`);
    }
    await pausa(200);
  }
  console.log(
    `${ano}: ${achados.length}/${piloto.length} municípios com dados (${semDespesas} sem envio, ${falhas.length} falhas)`,
  );
  if (achados.length >= piloto.length / 2) {
    municipios = achados;
    exercicio = ano;
    break;
  }
  if (falhas.length > 0)
    throw new Error(
      `Falhas de rede em ${ano} (${falhas[0]}); abortando para não recuar de ano indevidamente`,
    );
}

if (municipios.length === 0) throw new Error("Nenhum município com dados; abortando sem gravar");
if (falhas.length > piloto.length / 3)
  throw new Error(`${falhas.length} consultas falharam: ${falhas[0]}`);
for (const f of falhas) console.log(`::warning::${f}`);

// Todos sem pessoal indica mudança de esquema do RGF, não ausência de envio.
const semPessoal = municipios.filter((m) => !m.pessoal).length;
if (semPessoal > municipios.length / 2)
  throw new Error(
    `${semPessoal} de ${municipios.length} sem dados de pessoal; esquema do RGF pode ter mudado`,
  );

await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/gastos.json",
  JSON.stringify(
    {
      aviso:
        "Valores liquidados e percentuais informados pelas próprias prefeituras ao Tesouro Nacional (SICONFI), que podem ser retificados e não equivalem a parecer do Tribunal de Contas. Saúde e educação são despesas por função e incluem recursos de outras esferas. A população vem do cadastro de entes mais recente. Os mínimos legais de 15% e 25% usam outra base de cálculo e não são avaliados aqui.",
      fonte: "SICONFI / Tesouro Nacional (RREO Anexo 02 e RGF Anexo 01, Poder Executivo)",
      geradoEm: new Date().toISOString(),
      exercicio,
      cobertura: {
        piloto: piloto.length,
        publicados: municipios.length,
        semDespesas,
        semPessoal,
        falhas: falhas.length,
      },
      municipios,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${municipios.length} municípios gravados (${exercicio})`);
