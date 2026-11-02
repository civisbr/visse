export type PessoalMunicipio = {
  percentual: number;
  limite: number;
  alerta: number | null;
  prudencial: number | null;
  rcl: number | null;
};

export type MunicipioGastos = {
  codIbge: number;
  nome: string;
  uf: string;
  populacao: number;
  despesaTotal: number;
  saude: number;
  educacao: number;
  pessoal: PessoalMunicipio | null;
};

export type DadosGastos = {
  aviso: string;
  fonte: string;
  geradoEm: string;
  exercicio: number;
  municipios: MunicipioGastos[];
};

const UFS = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);
const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numOuNulo = (v: unknown) => v === null || num(v);

function pessoalValido(p: unknown): boolean {
  if (p === null) return true;
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  return (
    num(x["percentual"]) &&
    x["percentual"] >= 0 &&
    x["percentual"] <= 200 &&
    num(x["limite"]) &&
    x["limite"] > 0 &&
    x["limite"] <= 100 &&
    numOuNulo(x["alerta"]) &&
    numOuNulo(x["prudencial"]) &&
    numOuNulo(x["rcl"])
  );
}

export function municipioValido(m: unknown): m is MunicipioGastos {
  if (!m || typeof m !== "object") return false;
  const x = m as Record<string, unknown>;
  return (
    num(x["codIbge"]) &&
    Number.isInteger(x["codIbge"]) &&
    x["codIbge"] >= 1_000_000 &&
    x["codIbge"] <= 9_999_999 &&
    str(x["nome"]) &&
    x["nome"].length <= 80 &&
    !/[\p{Cc}\p{Cf}]/u.test(x["nome"]) &&
    str(x["uf"]) &&
    UFS.has(x["uf"]) &&
    num(x["populacao"]) &&
    x["populacao"] > 0 &&
    num(x["despesaTotal"]) &&
    x["despesaTotal"] > 0 &&
    num(x["saude"]) &&
    x["saude"] >= 0 &&
    num(x["educacao"]) &&
    x["educacao"] >= 0 &&
    x["saude"] + x["educacao"] <= x["despesaTotal"] * 1.001 &&
    pessoalValido(x["pessoal"])
  );
}

export function lerGastos(bruto: unknown): DadosGastos | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;
  if (
    !str(d["aviso"]) ||
    !str(d["fonte"]) ||
    !str(d["geradoEm"]) ||
    !num(d["exercicio"]) ||
    d["exercicio"] < 2000 ||
    d["exercicio"] > new Date().getFullYear() ||
    !Array.isArray(d["municipios"])
  )
    return null;
  const gerado = Date.parse(d["geradoEm"]);
  if (!Number.isFinite(gerado) || gerado > Date.now() + 86_400_000 || d["municipios"].length > 2000)
    return null;
  const vistos = new Set<number>();
  const municipios = d["municipios"]
    .filter(municipioValido)
    .filter((m) => !vistos.has(m.codIbge) && !!vistos.add(m.codIbge));
  if (d["municipios"].length > 0 && municipios.length === 0) return null;
  return {
    aviso: d["aviso"],
    fonte: d["fonte"],
    geradoEm: d["geradoEm"],
    exercicio: d["exercicio"],
    municipios,
  };
}

// null = ainda não publicado (404); falha de rede ou arquivo inválido lança.
export async function carregarGastos(): Promise<DadosGastos | null> {
  const r = await fetch("/data/gastos.json", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!(r.headers.get("content-type") ?? "").includes("json")) return null;
  const dados = lerGastos(await r.json());
  if (!dados) throw new Error("Arquivo de dados inválido");
  return dados;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const arred = (n: number) => Math.round(n * 10) / 10;
const pct = (n: number) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Texto determinístico, sem juízo político: só compara com o limite da LRF, que é a única regra com base de cálculo disponível.
export function explicarMunicipio(m: MunicipioGastos, exercicio: number): string[] {
  const out = [
    `Em ${exercicio}, o município de ${m.nome} (${m.uf}), com cerca de ${m.populacao.toLocaleString("pt-BR")} habitantes, gastou ${brl(m.despesaTotal)}. Isso dá ${brl(m.despesaTotal / m.populacao)} por morador.`,
    `Desse total, ${brl(m.saude)} (${pct((m.saude / m.despesaTotal) * 100)}) foram para a saúde, ou ${brl(m.saude / m.populacao)} por pessoa. Para a educação foram ${brl(m.educacao)} (${pct((m.educacao / m.despesaTotal) * 100)}), ou ${brl(m.educacao / m.populacao)} por pessoa.`,
  ];
  if (m.pessoal) {
    const p = m.pessoal;
    const situacao =
      arred(p.percentual) > arred(p.limite)
        ? "o valor informado ficou acima do limite máximo da LRF, o que merece atenção"
        : p.prudencial !== null && arred(p.percentual) > arred(p.prudencial)
          ? "acima do limite prudencial, perto do máximo"
          : p.alerta !== null && arred(p.percentual) > arred(p.alerta)
            ? "acima do limite de alerta, mas dentro do máximo"
            : "dentro do limite legal";
    out.push(
      `A despesa total com pessoal do Executivo (salários, encargos e aposentadorias) somou ${pct(p.percentual)} da receita corrente líquida ajustada. A Lei de Responsabilidade Fiscal permite no máximo ${pct(p.limite)}: ${situacao}.`,
    );
  } else {
    out.push(
      "Não conseguimos obter os dados de gastos com pessoal desta prefeitura para o período.",
    );
  }
  return out;
}
