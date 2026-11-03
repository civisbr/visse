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

describe("acompanhamento do ano corrente", () => {
  const comPeriodo = {
    ...m,
    periodo: { bimestre: 4, pessoal: { tipo: "Q" as const, numero: 2 } },
  };

  it("lê o arquivo parcial e mantém o período de cada município", () => {
    const d = lerGastos({ ...ok, exercicio: 2026, parcial: true, municipios: [comPeriodo] });
    expect(d?.parcial).toBe(true);
    expect(d?.municipios[0]?.periodo?.bimestre).toBe(4);
  });
  it("arquivo sem a marca é tratado como ano fechado", () => {
    expect(lerGastos(ok)?.parcial).toBe(false);
  });
  it("descarta município com período impossível", () => {
    const ruim = (periodo: unknown) =>
      lerGastos({ ...ok, municipios: [m, { ...m, codIbge: 2604602, periodo }] })?.municipios;
    expect(ruim({ bimestre: 7, pessoal: null })).toHaveLength(1);
    expect(ruim({ bimestre: 4, pessoal: { tipo: "Q", numero: 4 } })).toHaveLength(1);
    expect(ruim({ bimestre: 4, pessoal: { tipo: "S", numero: 3 } })).toHaveLength(1);
    expect(ruim({ bimestre: 4, pessoal: { tipo: "X", numero: 1 } })).toHaveLength(1);
    expect(ruim({ bimestre: 4, pessoal: null })).toHaveLength(2);
  });
  it("o texto diz até qual bimestre e de qual quadrimestre vêm os números", () => {
    const [a, , c] = explicarMunicipio(comPeriodo, 2026);
    expect(a).toContain("Em 2026, até o 4º bimestre (encerrado em agosto), o município de Condado");
    expect(c).toContain("Esse percentual é do 2º quadrimestre de 2026.");
  });
  it("sem período o texto continua o mesmo do ano fechado", () => {
    const [a, , c] = explicarMunicipio(m, 2025);
    expect(a).toContain("Em 2025, o município de Condado");
    expect(c).not.toContain("quadrimestre de");
  });
});
