import { describe, expect, it } from "vitest";
import { correnteEncerrado } from "../../scripts/dados/corrente-regras";

describe("correnteEncerrado", () => {
  it("mantém o ano em curso acima do ano fechado", () => {
    expect(correnteEncerrado(2026, 2025, 2026)).toBe(false);
  });
  it("encerra quando o ano virou", () => {
    expect(correnteEncerrado(2026, 2025, 2027)).toBe(true);
  });
  it("encerra quando o ano fechado alcançou o acompanhamento", () => {
    expect(correnteEncerrado(2026, 2026, 2026)).toBe(true);
  });
  it("encerra arquivo sem exercício válido e mantém sem ano fechado legível", () => {
    expect(correnteEncerrado(undefined, 2025, 2026)).toBe(true);
    expect(correnteEncerrado(2026, undefined, 2026)).toBe(false);
  });
});
