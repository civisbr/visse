export type PessoalMunicipio = {
  percentual: number;
  limite: number;
  alerta: number | null;
  prudencial: number | null;
  rcl: number | null;
};

// Só no acompanhamento do ano corrente: até qual bimestre vão as despesas e de qual período do RGF vem o pessoal.
export type PeriodoMunicipio = {
  bimestre: number;
  pessoal: { tipo: "Q" | "S"; numero: number } | null;
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
  periodo?: PeriodoMunicipio;
};

export type DadosGastos = {
  aviso: string;
  fonte: string;
  geradoEm: string;
  exercicio: number;
  // Ano ainda em curso: cada município aparece com o último período que enviou.
  parcial: boolean;
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

function periodoValido(p: unknown): boolean {
  if (p === undefined) return true;
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  if (
    !Number.isInteger(x["bimestre"]) ||
    (x["bimestre"] as number) < 1 ||
    (x["bimestre"] as number) > 6
  )
    return false;
  const r = x["pessoal"];
  if (r === null) return true;
  if (!r || typeof r !== "object") return false;
  const y = r as Record<string, unknown>;
  const max = y["tipo"] === "Q" ? 3 : y["tipo"] === "S" ? 2 : 0;
  return (
    Number.isInteger(y["numero"]) && (y["numero"] as number) >= 1 && (y["numero"] as number) <= max
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
    pessoalValido(x["pessoal"]) &&
    periodoValido(x["periodo"])
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
    parcial: d["parcial"] === true,
    municipios,
  };
}

export type ArquivoGastos = "gastos" | "gastos-corrente";

// null = ainda não publicado (404); falha de rede ou arquivo inválido lança.
export async function carregarGastos(
  arquivo: ArquivoGastos = "gastos",
): Promise<DadosGastos | null> {
  const r = await fetch(`/data/${arquivo}.json`, {
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

export type NivelPessoal = "limite" | "prudencial" | "alerta" | "ok";

// Compara com os limites da LRF já arredondados a uma casa, como aparecem no texto, para pin e frase concordarem.
export function nivelPessoal(p: PessoalMunicipio): NivelPessoal {
  if (arred(p.percentual) > arred(p.limite)) return "limite";
  if (p.prudencial !== null && arred(p.percentual) > arred(p.prudencial)) return "prudencial";
  if (p.alerta !== null && arred(p.percentual) > arred(p.alerta)) return "alerta";
  return "ok";
}
const pct = (n: number) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const FIM_BIMESTRE = ["fevereiro", "abril", "junho", "agosto", "outubro", "dezembro"];
export const rotuloBimestre = (b: number) => `${b}º bimestre (encerrado em ${FIM_BIMESTRE[b - 1]})`;
const rotuloPeriodoPessoal = (p: { tipo: "Q" | "S"; numero: number }) =>
  `${p.numero}º ${p.tipo === "Q" ? "quadrimestre" : "semestre"}`;

// Texto determinístico, sem juízo político: só compara com o limite da LRF, que é a única regra com base de cálculo disponível.
export function explicarMunicipio(m: MunicipioGastos, exercicio: number): string[] {
  const out = [
    `Em ${exercicio}${m.periodo ? `, até o ${rotuloBimestre(m.periodo.bimestre)}` : ""}, o município de ${m.nome} (${m.uf}), com cerca de ${m.populacao.toLocaleString("pt-BR")} habitantes, gastou ${brl(m.despesaTotal)}. Isso dá ${brl(m.despesaTotal / m.populacao)} por morador.`,
    `Desse total, ${brl(m.saude)} (${pct((m.saude / m.despesaTotal) * 100)}) foram para a saúde, ou ${brl(m.saude / m.populacao)} por pessoa. Para a educação foram ${brl(m.educacao)} (${pct((m.educacao / m.despesaTotal) * 100)}), ou ${brl(m.educacao / m.populacao)} por pessoa.`,
  ];
  if (m.pessoal) {
    const p = m.pessoal;
    const situacao = {
      limite: "o valor informado ficou acima do limite máximo da LRF, o que merece atenção",
      prudencial: "acima do limite prudencial, perto do máximo",
      alerta: "acima do limite de alerta, mas dentro do máximo",
      ok: "dentro do limite legal",
    }[nivelPessoal(p)];
    out.push(
      `A despesa total com pessoal do Executivo (salários, encargos e aposentadorias) somou ${pct(p.percentual)} da receita corrente líquida ajustada. A Lei de Responsabilidade Fiscal permite no máximo ${pct(p.limite)}: ${situacao}.${m.periodo?.pessoal ? ` Esse percentual é do ${rotuloPeriodoPessoal(m.periodo.pessoal)} de ${exercicio}.` : ""}`,
    );
  } else if (m.periodo) {
    out.push(
      `A prefeitura ainda não enviou, ou o período ainda não terminou, o relatório de gastos com pessoal de ${exercicio}.`,
    );
  } else {
    out.push(
      "Não conseguimos obter os dados de gastos com pessoal desta prefeitura para o período.",
    );
  }
  return out;
}

export type ResumoGastos = {
  exercicio: number;
  geradoEm: string;
  publicados: number;
  acimaLimite: number;
  acimaPrudencial: number;
  acimaAlerta: number;
};

export function resumirGastos(
  municipios: MunicipioGastos[],
  exercicio: number,
  geradoEm: string,
): ResumoGastos {
  const r = { acimaLimite: 0, acimaPrudencial: 0, acimaAlerta: 0 };
  for (const m of municipios) {
    const n = m.pessoal ? nivelPessoal(m.pessoal) : "ok";
    if (n === "limite") r.acimaLimite++;
    else if (n === "prudencial") r.acimaPrudencial++;
    else if (n === "alerta") r.acimaAlerta++;
  }
  return { exercicio, geradoEm, publicados: municipios.length, ...r };
}

export function lerResumoGastos(bruto: unknown): ResumoGastos | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;
  const cont = (v: unknown): v is number =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) < 100_000;
  if (
    !cont(d["publicados"]) ||
    !cont(d["acimaLimite"]) ||
    !cont(d["acimaPrudencial"]) ||
    !cont(d["acimaAlerta"]) ||
    !num(d["exercicio"]) ||
    !str(d["geradoEm"])
  )
    return null;
  return {
    exercicio: d["exercicio"],
    geradoEm: d["geradoEm"],
    publicados: d["publicados"],
    acimaLimite: d["acimaLimite"],
    acimaPrudencial: d["acimaPrudencial"],
    acimaAlerta: d["acimaAlerta"],
  };
}

export async function carregarResumoGastos(): Promise<ResumoGastos | null> {
  const r = await fetch("/data/gastos-resumo.json", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
  return lerResumoGastos(await r.json());
}
