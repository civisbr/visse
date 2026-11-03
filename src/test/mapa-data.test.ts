import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distanciaKm, lerMapa, projetar } from "@/lib/mapa-data";
import { nivelPessoal } from "@/lib/gastos-data";

const base = {
  fonte: "IBGE",
  largura: 900,
  altura: 1100,
  afim: { k: 0.98, escala: 60, dx: 3000, dy: -50 },
  estados: [{ uf: "BA", d: "M1.0 2.0L3.5 4.5Z" }],
  municipios: { "2927408": [-12.8745, -38.5144] },
};

describe("lerMapa", () => {
  it("aceita o formato gerado", () => expect(lerMapa(base)?.estados).toHaveLength(1));
  it("rejeita caminho com texto fora de comandos numéricos", () => {
    expect(lerMapa({ ...base, estados: [{ uf: "BA", d: "M0 0<script>" }] })).toBeNull();
  });
  it("rejeita UF, código e coordenada inválidos", () => {
    expect(lerMapa({ ...base, estados: [{ uf: "SP", d: "M0 0Z" }] })).toBeNull();
    expect(lerMapa({ ...base, municipios: { abc: [0, 0] } })).toBeNull();
    expect(lerMapa({ ...base, municipios: { "2927408": [-120, 0] } })).toBeNull();
    expect(lerMapa({ ...base, afim: { ...base.afim, escala: 0 } })).toBeNull();
    expect(lerMapa("x")).toBeNull();
  });
});

describe("geometria", () => {
  it("projeta no mesmo plano do gerador", () => {
    const p = projetar(base.afim, -12.8745, -38.5144);
    expect(p.x).toBeCloseTo(-38.5144 * 0.98 * 60 + 3000, 5);
    expect(p.y).toBeCloseTo(12.8745 * 60 - 50, 5);
  });
  it("calcula distância em km", () => {
    expect(distanciaKm(-12.9777, -38.5016, -8.0476, -34.877)).toBeGreaterThan(660);
    expect(distanciaKm(-12.9777, -38.5016, -8.0476, -34.877)).toBeLessThan(700);
    expect(distanciaKm(1, 1, 1, 1)).toBe(0);
  });
});

describe("nivelPessoal", () => {
  const p = (percentual: number) => ({
    percentual,
    limite: 54,
    prudencial: 51.3,
    alerta: 48.6,
    rcl: null,
  });
  it("classifica pelos limites da LRF", () => {
    expect(nivelPessoal(p(54.04))).toBe("prudencial");
    expect(nivelPessoal(p(54.2))).toBe("limite");
    expect(nivelPessoal(p(52))).toBe("prudencial");
    expect(nivelPessoal(p(49))).toBe("alerta");
    expect(nivelPessoal(p(40))).toBe("ok");
    expect(nivelPessoal({ ...p(60), prudencial: null, alerta: null })).toBe("limite");
    expect(nivelPessoal({ ...p(52), prudencial: null, alerta: null })).toBe("ok");
  });
});

describe("arquivo versionado da malha", () => {
  it("passa no parser do front e cobre os 9 estados e todos os municípios", () => {
    const m = lerMapa(JSON.parse(readFileSync("public/data/nordeste-mapa.json", "utf8")));
    expect(m?.estados).toHaveLength(9);
    expect(Object.keys(m?.municipios ?? {}).length).toBe(1794);
  });
});
