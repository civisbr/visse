import { describe, expect, it } from "vitest";
import { esperaRecuo } from "../../scripts/dados/pncp";

const resp = (status: number, retryAfter?: string) =>
  ({
    status,
    headers: new Headers(retryAfter ? { "retry-after": retryAfter } : {}),
  }) as Pick<Response, "status" | "headers">;

describe("esperaRecuo", () => {
  it("cresce em 429 e respeita o teto", () => {
    expect(esperaRecuo(resp(429), 1)).toBe(15_000);
    expect(esperaRecuo(resp(429), 3)).toBe(45_000);
    expect(esperaRecuo(resp(503), 9)).toBe(90_000);
  });
  it("usa Retry-After quando maior que o recuo, limitado a 120 s", () => {
    expect(esperaRecuo(resp(429, "60"), 1)).toBe(60_000);
    expect(esperaRecuo(resp(429, "9999"), 1)).toBe(120_000);
  });
  it("Retry-After curto não encurta o recuo", () => {
    expect(esperaRecuo(resp(429, "1"), 2)).toBe(30_000);
  });
  it("data HTTP ou valor inválido cai no recuo padrão", () => {
    expect(esperaRecuo(resp(429, "Wed, 21 Oct 2026 07:28:00 GMT"), 1)).toBe(15_000);
  });
  it("erro de rede e outros status usam recuo linear curto", () => {
    expect(esperaRecuo(null, 2)).toBe(4000);
    expect(esperaRecuo(resp(500, "60"), 3)).toBe(6000);
  });
});
