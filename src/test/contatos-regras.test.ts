import { describe, expect, it } from "vitest";
import { classificarErro, classificarStatus, diasDesde } from "../../scripts/dados/contatos-regras";

describe("classificarStatus", () => {
  it("aceita sucesso e redirecionamento", () => {
    expect(classificarStatus(200)).toBe("ok");
    expect(classificarStatus(301)).toBe("ok");
  });
  it("reprova página inexistente e erro de servidor", () => {
    expect(classificarStatus(404)).toBe("quebrado");
    expect(classificarStatus(410)).toBe("quebrado");
    expect(classificarStatus(503)).toBe("quebrado");
  });
  it("trata bloqueio a robô como inconclusivo", () => {
    expect(classificarStatus(403)).toBe("inconclusivo");
    expect(classificarStatus(429)).toBe("inconclusivo");
  });
});

describe("classificarErro", () => {
  it("só DNS inexistente reprova", () => {
    expect(classificarErro({ cause: { code: "ENOTFOUND" } })).toBe("quebrado");
    expect(classificarErro({ cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } })).toBe(
      "inconclusivo",
    );
    expect(classificarErro({ code: "ENOTFOUND" })).toBe("quebrado");
    expect(classificarErro({ code: "CERT_HAS_EXPIRED" })).toBe("inconclusivo");
    expect(classificarErro(new Error("x"))).toBe("inconclusivo");
  });
});

describe("diasDesde", () => {
  it("conta dias e trata data inválida como vencida", () => {
    expect(diasDesde("2026-11-03", new Date("2026-11-13T12:00:00Z"))).toBe(10);
    expect(diasDesde("lixo", new Date())).toBe(Number.POSITIVE_INFINITY);
  });
});
