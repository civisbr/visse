import { describe, expect, it } from "vitest";
import { filtrarCidades, filtrarIndexadas, indexarCidades } from "@/components/CidadeCombobox";

const cidades = [
  { codIbge: 1, nome: "São José de Mipibu", uf: "RN" },
  { codIbge: 2, nome: "São José", uf: "CE" },
  { codIbge: 3, nome: "Jose Gonçalves", uf: "BA" },
  { codIbge: 4, nome: "Maceió", uf: "AL" },
  ...Array.from({ length: 200 }, (_, i) => ({ codIbge: 100 + i, nome: `Vila ${i}`, uf: "PI" })),
];

describe("filtrarCidades", () => {
  it("ignora acento e caixa", () => {
    expect(filtrarCidades(cidades, "MACEIO").map((c) => c.codIbge)).toEqual([4]);
    expect(filtrarCidades(cidades, "sao jose").map((c) => c.codIbge)).toEqual([1, 2]);
  });
  it("aceita a sigla do estado na busca", () => {
    expect(filtrarCidades(cidades, "jose ce").map((c) => c.codIbge)).toEqual([2]);
    expect(filtrarCidades(cidades, "São José - RN").map((c) => c.codIbge)).toEqual([1]);
  });
  it("prioriza quem começa com o termo", () => {
    expect(filtrarCidades(cidades, "jose")[0]?.codIbge).toBe(3);
  });
  it("limita a lista renderizada", () => {
    expect(filtrarCidades(cidades, "").length).toBe(40);
    expect(filtrarCidades(cidades, "vila").length).toBe(40);
  });
  it("busca sem resultado devolve lista vazia", () => {
    expect(filtrarCidades(cidades, "zzz")).toEqual([]);
  });
  it("informa o total quando a lista é cortada", () => {
    const r = filtrarIndexadas(indexarCidades(cidades), "vila");
    expect(r.itens).toHaveLength(40);
    expect(r.total).toBe(200);
  });
});
