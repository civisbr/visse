export type ObraReal = {
  id: string;
  nome: string;
  uf: string;
  tipo: string;
  executor: string;
  situacao: string;
  valorPrevisto: number;
  execucaoFisica: number | null;
  dataFinalPrevista: string | null;
  dataSituacao: string | null;
};

export type DadosObras = {
  aviso: string;
  fonte: string;
  geradoEm: string;
  obras: ObraReal[];
};

const UFS = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown): v is string => typeof v === "string";
const dataOuNula = (v: unknown) => v === null || (str(v) && ISO.test(v));

function obraValida(o: unknown): o is ObraReal {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  return (
    str(x["id"]) &&
    str(x["nome"]) &&
    str(x["uf"]) &&
    UFS.has(x["uf"]) &&
    str(x["tipo"]) &&
    str(x["executor"]) &&
    x["situacao"] === "Paralisada" &&
    typeof x["valorPrevisto"] === "number" &&
    Number.isFinite(x["valorPrevisto"]) &&
    (x["execucaoFisica"] === null ||
      (typeof x["execucaoFisica"] === "number" &&
        x["execucaoFisica"] >= 0 &&
        x["execucaoFisica"] <= 100)) &&
    dataOuNula(x["dataFinalPrevista"]) &&
    dataOuNula(x["dataSituacao"])
  );
}

export function lerObras(bruto: unknown): DadosObras | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;
  if (!str(d["aviso"]) || !str(d["fonte"]) || !str(d["geradoEm"]) || !Array.isArray(d["obras"]))
    return null;
  const gerado = Date.parse(d["geradoEm"]);
  if (!Number.isFinite(gerado) || gerado > Date.now() + 86_400_000 || d["obras"].length > 500)
    return null;
  return {
    aviso: d["aviso"],
    fonte: d["fonte"],
    geradoEm: d["geradoEm"],
    obras: d["obras"].filter(obraValida),
  };
}

// null = ainda não publicado (404); falha de rede ou arquivo inválido lança.
export async function carregarObras(): Promise<DadosObras | null> {
  const r = await fetch("/data/obras.json", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!(r.headers.get("content-type") ?? "").includes("json")) return null;
  const dados = lerObras(await r.json());
  if (!dados) throw new Error("Arquivo de dados inválido");
  return dados;
}
