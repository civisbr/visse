import { describe, expect, it } from "vitest";
import { aditivoAlto, empresaRecente, mesesEntre, type Contrato } from "../../scripts/dados/regras";

const base: Contrato = {
  id: "x",
  orgao: "o",
  municipio: "m",
  uf: "BA",
  objeto: "obj",
  fornecedor: "f",
  cnpj: "12345678000199",
  valorInicial: 200_000,
  valorAcumulado: 200_000,
  assinatura: "2026-08-14",
  link: "l",
};

describe("regras", () => {
  it("calcula meses completos", () => {
    expect(mesesEntre("2026-03-20", "2026-08-14")).toBe(4);
  });
  it("marca aditivo acima de 25%", () => {
    expect(aditivoAlto({ ...base, valorAcumulado: 250_000 })).toBeNull();
    expect(aditivoAlto({ ...base, valorAcumulado: 250_001 })?.regra).toBe("aditivo-alto");
  });
  it("marca empresa com menos de 6 meses e valor alto", () => {
    expect(empresaRecente(base, "2026-04-01")?.regra).toBe("empresa-recente");
    expect(empresaRecente(base, "2026-01-01")).toBeNull();
    expect(empresaRecente({ ...base, valorInicial: 50_000 }, "2026-04-01")).toBeNull();
    expect(empresaRecente(base, null)).toBeNull();
  });
});

describe("proteções", () => {
  it("ignora data inválida", () => {
    expect(empresaRecente(base, "2026-13-45")).toBeNull();
    expect(mesesEntre("lixo", "2026-08-14")).toBeNaN();
  });
  it("não marca abertura posterior à assinatura nem valor zero", () => {
    expect(empresaRecente(base, "2026-09-01")).toBeNull();
    expect(aditivoAlto({ ...base, valorInicial: 0, valorAcumulado: 10 })).toBeNull();
  });
  it("detecta CPF no nome do fornecedor", async () => {
    const { pareceCpfNoNome } = await import("../../scripts/dados/regras");
    expect(pareceCpfNoNome("JOAO DA SILVA 12345678901")).toBe(true);
    expect(pareceCpfNoNome("JOAO DA SILVA 123.456.789-01")).toBe(true);
    expect(pareceCpfNoNome("ARRUDA & AGUIAR LTDA")).toBe(false);
  });
});
