import { mkdir, writeFile } from "node:fs/promises";
import { normalizarObra, valorConfiavel, type Obra } from "./obras-regras";

const BASE = "https://api.obrasgov.gestao.gov.br/obrasgov/api";
const NORDESTE = ["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"];
const POR_UF = Number(process.env["OBRAS_POR_UF"] ?? 30);
if (!Number.isInteger(POR_UF) || POR_UF < 1 || POR_UF > 100)
  throw new Error("OBRAS_POR_UF inválido");

const TAMANHO = 50;
const MAX_PAGINAS = 8;

const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function get<T>(url: string, tentativas = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(90_000) });
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

async function execucaoFisica(id: string): Promise<number | null> {
  try {
    const r = await get<{ content?: { percentual?: unknown; dataSituacao?: unknown }[] }>(
      `${BASE}/execucao-fisica?${new URLSearchParams({ idUnico: id, pagina: "0", tamanhoDaPagina: "20" })}`,
      2,
    );
    const ultimo = (r.content ?? [])
      .filter((x) => typeof x.percentual === "number" && typeof x.dataSituacao === "string")
      .sort((a, b) => String(b.dataSituacao).localeCompare(String(a.dataSituacao)))[0];
    const p = ultimo ? (ultimo.percentual as number) : null;
    return p !== null && Number.isFinite(p) && p >= 0 && p <= 100 ? p : null;
  } catch {
    return null;
  }
}

async function emLotes<T>(itens: T[], tamanho: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < itens.length; i += tamanho)
    await Promise.all(itens.slice(i, i + tamanho).map(fn));
}

const obras: Obra[] = [];
const ufsComFalha: string[] = [];
let semExecucao = 0;
for (const uf of NORDESTE) {
  try {
    // A API é lenta e o totalPages não é confiável: pagina até vir página curta.
    const itens: unknown[] = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const r = await get<{ content?: unknown[] }>(
        `${BASE}/projeto-investimento?${new URLSearchParams({ uf, situacao: "Paralisada", pagina: String(pagina), tamanhoDaPagina: String(TAMANHO) })}`,
      );
      if (!Array.isArray(r.content)) throw new Error(`Resposta inesperada para ${uf}`);
      itens.push(...r.content);
      if (r.content.length < TAMANHO) break;
      if (pagina === MAX_PAGINAS - 1)
        console.log(`::warning::${uf}: limite de páginas atingido, ranking pode estar incompleto`);
    }
    const unicas = new Map<string, Obra>();
    for (const i of itens) {
      const o = normalizarObra(i as never, null);
      if (o && o.uf === uf && o.situacao === "Paralisada" && valorConfiavel(o)) unicas.set(o.id, o);
    }
    const base = [...unicas.values()]
      .sort((a, b) => b.valorPrevisto - a.valorPrevisto)
      .slice(0, POR_UF);
    await emLotes(base, 5, async (o) => {
      o.execucaoFisica = await execucaoFisica(o.id);
      if (o.execucaoFisica === null) semExecucao++;
    });
    console.log(`${uf}: ${base.length} obras paralisadas`);
    obras.push(...base);
  } catch (e) {
    ufsComFalha.push(uf);
    console.log(`::warning::${uf} falhou: ${(e as Error).message}`);
  }
}

// Uma UF fora do ar não derruba as demais, mas metade fora indica falha geral.
if (ufsComFalha.length > NORDESTE.length / 3)
  throw new Error(`Falha em ${ufsComFalha.join(", ")}; abortando sem gravar`);

// Sem nenhuma obra, a API provavelmente falhou; não sobrescrever o JSON público.
if (obras.length === 0) throw new Error("Nenhuma obra coletada; abortando sem gravar");
await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/obras.json",
  JSON.stringify(
    {
      aviso:
        "Dados do cadastro federal de obras (ObrasGov) como estavam na data da coleta. A situação pode ter mudado; confirme na fonte oficial antes de cobrar o órgão.",
      fonte: "ObrasGov (obrasgov.gestao.gov.br)",
      geradoEm: new Date().toISOString(),
      semExecucaoFisica: semExecucao,
      ufsComFalha,
      obras,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${obras.length} obras gravadas`);
