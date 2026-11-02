export type AlertaReal = {
  regra: "empresa-recente" | "aditivo-alto";
  detalhe: string;
  prioridade: number;
  contrato: {
    id: string;
    orgao: string;
    municipio: string;
    uf: string;
    objeto: string;
    fornecedor: string;
    cnpj: string;
    valorInicial: number;
    valorAcumulado: number;
    assinatura: string;
    link: string;
  };
};

export type DadosRedFlags = {
  aviso: string;
  fonte: string;
  geradoEm: string;
  janelaDias: number;
  analisados: number;
  cnpjConsultados: number | null;
  cnpjCortados: number | null;
  cnpjFalhas: number | null;
  alertas: AlertaReal[];
};

const UFS = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);
const ISO = /^\d{4}-\d{2}-\d{2}/;
const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const contagem = (v: unknown) => (num(v) && Number.isInteger(v) && v >= 0 ? v : null);

function alertaValido(a: unknown): a is AlertaReal {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  const c = x["contrato"] as Record<string, unknown> | undefined;
  return (
    (x["regra"] === "empresa-recente" || x["regra"] === "aditivo-alto") &&
    str(x["detalhe"]) &&
    num(x["prioridade"]) &&
    !!c &&
    str(c["id"]) &&
    str(c["orgao"]) &&
    str(c["municipio"]) &&
    typeof c["uf"] === "string" &&
    UFS.has(c["uf"]) &&
    str(c["objeto"]) &&
    str(c["fornecedor"]) &&
    typeof c["cnpj"] === "string" &&
    /^\d{14}$/.test(c["cnpj"]) &&
    num(c["valorInicial"]) &&
    num(c["valorAcumulado"]) &&
    typeof c["assinatura"] === "string" &&
    ISO.test(c["assinatura"]) &&
    str(c["link"])
  );
}

export function lerDados(bruto: unknown): DadosRedFlags | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;
  if (
    !str(d["aviso"]) ||
    !str(d["fonte"]) ||
    !str(d["geradoEm"]) ||
    !num(d["janelaDias"]) ||
    !num(d["analisados"])
  )
    return null;
  const gerado = Date.parse(d["geradoEm"]);
  if (!Number.isFinite(gerado) || gerado > Date.now() + 86_400_000) return null;
  if (!Array.isArray(d["alertas"]) || d["alertas"].length > 500) return null;
  return {
    aviso: d["aviso"],
    fonte: d["fonte"],
    geradoEm: d["geradoEm"],
    janelaDias: d["janelaDias"],
    analisados: d["analisados"],
    cnpjConsultados: contagem(d["cnpjConsultados"]),
    cnpjCortados: contagem(d["cnpjCortados"]),
    cnpjFalhas: contagem(d["cnpjFalhas"]),
    alertas: d["alertas"].filter(alertaValido),
  };
}

// O link vem de arquivo versionado, mas só abre se apontar para o portal oficial.
export const linkSeguro = (l: string) => (l.startsWith("https://pncp.gov.br/") ? l : null);

export function diasDesde(iso: string, agora = Date.now()): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((agora - t) / 86_400_000) : Number.POSITIVE_INFINITY;
}

// null = ainda não publicado (404); falha de rede ou arquivo inválido lança, para a tela diferenciar.
export async function carregarRedFlags(): Promise<DadosRedFlags | null> {
  const r = await fetch("/data/red-flags.json", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const tipo = r.headers.get("content-type") ?? "";
  // Em SPA, arquivo ausente pode voltar o index.html com 200.
  if (!tipo.includes("json")) return null;
  const dados = lerDados(await r.json());
  if (!dados) throw new Error("Arquivo de dados inválido");
  return dados;
}

const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
export { dataBr };
