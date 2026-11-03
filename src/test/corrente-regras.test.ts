import { describe, expect, it } from "vitest";
import { motivoEncerramento } from "../../scripts/dados/corrente-regras";

describe("motivoEncerramento", () => {
  it("mantém o ano em curso acima do ano fechado", () => {
    expect(motivoEncerramento(2026, 2025, 2026)).toBeNull();
  });
  it("encerra quando o ano virou", () => {
    expect(motivoEncerramento(2026, 2025, 2027)).toBe("ano virou");
  });
  it("encerra quando o ano fechado alcançou o acompanhamento", () => {
    expect(motivoEncerramento(2026, 2026, 2026)).toBe("ano fechado alcançou");
  });
  it("não apaga arquivo com exercício ilegível, nem sem ano fechado legível", () => {
    for (const ruim of [undefined, null, "2026", 0.5, NaN]) {
      expect(motivoEncerramento(ruim, 2025, 2027)).toBeNull();
    }
    expect(motivoEncerramento(2026, undefined, 2026)).toBeNull();
  });
});
