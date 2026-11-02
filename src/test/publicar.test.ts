import { describe, expect, it } from "vitest";
import type { DadosCnpj } from "../../scripts/dados/cnpj";
import { filtrarPublicaveis } from "../../scripts/dados/publicar";
import type { Alerta } from "../../scripts/dados/regras";

const alerta = (cnpj: string, objeto = "obra"): Alerta => ({
  regra: "aditivo-alto",
  detalhe: "d",
  prioridade: 10,
  contrato: {
    id: cnpj,
    orgao: "o",
    municipio: "m",
    uf: "BA",
    objeto,
    fornecedor: "f",
    cnpj,
    valorInicial: 1,
    valorAcumulado: 2,
    assinatura: "2026-01-01",
    link: "l",
  },
});
const dados = (p: Partial<DadosCnpj>): DadosCnpj => ({
  abertura: null,
  pessoaFisica: false,
  consorcio: false,
  verificado: true,
  ...p,
});

describe("filtrarPublicaveis", () => {
  it("separa cada motivo de descarte e respeita o máximo", async () => {
    const mapa: Record<string, DadosCnpj> = {
      "1": dados({}),
      "2": dados({ pessoaFisica: true }),
      "3": dados({ verificado: false }),
      "4": dados({}),
      "5": dados({}),
    };
    const r = await filtrarPublicaveis(
      [
        alerta("1"),
        alerta("2"),
        alerta("3"),
        alerta("6", "pagamento ao CPF 123.456.789-01"),
        alerta("4"),
        alerta("5"),
      ],
      async (c) => mapa[c] ?? dados({}),
      2,
    );
    expect(r.publicaveis.map((a) => a.contrato.cnpj)).toEqual(["1", "4"]);
    expect(r.descartes).toEqual({
      cpfNoObjeto: 1,
      semVerificacao: 1,
      pessoaFisica: 1,
      acimaDoLimite: 1,
    });
  });
});
