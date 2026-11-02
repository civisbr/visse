import { describe, expect, it } from "vitest";
import { comHeadersDeSeguranca } from "@/lib/headers-seguranca";

describe("headers de segurança", () => {
  it("adiciona os headers e preserva status e corpo", async () => {
    const r = comHeadersDeSeguranca(new Response("oi", { status: 200 }));
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await r.text()).toBe("oi");
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
});
