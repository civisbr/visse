// O acompanhamento do ano em curso deixa de valer quando o ano termina ou quando o ano fechado o alcança.
export function correnteEncerrado(
  exercicioCorrente: unknown,
  exercicioFechado: unknown,
  anoAtual: number,
): boolean {
  const c = Number(exercicioCorrente);
  if (!Number.isInteger(c)) return true;
  const f = Number(exercicioFechado);
  return c < anoAtual || (Number.isInteger(f) && c <= f);
}
