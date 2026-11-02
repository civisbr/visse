import { describe, expect, it } from "vitest";
import { lerObras } from "@/lib/obras-data";

const obra = {
  id: "1.1-1",
  nome: "n",
  uf: "BA",
  tipo: "t",
  executor: "e",
  situacao: "Paralisada",
  valorPrevisto: 1000,
  execucaoFisica: 10,
  dataFinalPrevista: "2022-01-03",
  dataSituacao: null,
};
const ok = { aviso: "a", fonte: "f", geradoEm: "2026-11-01T00:00:00Z", obras: [obra] };

describe("dados de obras", () => {
  it("aceita o formato do pipeline", () => expect(lerObras(ok)?.obras).toHaveLength(1));
  it("descarta obra inválida", () => {
    const r = lerObras({
      ...ok,
      obras: [
        obra,
        { ...obra, uf: "SP" },
        { ...obra, execucaoFisica: 200 },
        { ...obra, dataFinalPrevista: "x" },
      ],
    });
    expect(r?.obras).toHaveLength(1);
  });
  it("rejeita arquivo inválido ou data futura", () => {
    expect(lerObras({ obras: [] })).toBeNull();
    expect(lerObras({ ...ok, geradoEm: "2999-01-01T00:00:00Z" })).toBeNull();
  });
});
