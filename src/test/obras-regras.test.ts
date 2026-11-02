import { describe, expect, it } from "vitest";
import { normalizarObra, valorConfiavel } from "../../scripts/dados/obras-regras";

const item = {
  idUnico: "85349.29-29",
  nome: "ESCOLA X",
  uf: "BA",
  metaGlobal: "Escola 6 Salas",
  situacao: "Paralisada",
  dataFinalPrevista: "2022-01-03",
  dataSituacao: "2024-10-28",
  executores: [{ nome: "FNDE" }],
  fontesDeRecurso: [
    { valorInvestimentoPrevisto: 1_000_000 },
    { valorInvestimentoPrevisto: 500_000 },
  ],
};

describe("obras", () => {
  it("normaliza e soma valor previsto", () => {
    const o = normalizarObra(item, 27);
    expect(o?.valorPrevisto).toBe(1_500_000);
    expect(o?.execucaoFisica).toBe(27);
  });
  it("rejeita id inválido e campos ausentes", () => {
    expect(normalizarObra({ ...item, idUnico: "../x y" }, null)).toBeNull();
    expect(normalizarObra({ idUnico: "1.1-1" }, null)).toBeNull();
  });
  it("descarta percentual fora de 0-100", () => {
    expect(normalizarObra(item, 140)?.execucaoFisica).toBeNull();
  });
  it("ignora valor placeholder", () => {
    expect(valorConfiavel({ ...normalizarObra(item, null)!, valorPrevisto: 0.01 })).toBe(false);
  });
});

describe("proteções de obras", () => {
  it("exige situação paralisada e rejeita CPF no nome", () => {
    expect(normalizarObra({ ...item, situacao: "Em execução" }, null)).toBeNull();
    expect(normalizarObra({ ...item, nome: "OBRA JOAO 123.456.789-01" }, null)).toBeNull();
  });
  it("não publica executor com CPF", () => {
    expect(
      normalizarObra({ ...item, executores: [{ nome: "MARIA 12345678901" }] }, null)?.executor,
    ).toBe("Não informado");
  });
});
