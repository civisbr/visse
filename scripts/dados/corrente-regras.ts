export type MotivoEncerramento = "ano virou" | "ano fechado alcançou";

const inteiro = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);

// O acompanhamento do ano em curso deixa de valer quando o ano termina ou quando o ano fechado o alcança.
// Exercício ilegível não é motivo para apagar: deixa a validação reprovar em vez de sumir com o arquivo.
export function motivoEncerramento(
  exercicioCorrente: unknown,
  exercicioFechado: unknown,
  anoAtual: number,
): MotivoEncerramento | null {
  if (!inteiro(exercicioCorrente)) return null;
  if (exercicioCorrente < anoAtual) return "ano virou";
  return inteiro(exercicioFechado) && exercicioCorrente <= exercicioFechado
    ? "ano fechado alcançou"
    : null;
}
