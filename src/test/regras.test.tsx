import { describe, it, expect } from "vitest";
import { avaliar } from "@/routes/red-flags";
import { traduzir } from "@/routes/tradutor";

const base = { num: "x", objeto: "x", valor: 200_000, participantes: 3, cnpj: "x", aberturaCnpj: "2015-01-01", dataLicitacao: "2026-01-01", aditivos: 0 };

describe("regras de risco", () => {
  it("concorrente único", () => expect(avaliar({ ...base, participantes: 1 })).toContain("Só uma empresa disputou"));
  it("empresa com menos de 6 meses e valor > 100 mil", () =>
    expect(avaliar({ ...base, aberturaCnpj: "2025-10-01" })).toContain("Empresa aberta há pouco tempo"));
  it("aditivo acima de 25%", () => expect(avaliar({ ...base, aditivos: 60_000 })).toContain("Ficou muito mais caro"));
  it("aditivo de exatamente 25% não alerta", () => expect(avaliar({ ...base, aditivos: 50_000 })).toEqual([]));
  it("saúde abaixo de 15% é sinalizada", () =>
    expect(traduzir({ municipio: "X", receita: 100, saude: 10, educacao: 30, pessoal: 40, habitantes: 1 })[1]).toContain("NÃO foi atingido"));
});
