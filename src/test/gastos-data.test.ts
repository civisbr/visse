import { describe, expect, it } from "vitest";
import { explicarMunicipio, lerGastos } from "@/lib/gastos-data";

const m = {
  codIbge: 2604601,
  nome: "Condado",
  uf: "PE",
  populacao: 25000,
  despesaTotal: 100_000_000,
  saude: 25_000_000,
  educacao: 30_000_000,
  pessoal: { percentual: 44.26, limite: 54, alerta: 48.6, prudencial: 51.3, rcl: 1 },
};
const ok = {
  aviso: "a",
  fonte: "f",
  geradoEm: "2026-11-01T00:00:00Z",
  exercicio: 2025,
  municipios: [m],
};

describe("gastos no front", () => {
  it("aceita o formato do pipeline e descarta inválidos e duplicados", () => {
    expect(lerGastos(ok)?.municipios).toHaveLength(1);
    expect(
      lerGastos({
        ...ok,
        municipios: [m, m, { ...m, codIbge: 2, uf: "SP" }, { ...m, codIbge: 3, despesaTotal: 0 }],
      })?.municipios,
    ).toHaveLength(1);
  });
  it("rejeita arquivo inválido, todos inválidos ou data futura", () => {
    expect(lerGastos({})).toBeNull();
    expect(lerGastos({ ...ok, municipios: [{ ...m, uf: "SP" }] })).toBeNull();
    expect(lerGastos({ ...ok, geradoEm: "2999-01-01T00:00:00Z" })).toBeNull();
  });
  it("explica sem afirmar mínimos legais de saúde e educação", () => {
    const t = explicarMunicipio(m as never, 2025).join(" ");
    expect(t).toContain("dentro do limite legal");
    expect(t).not.toContain("15%");
  });
  it("sinaliza pessoal acima do limite e lida com ausência do relatório", () => {
    const acima = { ...m, pessoal: { ...m.pessoal, percentual: 55 } };
    expect(explicarMunicipio(acima as never, 2025).join(" ")).toContain(
      "acima do limite máximo da LRF",
    );
    expect(explicarMunicipio({ ...m, pessoal: null } as never, 2025).join(" ")).toContain(
      "Não conseguimos",
    );
  });
});

describe("validações e textos extras", () => {
  it("rejeita código IBGE inválido, saúde+educação acima do total e nome com caractere de controle", () => {
    expect(lerGastos({ ...ok, municipios: [{ ...m, codIbge: 12 }] })).toBeNull();
    expect(
      lerGastos({ ...ok, municipios: [{ ...m, saude: 90_000_000, educacao: 90_000_000 }] }),
    ).toBeNull();
    expect(lerGastos({ ...ok, municipios: [{ ...m, nome: "Cond‮ado" }] })).toBeNull();
    expect(lerGastos({ ...ok, exercicio: 1999 })).toBeNull();
  });
  it("descreve limites de alerta e prudencial", () => {
    const com = (percentual: number) =>
      explicarMunicipio({ ...m, pessoal: { ...m.pessoal, percentual } } as never, 2025).join(" ");
    expect(com(49)).toContain("acima do limite de alerta");
    expect(com(52)).toContain("acima do limite prudencial");
  });

  it("rejeita arquivo com mais de 2000 municípios", () => {
    const muitos = Array.from({ length: 2001 }, (_, i) => ({ ...m, codIbge: 2_000_000 + i }));
    expect(lerGastos({ ...ok, municipios: muitos })).toBeNull();
    expect(lerGastos({ ...ok, municipios: muitos.slice(0, 2000) })?.municipios).toHaveLength(2000);
  });
});
