import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CSP, HEADERS_SEGURANCA, comHeadersDeSeguranca } from "@/lib/headers-seguranca";

describe("headers de segurança", () => {
  it("adiciona os headers e preserva status e corpo", async () => {
    const r = comHeadersDeSeguranca(new Response("oi", { status: 200 }));
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await r.text()).toBe("oi");
  });
  it("define HSTS, COOP e CSP parcial (objetos, base, formulários e frame-ancestors)", () => {
    const r = comHeadersDeSeguranca(new Response("x"));
    expect(r.headers.get("strict-transport-security")).toBe("max-age=31536000");
    expect(r.headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
    expect(r.headers.get("content-security-policy")).toBe(CSP);
  });
  it("mantém 204 e 304 sem corpo", () => {
    expect(comHeadersDeSeguranca(new Response(null, { status: 204 })).status).toBe(204);
    expect(comHeadersDeSeguranca(new Response(null, { status: 304 })).status).toBe(304);
  });
  it("preserva Location e múltiplos Set-Cookie", () => {
    const base = new Response(null, { status: 302, headers: { location: "/x" } });
    base.headers.append("set-cookie", "a=1");
    base.headers.append("set-cookie", "b=2");
    const r = comHeadersDeSeguranca(base);
    expect(r.headers.get("location")).toBe("/x");
    expect(r.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
  });
  it("não sobrescreve header já definido", () => {
    const r = comHeadersDeSeguranca(
      new Response("x", { headers: { "referrer-policy": "no-referrer" } }),
    );
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("public/_headers declara os mesmos valores que o worker", () => {
    const linhas = readFileSync("public/_headers", "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes(":"));
    const arquivo = Object.fromEntries(
      linhas.map((l) => [
        l.slice(0, l.indexOf(":")).toLowerCase(),
        l.slice(l.indexOf(":") + 1).trim(),
      ]),
    );
    expect(arquivo).toEqual(HEADERS_SEGURANCA);
  });
});
