import { existsSync, readFileSync, rmSync } from "node:fs";
import { motivoEncerramento } from "./corrente-regras";

// Roda no publicar: o coletor apaga o arquivo só no runner dele, então a main nunca recebia a remoção.
const dir = new URL("../../public/data/", import.meta.url);
const corrente = new URL("gastos-corrente.json", dir);
if (!existsSync(corrente)) process.exit(0);

const exercicio = (u: URL): unknown => {
  try {
    return (JSON.parse(readFileSync(u, "utf8")) as { exercicio?: unknown }).exercicio;
  } catch {
    return undefined;
  }
};

const c = exercicio(corrente);
const f = exercicio(new URL("gastos.json", dir));
const motivo = motivoEncerramento(c, f, new Date().getUTCFullYear());
if (motivo) {
  rmSync(corrente);
  console.log(
    `gastos-corrente.json (exercício ${String(c)}) removido: ${motivo} (ano fechado: ${String(f)})`,
  );
}
