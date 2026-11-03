export type ArquivoDados = "gastos" | "gastos-corrente" | "obras" | "red-flags";
type Json = Record<string, unknown> | null;

export const ARQUIVOS_DADOS: ArquivoDados[] = ["gastos", "gastos-corrente", "obras", "red-flags"];

const CAMPO: Record<ArquivoDados, string> = {
  gastos: "municipios",
  "gastos-corrente": "municipios",
  obras: "obras",
  "red-flags": "alertas",
};

// Variação máxima aceita entre duas coletas seguidas; acima disso, uma pessoa confere antes de ir ao ar.
const LIMITES: Record<ArquivoDados, { queda: number; alta?: number; folga?: number }> = {
  gastos: { queda: 0.1 },
  "gastos-corrente": { queda: 0.1 },
  obras: { queda: 0.5 },
  // Poucos alertas oscilam muito em termos relativos; a folga evita barrar 3 para 5.
  "red-flags": { queda: 0.5, alta: 0.5, folga: 10 },
};

const tamanho = (a: ArquivoDados, j: Json): number | null => {
  const lista = j?.[CAMPO[a]];
  return Array.isArray(lista) ? lista.length : null;
};

// Devolve os motivos para NÃO publicar sozinho; lista vazia significa que a mudança está dentro do esperado.
export function avaliarSanidade(
  arquivo: ArquivoDados,
  antes: Json,
  depois: Json,
  anoAtual = new Date().getFullYear(),
): string[] {
  // O coletor remove o acompanhamento do ano que já fechou; isso é esperado.
  if (depois === null) return arquivo === "gastos-corrente" ? [] : [`${arquivo}.json ausente`];
  const n1 = tamanho(arquivo, depois);
  if (n1 === null) return [`${arquivo}.json sem a lista "${CAMPO[arquivo]}"`];
  if (n1 === 0) return [`${arquivo}.json com lista vazia`];
  if (antes === null) return [];
  const n0 = tamanho(arquivo, antes);
  if (n0 === null || n0 === 0) return [];

  // Coleta que perdeu estados não pode substituir uma completa só porque a queda coube no limite.
  if (arquivo === "obras") {
    const falhas = (j: Json) => (Array.isArray(j?.["ufsComFalha"]) ? j["ufsComFalha"].length : 0);
    if (falhas(depois) > falhas(antes))
      return [`${arquivo}.json com mais UFs em falha que o anterior`];
  }

  if (arquivo === "gastos" || arquivo === "gastos-corrente") {
    const e0 = Number(antes["exercicio"]);
    const e1 = Number(depois["exercicio"]);
    if (!Number.isFinite(e0) || !Number.isFinite(e1))
      return [`${arquivo}.json sem exercício válido`];
    if (e1 < e0) return [`${arquivo}.json recuou de ${e0} para ${e1}`];
    if (e1 > anoAtual) return [`${arquivo}.json com exercício ${e1}, maior que o ano atual`];
    if (e1 > e0) {
      // O acompanhamento começa pequeno no ano novo; o ano fechado, não.
      return arquivo === "gastos" && n1 < n0 * 0.5
        ? [`${arquivo}.json do exercício ${e1} com ${n1} registros, contra ${n0} do anterior`]
        : [];
    }
  }

  const { queda, alta, folga = 0 } = LIMITES[arquivo];
  const motivos: string[] = [];
  if (n0 - n1 > Math.max(folga, n0 * queda))
    motivos.push(`${arquivo}.json caiu de ${n0} para ${n1} registros`);
  if (alta !== undefined && n1 - n0 > Math.max(folga, n0 * alta))
    motivos.push(`${arquivo}.json subiu de ${n0} para ${n1} registros`);
  return motivos;
}
