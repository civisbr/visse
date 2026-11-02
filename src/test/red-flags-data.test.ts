import { afterEach, describe, expect, it, vi } from "vitest";
import { carregarRedFlags, diasDesde, lerDados, linkSeguro } from "@/lib/red-flags-data";

const contrato = {
  id: "1",
  orgao: "o",
  municipio: "m",
  uf: "BA",
  objeto: "x",
  fornecedor: "f",
  cnpj: "12345678000199",
  valorInicial: 1,
  valorAcumulado: 1,
  assinatura: "2026-01-01",
  link: "https://pncp.gov.br/app/contratos/1/2026/1",
};
const ok = {
  aviso: "a",
  fonte: "f",
  geradoEm: "2026-11-01T00:00:00Z",
  janelaDias: 14,
  analisados: 3,
  alertas: [{ regra: "aditivo-alto", detalhe: "d", prioridade: 50, contrato }],
};

describe("dados de red flags", () => {
  it("aceita o formato do pipeline", () => expect(lerDados(ok)?.alertas).toHaveLength(1));
  it("descarta alerta malformado e rejeita arquivo inválido", () => {
    expect(lerDados({ ...ok, alertas: [{ regra: "x" }, ok.alertas[0]] })?.alertas).toHaveLength(1);
    expect(lerDados({ alertas: [] })).toBeNull();
    expect(lerDados("<html>")).toBeNull();
  });
  it("só aceita links do PNCP", () => {
    expect(linkSeguro("https://pncp.gov.br/app/x")).not.toBeNull();
    expect(linkSeguro("javascript:alert(1)")).toBeNull();
    expect(linkSeguro("https://pncp.gov.br.evil.com/")).toBeNull();
  });
  it("calcula idade dos dados", () => {
    expect(diasDesde("2026-11-01T00:00:00Z", Date.parse("2026-11-11T00:00:00Z"))).toBe(10);
    expect(diasDesde("lixo")).toBe(Infinity);
  });
});

describe("carregarRedFlags", () => {
  afterEach(() => vi.unstubAllGlobals());
  const resp = (corpo: string, init: ResponseInit) =>
    vi.fn().mockResolvedValue(new Response(corpo, init));

  it("404 e HTML com 200 viram null", async () => {
    vi.stubGlobal("fetch", resp("", { status: 404 }));
    expect(await carregarRedFlags()).toBeNull();
    vi.stubGlobal(
      "fetch",
      resp("<html>", { status: 200, headers: { "content-type": "text/html" } }),
    );
    expect(await carregarRedFlags()).toBeNull();
  });
  it("erro de servidor e JSON inválido lançam", async () => {
    vi.stubGlobal("fetch", resp("", { status: 500 }));
    await expect(carregarRedFlags()).rejects.toThrow();
    vi.stubGlobal(
      "fetch",
      resp("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await expect(carregarRedFlags()).rejects.toThrow();
  });
  it("lê o formato do pipeline", async () => {
    vi.stubGlobal(
      "fetch",
      resp(JSON.stringify(ok), { status: 200, headers: { "content-type": "application/json" } }),
    );
    expect((await carregarRedFlags())?.alertas).toHaveLength(1);
  });
  it("rejeita geradoEm inválido", () => {
    expect(lerDados({ ...ok, geradoEm: "lixo" })).toBeNull();
  });
});
