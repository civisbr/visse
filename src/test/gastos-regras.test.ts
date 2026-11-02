import { describe, expect, it } from "vitest";
import {
  extrairDespesas,
  extrairPessoal,
  selecionarMunicipios,
  type Ente,
} from "../../scripts/dados/gastos-regras";

const col = "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)";
const linha = (conta: string, valor: number, cod = "RREO2TotalDespesas", coluna = col) => ({
  cod_conta: cod,
  coluna,
  conta,
  valor,
});

describe("gastos", () => {
  it("extrai despesa total, saúde e educação sem intra-orçamentárias", () => {
    const d = extrairDespesas([
      linha("DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", 100),
      linha("Saúde", 20),
      linha("Educação", 30),
      linha("Saúde", 5, "RREO2TotalDespesasIntra"),
      linha("Saúde", 999, "RREO2TotalDespesas", "DOTAÇÃO ATUALIZADA (a)"),
    ]);
    expect(d).toEqual({ despesaTotal: 100, saude: 20, educacao: 30 });
  });
  it("rejeita dados incoerentes ou incompletos", () => {
    expect(
      extrairDespesas([
        linha("DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", 100),
        linha("Saúde", 90),
        linha("Educação", 90),
      ]),
    ).toBeNull();
    expect(extrairDespesas([linha("Saúde", 1)])).toBeNull();
  });
  it("extrai pessoal e limites da LRF", () => {
    const rc = "% sobre a RCL Ajustada";
    const p = extrairPessoal([
      { coluna: rc, conta: "DESPESA TOTAL COM PESSOAL - DTP (VI) = (IIIa + IIIb)", valor: 44.26 },
      { coluna: rc, conta: "LIMITE MÁXIMO (VII) (incisos I, II e III, art. 20 da LRF)", valor: 54 },
      { coluna: rc, conta: "LIMITE PRUDENCIAL (VIII) = (0,95 x VII)", valor: 51.3 },
      { coluna: rc, conta: "LIMITE DE ALERTA (IX) = (0,90 x VII)", valor: 48.6 },
      {
        coluna: "Valor",
        conta: "= RECEITA CORRENTE LÍQUIDA AJUSTADA PARA CÁLCULO DOS LIMITES (V)",
        valor: 100353188.07,
      },
    ]);
    expect(p).toEqual({
      percentual: 44.26,
      limite: 54,
      alerta: 48.6,
      prudencial: 51.3,
      rcl: 100353188.07,
    });
    expect(extrairPessoal([])).toBeNull();
  });
  it("seleciona todos os municípios do Nordeste com população válida, sem duplicar", () => {
    const e = (cod: number, uf: string, populacao: number, esfera = "M"): Ente => ({
      cod_ibge: cod,
      ente: `C${cod}`,
      uf,
      regiao: "NE",
      esfera,
      populacao,
    });
    const r = selecionarMunicipios([
      e(3, "BA", 900_000),
      e(1, "BA", 1_000),
      e(2, "CE", 5_000),
      e(4, "CE", 0),
      e(5, "SP", 20_000),
      e(6, "PE", 7_000, "E"),
      e(1, "BA", 1_000),
    ]);
    expect(r.map((x) => x.cod_ibge)).toEqual([1, 3, 2]);
  });
});
