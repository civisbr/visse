import { describe, expect, it } from "vitest";
import { agruparPorUF } from "@/lib/estados";

describe("agruparPorUF", () => {
  it("agrupa por estado, em ordem alfabética pelo nome, e mantém a ordem dos itens", () => {
    const g = agruparPorUF(
      [
        { id: 1, uf: "PE" },
        { id: 2, uf: "BA" },
        { id: 3, uf: "PE" },
        { id: 4, uf: "AL" },
      ],
      (x) => x.uf,
    );
    expect(g.map((x) => x.uf)).toEqual(["AL", "BA", "PE"]);
    expect(g.find((x) => x.uf === "PE")?.itens.map((x) => x.id)).toEqual([1, 3]);
    expect(g[0]?.nome).toBe("Alagoas");
  });
  it("UF desconhecida vai para o fim sem sumir", () => {
    const g = agruparPorUF([{ uf: "XX" }, { uf: "CE" }], (x) => x.uf);
    expect(g.map((x) => x.uf)).toEqual(["CE", "XX"]);
    expect(g[1]?.nome).toBe("XX");
  });
  it("lista vazia dá nenhum grupo", () => {
    expect(agruparPorUF([], () => "BA")).toEqual([]);
  });
});
