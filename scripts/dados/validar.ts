import { readFile } from "node:fs/promises";
import { lerGastos } from "../../src/lib/gastos-data";
import { lerObras } from "../../src/lib/obras-data";
import { lerDados } from "../../src/lib/red-flags-data";

// Usa os mesmos parsers do front: se o site não consegue ler o arquivo, ele não deve ser publicado.
const alvo = process.argv[2];
if (alvo !== "red-flags" && alvo !== "obras" && alvo !== "gastos")
  throw new Error("Uso: validar.ts red-flags|obras|gastos");

const bruto = JSON.parse(
  await readFile(new URL(`../../public/data/${alvo}.json`, import.meta.url), "utf8"),
) as Record<string, unknown>;
const campo = { obras: "obras", gastos: "municipios", "red-flags": "alertas" }[alvo];
const lista = bruto[campo] as unknown[];
const lido =
  alvo === "obras"
    ? lerObras(bruto)?.obras
    : alvo === "gastos"
      ? lerGastos(bruto)?.municipios
      : lerDados(bruto)?.alertas;

// PNCP fora do ar devolveria zero contratos; o coletor já aborta, e aqui é a segunda barreira.
if (alvo === "red-flags" && !(Number(bruto["analisados"]) > 0))
  throw new Error("red-flags.json sem contratos analisados");
if (alvo === "gastos" && lista.length === 0) throw new Error("gastos.json sem municípios");
if (!lido) throw new Error(`${alvo}.json inválido para o front`);
if (lido.length !== lista.length)
  throw new Error(
    `${alvo}.json: ${lista.length - lido.length} registro(s) rejeitado(s) pelo front`,
  );
console.log(`${alvo}.json válido (${lido.length} registros)`);
