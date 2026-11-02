import { describe, expect, it } from "vitest";
import { criarCliente } from "../../scripts/dados/siconfi-http";

const resposta = (status: number, corpo: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers });

// Relógio virtual para cenários sequenciais: esperar() avança o tempo na hora.
function virtual(respostas: Array<Response | Error>) {
  let t = 1_000_000;
  const esperas: number[] = [];
  const chamadas: number[] = [];
  const fetchFn = (async () => {
    chamadas.push(t);
    const r = respostas.shift();
    if (!r) throw new Error("sem resposta");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  const esperar = async (ms: number) => {
    esperas.push(ms);
    t += ms;
  };
  return { fetchFn, esperar, agora: () => t, esperas, chamadas };
}

describe("cliente do SICONFI (cenários sequenciais)", () => {
  it("respeita o Retry-After num 429 e tenta de novo", async () => {
    const e = virtual([resposta(429, {}, { "retry-after": "7" }), resposta(200, { ok: true })]);
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0 });
    expect(await get("u")).toEqual({ ok: true });
    expect(e.chamadas[1]! - e.chamadas[0]!).toBeGreaterThanOrEqual(7000);
    expect(get.estatisticas.http429).toBe(1);
  });

  it("aceita Retry-After em formato de data HTTP", async () => {
    const e = virtual([
      resposta(429, {}, { "retry-after": new Date(1_000_000 + 5000).toUTCString() }),
      resposta(200, { ok: true }),
    ]);
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0 });
    await get("u");
    expect(e.chamadas[1]! - e.chamadas[0]!).toBeGreaterThanOrEqual(4000);
  });

  it("sem Retry-After a espera padrão cresce com a tentativa", async () => {
    const e = virtual([resposta(429), resposta(429), resposta(200, { ok: 1 })]);
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0, esperaPadrao429Ms: 1000 });
    await get("u");
    expect(e.chamadas[1]! - e.chamadas[0]!).toBeGreaterThanOrEqual(1000);
    expect(e.chamadas[2]! - e.chamadas[1]!).toBeGreaterThanOrEqual(2000);
  });

  it("esgota as 6 tentativas em 429 e falha", async () => {
    const e = virtual(Array.from({ length: 10 }, () => resposta(429, {}, { "retry-after": "1" })));
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0 });
    await expect(get("u")).rejects.toThrow(/HTTP 429/);
    expect(e.chamadas).toHaveLength(6);
  });

  it("Retry-After acima do teto falha logo, sem gastar tentativas", async () => {
    const e = virtual([resposta(429, {}, { "retry-after": "999" }), resposta(200)]);
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0 });
    await expect(get("u")).rejects.toThrow(/Retry-After acima/);
    expect(e.chamadas).toHaveLength(1);
  });

  it("aborta quando o tempo bloqueado passa do orçamento", async () => {
    const e = virtual(Array.from({ length: 10 }, () => resposta(429, {}, { "retry-after": "60" })));
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0, orcamentoBloqueioMs: 100_000 });
    await expect(get("u")).rejects.toThrow(/orçamento/);
  });

  it("não repete erro 4xx comum", async () => {
    const e = virtual([resposta(404), resposta(200)]);
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0 });
    await expect(get("u")).rejects.toThrow(/HTTP 404/);
    expect(e.chamadas).toHaveLength(1);
  });

  it("5xx e erro de rede usam só as tentativas normais, mesmo depois de um 429", async () => {
    const e = virtual([
      resposta(429, {}, { "retry-after": "1" }),
      resposta(500),
      resposta(500),
      resposta(500),
      resposta(200),
    ]);
    const get = criarCliente({ ...e, intervaloMs: 0, recuoMs: 0, tentativas: 3 });
    await expect(get("u")).rejects.toThrow(/HTTP 500/);
    expect(e.chamadas).toHaveLength(3);
    const r = virtual([
      new Error("socket"),
      new Error("socket"),
      new Error("socket"),
      resposta(200),
    ]);
    await expect(criarCliente({ ...r, intervaloMs: 0, recuoMs: 0 })("u")).rejects.toThrow(/socket/);
  });

  it("dobra o intervalo após 429 até o teto", async () => {
    const e = virtual(Array.from({ length: 6 }, () => resposta(429, {}, { "retry-after": "1" })));
    const get = criarCliente({ ...e, intervaloMs: 300, intervaloMaxMs: 1000, recuoMs: 0 });
    await get("u").catch(() => {});
    expect(get.estatisticas.intervaloFinalMs).toBe(1000);
  });
});

describe("cliente do SICONFI (concorrência, tempo real)", () => {
  it("espaça as chamadas pelo intervalo mínimo", async () => {
    const chamadas: number[] = [];
    const fetchFn = (async () => {
      chamadas.push(Date.now());
      return resposta(200, {});
    }) as unknown as typeof fetch;
    const get = criarCliente({ fetchFn, intervaloMs: 60 });
    await Promise.all([get("u1"), get("u2"), get("u3")]);
    expect(chamadas[1]! - chamadas[0]!).toBeGreaterThanOrEqual(55);
    expect(chamadas[2]! - chamadas[1]!).toBeGreaterThanOrEqual(55);
  });

  it("o 429 segura também quem já tinha reservado a vez", async () => {
    const chamadas: Array<[string, number]> = [];
    const respostas = [resposta(429), resposta(200), resposta(200), resposta(200)];
    const fetchFn = (async (url: string) => {
      chamadas.push([url, Date.now()]);
      return respostas.shift()!;
    }) as unknown as typeof fetch;
    const get = criarCliente({
      fetchFn,
      intervaloMs: 20,
      esperaPadrao429Ms: 300,
      recuoMs: 10,
    });
    await Promise.all([get("a"), get("b"), get("c")]);
    const inicio = chamadas[0]![1];
    const deB = chamadas.find(([u]) => u === "b")![1];
    const deC = chamadas.find(([u]) => u === "c")![1];
    expect(deB - inicio).toBeGreaterThanOrEqual(250);
    expect(deC - inicio).toBeGreaterThanOrEqual(250);
  });
});
