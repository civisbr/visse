import { describe, expect, it } from "vitest";
import { coletarGastos, type Consulta } from "../../scripts/dados/gastos-coleta";
import type { Ente } from "../../scripts/dados/gastos-regras";

const COL = "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)";
const rreo = [
  ["DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", 100],
  ["Saúde", 20],
  ["Educação", 30],
].map(([conta, valor]) => ({ cod_conta: "RREO2TotalDespesas", coluna: COL, conta, valor }));
const rgf = [
  ["DESPESA TOTAL COM PESSOAL - DTP", 40],
  ["LIMITE MÁXIMO (III) (incisos I, II e III, art. 20 da LRF)", 54],
  ["LIMITE PRUDENCIAL (IV) = (0,95 x III) (parágrafo único do art. 22 da LRF)", 51.3],
  ["LIMITE DE ALERTA (V) = (0,90 x III) (inciso II do §1º do art. 59 da LRF)", 48.6],
].map(([conta, valor]) => ({ coluna: "% sobre a RCL ajustada", conta, valor }));

const ente = (cod: number): Ente => ({
  cod_ibge: cod,
  ente: `Cidade ${cod}`,
  uf: "CE",
  regiao: "NE",
  esfera: "M",
  populacao: 20_000,
});
const piloto = [1, 2, 3, 4].map(ente);
const opcoes = { pausaMs: 0, log: () => {} };

describe("coletarGastos", () => {
  it("usa o ano anterior quando a maioria enviou", async () => {
    const consulta: Consulta = async (rota) => (rota === "rreo" ? rreo : rgf);
    const r = await coletarGastos(consulta, piloto, 2026, opcoes);
    expect(r.exercicio).toBe(2025);
    expect(r.municipios).toHaveLength(4);
    expect(r.municipios[0]?.rgfPeriodicidade).toBe("quadrimestral");
  });

  it("recua para dois anos atrás quando o ano anterior não tem envio", async () => {
    const consulta: Consulta = async (rota, q) =>
      rota === "rreo" ? (q["an_exercicio"] === "2024" ? rreo : []) : rgf;
    const r = await coletarGastos(consulta, piloto, 2026, opcoes);
    expect(r.exercicio).toBe(2024);
  });

  it("aborta em vez de recuar de ano quando há falha de rede", async () => {
    const consulta: Consulta = async (rota, q) => {
      if (rota === "rreo" && q["id_ente"] === "1") throw new Error("HTTP 500");
      return rota === "rreo" ? [] : rgf;
    };
    await expect(coletarGastos(consulta, piloto, 2026, opcoes)).rejects.toThrow(/Falhas de rede/);
  });

  it("cai para o RGF semestral quando o quadrimestral não existe", async () => {
    const consulta: Consulta = async (rota, q) =>
      rota === "rreo" ? rreo : q["in_periodicidade"] === "S" ? rgf : [];
    const r = await coletarGastos(consulta, piloto, 2026, opcoes);
    expect(r.municipios.every((m) => m.rgfPeriodicidade === "semestral")).toBe(true);
  });

  it("erro do RGF vira município sem pessoal e a maioria sem pessoal aborta", async () => {
    const consulta: Consulta = async (rota) => {
      if (rota === "rgf") throw new Error("HTTP 503");
      return rreo;
    };
    const r = await coletarGastos(consulta, piloto, 2026, opcoes).catch((e: Error) => e);
    expect(r).toBeInstanceOf(Error);
    expect((r as Error).message).toMatch(/sem dados de pessoal/);
  });

  it("mantém município com despesas e sem pessoal quando é minoria", async () => {
    const consulta: Consulta = async (rota, q) =>
      rota === "rgf" && q["id_ente"] === "1" ? [] : rota === "rreo" ? rreo : rgf;
    const r = await coletarGastos(consulta, piloto, 2026, opcoes);
    expect(r.semPessoal).toBe(1);
    expect(r.municipios).toHaveLength(4);
  });

  it("aborta quando nenhum ano tem dados", async () => {
    const consulta: Consulta = async () => [];
    await expect(coletarGastos(consulta, piloto, 2026, opcoes)).rejects.toThrow(/Nenhum município/);
  });

  it("aceita até um terço de falhas e aborta acima disso", async () => {
    const seis = [1, 2, 3, 4, 5, 6].map(ente);
    const comFalhas =
      (n: number): Consulta =>
      async (rota, q) => {
        if (rota === "rreo" && Number(q["id_ente"]) <= n) throw new Error("HTTP 500");
        return rota === "rreo" ? rreo : rgf;
      };
    const ok = await coletarGastos(comFalhas(2), seis, 2026, opcoes);
    expect(ok.falhas).toHaveLength(2);
    await expect(coletarGastos(comFalhas(3), seis, 2026, opcoes)).rejects.toThrow(
      /consultas falharam/,
    );
  });

  it("envia os parâmetros esperados ao SICONFI", async () => {
    const vistos: Array<[string, Record<string, string>]> = [];
    const consulta: Consulta = async (rota, q) => {
      vistos.push([rota, q]);
      return rota === "rreo" ? rreo : rgf;
    };
    await coletarGastos(consulta, [ente(1)], 2026, opcoes);
    expect(vistos[0]).toEqual([
      "rreo",
      {
        an_exercicio: "2025",
        nr_periodo: "6",
        co_tipo_demonstrativo: "RREO",
        no_anexo: "RREO-Anexo 02",
        id_ente: "1",
      },
    ]);
    expect(vistos[1]?.[1]).toMatchObject({
      no_anexo: "RGF-Anexo 01",
      co_poder: "E",
      co_esfera: "M",
      in_periodicidade: "Q",
      nr_periodo: "3",
    });
  });

  it("não deixa quebra de linha da API virar comando de workflow", async () => {
    const logs: string[] = [];
    const consulta: Consulta = async (rota) => (rota === "rreo" ? rreo : []);
    const maligno: Ente = { ...ente(9), ente: "X\n::add-mask::y" };
    await coletarGastos(consulta, [maligno, ente(8)], 2026, {
      pausaMs: 0,
      log: (m) => logs.push(m),
    }).catch(() => {});
    expect(logs.every((l) => !l.includes("\n"))).toBe(true);
  });
});
