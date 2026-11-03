import { describe, expect, it } from "vitest";
import { avaliarSanidade } from "../../scripts/dados/sanidade-regras";

const lista = (campo: string, n: number, extra: object = {}) => ({
  [campo]: Array.from({ length: n }, (_, i) => ({ i })),
  ...extra,
});

describe("avaliarSanidade", () => {
  it("aceita primeira publicação e variação pequena", () => {
    expect(avaliarSanidade("gastos", null, lista("municipios", 1400, { exercicio: 2025 }))).toEqual(
      [],
    );
    expect(
      avaliarSanidade(
        "gastos",
        lista("municipios", 1400, { exercicio: 2025 }),
        lista("municipios", 1380, { exercicio: 2025 }),
      ),
    ).toEqual([]);
  });

  it("barra queda de gastos acima de 10%", () => {
    const m = avaliarSanidade(
      "gastos",
      lista("municipios", 1400, { exercicio: 2025 }),
      lista("municipios", 1200, { exercicio: 2025 }),
    );
    expect(m).toHaveLength(1);
  });

  it("barra recuo de exercício e aceita ano novo", () => {
    expect(
      avaliarSanidade(
        "gastos",
        lista("municipios", 1400, { exercicio: 2025 }),
        lista("municipios", 1400, { exercicio: 2024 }),
      ),
    ).toHaveLength(1);
    expect(
      avaliarSanidade(
        "gastos-corrente",
        lista("municipios", 1400, { exercicio: 2025 }),
        lista("municipios", 300, { exercicio: 2026 }),
      ),
    ).toEqual([]);
  });

  it("barra lista vazia ou arquivo sem a lista", () => {
    expect(avaliarSanidade("obras", lista("obras", 50), lista("obras", 0))).toHaveLength(1);
    expect(avaliarSanidade("obras", lista("obras", 50), {})).toHaveLength(1);
  });

  it("alertas: tolera oscilação pequena e barra salto grande", () => {
    expect(avaliarSanidade("red-flags", lista("alertas", 3), lista("alertas", 9))).toEqual([]);
    expect(avaliarSanidade("red-flags", lista("alertas", 40), lista("alertas", 80))).toHaveLength(
      1,
    );
    expect(avaliarSanidade("red-flags", lista("alertas", 40), lista("alertas", 10))).toHaveLength(
      1,
    );
  });

  it("aceita a remoção do acompanhamento que já fechou, mas não a dos demais", () => {
    expect(avaliarSanidade("gastos-corrente", lista("municipios", 5), null)).toEqual([]);
    expect(avaliarSanidade("gastos", lista("municipios", 5), null)).toHaveLength(1);
  });

  it("barra obras com mais UFs em falha e exercício inválido", () => {
    expect(
      avaliarSanidade(
        "obras",
        lista("obras", 50, { ufsComFalha: [] }),
        lista("obras", 48, { ufsComFalha: ["BA"] }),
      ),
    ).toHaveLength(1);
    expect(
      avaliarSanidade(
        "gastos",
        lista("municipios", 10, { exercicio: 2025 }),
        lista("municipios", 10, {}),
      ),
    ).toHaveLength(1);
  });

  it("ano novo: barra gastos fechado pequeno e exercício no futuro", () => {
    const ant = lista("municipios", 1400, { exercicio: 2025 });
    expect(
      avaliarSanidade("gastos", ant, lista("municipios", 3, { exercicio: 2026 }), 2026),
    ).toHaveLength(1);
    expect(
      avaliarSanidade("gastos", ant, lista("municipios", 1300, { exercicio: 2026 }), 2026),
    ).toEqual([]);
    expect(
      avaliarSanidade("gastos", ant, lista("municipios", 1400, { exercicio: 2099 }), 2026),
    ).toHaveLength(1);
  });
});
