export type ItemSiconfi = {
  anexo?: unknown;
  coluna?: unknown;
  conta?: unknown;
  cod_conta?: unknown;
  valor?: unknown;
};

export type Ente = {
  cod_ibge: number;
  ente: string;
  uf: string;
  regiao: string;
  esfera: string;
  populacao: number;
};

export type Despesas = { despesaTotal: number; saude: number; educacao: number };
export type Pessoal = {
  percentual: number;
  limite: number;
  alerta: number | null;
  prudencial: number | null;
  rcl: number | null;
};

const NORDESTE = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);
const ALVO_POP = 20_000;

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Piloto: por UF, os 3 municípios de 10 a 30 mil habitantes mais próximos de 20 mil (critério fixo e reproduzível).
export function selecionarPiloto(entes: Ente[], porUf = 3): Ente[] {
  const validos = entes.filter(
    (e) =>
      Number.isInteger(e.cod_ibge) &&
      typeof e.ente === "string" &&
      e.ente.length <= 80 &&
      e.esfera === "M" &&
      NORDESTE.has(e.uf) &&
      num(e.populacao) &&
      e.populacao >= 10_000 &&
      e.populacao <= 30_000,
  );
  return [...NORDESTE].sort().flatMap((uf) =>
    validos
      .filter((e) => e.uf === uf)
      .sort(
        (a, b) =>
          Math.abs(a.populacao - ALVO_POP) - Math.abs(b.populacao - ALVO_POP) ||
          a.cod_ibge - b.cod_ibge,
      )
      .slice(0, porUf),
  );
}

// RREO Anexo 02, despesas liquidadas até o 6º bimestre, só orçamento fiscal/seguridade (sem intra-orçamentárias).
export function extrairDespesas(itens: ItemSiconfi[]): Despesas | null {
  const base = itens.filter(
    (i) =>
      i.cod_conta === "RREO2TotalDespesas" &&
      i.coluna === "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)" &&
      num(i.valor),
  );
  const pega = (f: (c: string) => boolean) =>
    base.find((i) => typeof i.conta === "string" && f(i.conta))?.valor as number | undefined;
  const despesaTotal = pega((c) => c.toUpperCase().startsWith("DESPESAS (EXCETO"));
  const saude = pega((c) => c.trim().normalize("NFC") === "Saúde");
  const educacao = pega((c) => c.trim().normalize("NFC") === "Educação");
  if (
    despesaTotal === undefined ||
    saude === undefined ||
    educacao === undefined ||
    despesaTotal <= 0
  )
    return null;
  if (saude < 0 || educacao < 0 || saude + educacao > despesaTotal * 1.001) return null;
  return { despesaTotal, saude, educacao };
}

// RGF Anexo 01: percentual da despesa com pessoal sobre a RCL ajustada e os limites da LRF.
export function extrairPessoal(itens: ItemSiconfi[]): Pessoal | null {
  const pct = (inicio: string) => {
    const i = itens.find(
      (x) =>
        typeof x.coluna === "string" &&
        x.coluna.startsWith("% sobre a RCL") &&
        typeof x.conta === "string" &&
        x.conta.toUpperCase().startsWith(inicio) &&
        num(x.valor),
    );
    return i ? (i.valor as number) : null;
  };
  const percentual = pct("DESPESA TOTAL COM PESSOAL");
  const limite = pct("LIMITE M");
  if (
    percentual === null ||
    limite === null ||
    percentual < 0 ||
    percentual > 200 ||
    limite <= 0 ||
    limite > 100
  )
    return null;
  const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  const rcl = itens.find(
    (x) =>
      x.coluna === "Valor" &&
      typeof x.conta === "string" &&
      semAcento(x.conta).includes("RECEITA CORRENTE LIQUIDA AJUSTADA") &&
      num(x.valor),
  )?.valor as number | undefined;
  const alerta = pct("LIMITE DE ALERTA");
  const prudencial = pct("LIMITE PRUDENCIAL");
  // Limites fora de ordem indicam leitura errada; melhor omitir do que sinalizar com base incorreta.
  const coerente =
    alerta !== null && prudencial !== null && alerta <= prudencial && prudencial <= limite;
  return {
    percentual,
    limite,
    alerta: coerente ? alerta : null,
    prudencial: coerente ? prudencial : null,
    rcl: rcl ?? null,
  };
}
