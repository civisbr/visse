export type Obra = {
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

type ItemObrasGov = {
  idUnico?: unknown;
  nome?: unknown;
  uf?: unknown;
  metaGlobal?: unknown;
  situacao?: unknown;
  dataFinalPrevista?: unknown;
  dataSituacao?: unknown;
  executores?: unknown;
  fontesDeRecurso?: unknown;
};

import { pareceCpfNoNome } from "./regras";

const ID = /^[\w.-]{3,30}$/;
const ISO = /^\d{4}-\d{2}-\d{2}/;

// Valida cada campo: a resposta é externa e vai direto para um JSON público.
export function normalizarObra(i: ItemObrasGov, execucaoFisica: number | null): Obra | null {
  if (typeof i.idUnico !== "string" || !ID.test(i.idUnico)) return null;
  if (typeof i.nome !== "string" || typeof i.uf !== "string" || typeof i.situacao !== "string")
    return null;
  if (i.situacao !== "Paralisada") return null;
  if (pareceCpfNoNome(i.nome)) return null;
  const executores = Array.isArray(i.executores) ? (i.executores as { nome?: unknown }[]) : [];
  const fontes = Array.isArray(i.fontesDeRecurso)
    ? (i.fontesDeRecurso as { valorInvestimentoPrevisto?: unknown }[])
    : [];
  const valor = fontes.reduce(
    (s, f) =>
      s +
      (typeof f.valorInvestimentoPrevisto === "number" &&
      Number.isFinite(f.valorInvestimentoPrevisto)
        ? f.valorInvestimentoPrevisto
        : 0),
    0,
  );
  return {
    id: i.idUnico,
    nome: i.nome.slice(0, 200),
    uf: i.uf,
    tipo: typeof i.metaGlobal === "string" ? i.metaGlobal.slice(0, 120) : "Obra",
    executor:
      typeof executores[0]?.nome === "string" && !pareceCpfNoNome(executores[0].nome)
        ? executores[0].nome.slice(0, 120)
        : "Não informado",
    situacao: i.situacao,
    valorPrevisto: valor,
    execucaoFisica:
      execucaoFisica !== null && execucaoFisica >= 0 && execucaoFisica <= 100
        ? execucaoFisica
        : null,
    dataFinalPrevista:
      typeof i.dataFinalPrevista === "string" && ISO.test(i.dataFinalPrevista)
        ? i.dataFinalPrevista.slice(0, 10)
        : null,
    dataSituacao:
      typeof i.dataSituacao === "string" && ISO.test(i.dataSituacao)
        ? i.dataSituacao.slice(0, 10)
        : null,
  };
}

// Valor previsto de 1 centavo é placeholder de cadastro; não serve para ranquear.
export const valorConfiavel = (o: Obra) => o.valorPrevisto >= 1000;
