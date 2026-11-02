export type Contrato = {
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

export type Alerta = {
  contrato: Contrato;
  regra: "empresa-recente" | "aditivo-alto";
  detalhe: string;
  prioridade: number;
};

const LIMITE_VALOR_EMPRESA_RECENTE = 100_000;
const LIMITE_ADITIVO = 0.25;
const MESES_EMPRESA_RECENTE = 6;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}/;

// Parse manual em UTC: `new Date("YYYY-MM-DD")` já é UTC, então misturar com getMonth() local erra um dia em UTC-3.
function partes(iso: string): [number, number, number] | null {
  if (!DATA_ISO.test(iso)) return null;
  const d = new Date(iso.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

export function mesesEntre(inicio: string, fim: string): number {
  const a = partes(inicio);
  const b = partes(fim);
  if (!a || !b) return Number.NaN;
  return (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
}

// Razão social de MEI/empresário individual costuma ser "NOME CPF"; é dado pessoal e fica fora da publicação.
export function pareceCpfNoNome(nome: string): boolean {
  return /\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(nome);
}

export function aditivoAlto(c: Contrato): Alerta | null {
  if (!(c.valorInicial > 0) || !(c.valorAcumulado > c.valorInicial)) return null;
  // Em centavos inteiros: a divisão em ponto flutuante poderia marcar exatamente 25%.
  const ini = Math.round(c.valorInicial * 100);
  const acum = Math.round(c.valorAcumulado * 100);
  if (acum * 100 <= ini * (100 + LIMITE_ADITIVO * 100)) return null;
  const aumento = acum / ini - 1;
  return {
    contrato: c,
    regra: "aditivo-alto",
    detalhe: `Valor subiu ${(Math.floor(aumento * 1000) / 10).toLocaleString("pt-BR")}% sobre o contratado.`,
    prioridade: Math.min(100, Math.round(aumento * 100)),
  };
}

export function empresaRecente(c: Contrato, abertura: string | null): Alerta | null {
  if (!abertura || c.valorInicial < LIMITE_VALOR_EMPRESA_RECENTE) return null;
  const meses = mesesEntre(abertura, c.assinatura);
  if (!Number.isFinite(meses) || meses < 0 || meses >= MESES_EMPRESA_RECENTE) return null;
  return {
    contrato: c,
    regra: "empresa-recente",
    detalhe: `CNPJ com início de atividade em ${abertura.slice(0, 10)}, ${meses} mês(es) antes da assinatura.`,
    prioridade: 60 + Math.min(40, Math.round(c.valorInicial / 50_000)),
  };
}
