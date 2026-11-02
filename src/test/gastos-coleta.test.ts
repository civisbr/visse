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

  it("tolera falhas isoladas quando o ano tem cobertura, e aborta quando faltam dados", async () => {
    const seis = [1, 2, 3, 4, 5, 6].map(ente);
    const comFalhas =
      (n: number): Consulta =>
      async (rota, q) => {
        if (rota === "rreo" && Number(q["id_ente"]) > 6 - n) throw new Error("HTTP 500");
        return rota === "rreo" ? rreo : rgf;
      };
    const um = { ...opcoes, concorrencia: 1 };
    const ok = await coletarGastos(comFalhas(1), seis, 2026, um);
    expect(ok.falhas).toHaveLength(1);
    await expect(coletarGastos(comFalhas(3), seis, 2026, um)).rejects.toThrow(/Falhas de rede/);
  });

  it("com concorrência maior que 1 devolve tudo ordenado por código", async () => {
    const muitos = Array.from({ length: 25 }, (_, i) => ente(100 - i));
    const consulta: Consulta = async (rota) => {
      await new Promise((ok) => setTimeout(ok, Math.random() * 3));
      return rota === "rreo" ? rreo : rgf;
    };
    const r = await coletarGastos(consulta, muitos, 2026, { ...opcoes, concorrencia: 4 });
    const cods = r.municipios.map((m) => m.codIbge);
    expect(cods).toEqual([...cods].sort((a, b) => a - b));
    expect(cods).toHaveLength(25);
  });

  it("para cedo quando as falhas são seguidas, sem percorrer todo o universo", async () => {
    const muitos = Array.from({ length: 200 }, (_, i) => ente(i + 1));
    let chamadas = 0;
    const consulta: Consulta = async () => {
      chamadas++;
      throw new Error("HTTP 503");
    };
    await expect(coletarGastos(consulta, muitos, 2026, opcoes)).rejects.toThrow(/Falhas de rede/);
    expect(chamadas).toBeLessThan(40);
  });

  it("não recua de ano quando a falha de rede interrompe o primeiro ano", async () => {
    const vistos = new Set<string>();
    const consulta: Consulta = async (_rota, q) => {
      vistos.add(q["an_exercicio"] ?? "");
      throw new Error("HTTP 500");
    };
    await expect(coletarGastos(consulta, piloto, 2026, opcoes)).rejects.toThrow(
      /Falhas de rede em 2025/,
    );
    expect([...vistos]).toEqual(["2025"]);
  });

  it("usa o ano anterior apenas quando o mais recente tem menos de 70% de envio", async () => {
    const dez = Array.from({ length: 10 }, (_, i) => ente(i + 1));
    const comEnvio =
      (n: number): Consulta =>
      async (rota, q) =>
        rota === "rreo" ? (Number(q["id_ente"]) <= n ? rreo : []) : rgf;
    expect((await coletarGastos(comEnvio(7), dez, 2026, opcoes)).exercicio).toBe(2025);
    const abaixo: Consulta = async (rota, q) =>
      rota === "rreo"
        ? q["an_exercicio"] === "2024"
          ? rreo
          : Number(q["id_ente"]) <= 6
            ? rreo
            : []
        : rgf;
    expect((await coletarGastos(abaixo, dez, 2026, opcoes)).exercicio).toBe(2024);
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

  it("não recua de ano quando a parada antecipada vem só de falhas do RGF", async () => {
    const muitos = Array.from({ length: 60 }, (_, i) => ente(i + 1));
    const anos = new Set<string>();
    const consulta: Consulta = async (rota, q) => {
      anos.add(q["an_exercicio"] ?? "");
      if (rota === "rgf") throw new Error("HTTP 429");
      return rreo;
    };
    await expect(coletarGastos(consulta, muitos, 2026, opcoes)).rejects.toThrow(
      /Falhas de rede em 2025/,
    );
    expect([...anos]).toEqual(["2025"]);
  });
});
