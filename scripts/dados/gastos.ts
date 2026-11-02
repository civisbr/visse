import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { municipioValido } from "../../src/lib/gastos-data";
import { coletarGastos } from "./gastos-coleta";
import { selecionarMunicipios, type Ente, type ItemSiconfi } from "./gastos-regras";

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
        const espera = Number(r.headers.get("retry-after"));
        if ((r.status === 429 || r.status === 503) && Number.isFinite(espera) && espera > 0)
          await pausa(Math.min(espera, 60) * 1000);
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
const universo = selecionarMunicipios(entes);
// O Nordeste tem 1.794 municípios; bem abaixo disso indica mudança no cadastro de entes, não um universo menor.
const MINIMO_UNIVERSO = 1700;
if (universo.length < MINIMO_UNIVERSO)
  throw new Error(
    `Só ${universo.length} municípios selecionados; esperado ao menos ${MINIMO_UNIVERSO}`,
  );

const coleta = await coletarGastos(itens, universo, new Date().getFullYear());
const { exercicio, semDespesas, semPessoal, falhas } = coleta;
// Registro incoerente no SICONFI é descartado aqui; do contrário o validador barraria a publicação inteira.
const municipios = coleta.municipios.filter(municipioValido);
const rejeitados = coleta.municipios.length - municipios.length;
if (rejeitados > 0)
  console.log(`::warning::${rejeitados} município(s) com dados incoerentes descartados`);
if (rejeitados > coleta.municipios.length * 0.05)
  throw new Error(
    `${rejeitados} municípios descartados por dados incoerentes; esquema pode ter mudado`,
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
        universo: universo.length,
        publicados: municipios.length,
        semDespesas,
        semPessoal,
        falhas: falhas.length,
        falhasRgf: coleta.falhasRgf,
        rejeitados,
      },
      municipios,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${municipios.length} municípios gravados (${exercicio})`);
const resumo = process.env["GITHUB_STEP_SUMMARY"];
if (resumo)
  await appendFile(
    resumo,
    `### Gastos municipais ${exercicio}\n\n- Universo: ${universo.length}\n- Publicados: ${municipios.length}\n- Sem envio de despesas: ${semDespesas}\n- Sem dados de pessoal: ${semPessoal}\n- Falhas de consulta: ${falhas.length}\n`,
  );
