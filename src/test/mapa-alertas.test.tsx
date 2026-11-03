import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapaAlertas } from "@/components/MapaAlertas";
import type { MunicipioGastos } from "@/lib/gastos-data";

vi.mock("@/lib/mapa-data", async (original) => ({
  ...(await original<typeof import("@/lib/mapa-data")>()),
  carregarMapa: async () => ({
    fonte: "IBGE",
    largura: 900,
    altura: 1100,
    afim: { k: 1, escala: 10, dx: 0, dy: 0 },
    estados: [{ uf: "BA", d: "M0 0L10 0L10 10Z" }],
    municipios: { "2927408": [-12.87, -38.51], "2611606": [-8.05, -34.88] },
  }),
}));

const cidade = (
  codIbge: number,
  nome: string,
  uf: string,
  percentual: number,
): MunicipioGastos => ({
  codIbge,
  nome,
  uf,
  populacao: 1000,
  despesaTotal: 1000,
  saude: 100,
  educacao: 100,
  pessoal: { percentual, limite: 54, alerta: 48.6, prudencial: 51.3, rcl: 1000 },
});
const lista = [cidade(2927408, "Salvador", "BA", 60), cidade(2611606, "Recife", "PE", 55)];

function montar(selecionado: number | null, onSelecionar = vi.fn(), comBloco = true) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <MapaAlertas
        exercicio={2025}
        municipios={lista}
        selecionado={selecionado}
        onSelecionar={onSelecionar}
      />
      {comBloco && (
        <div id="contas-cidade" tabIndex={-1}>
          contas
        </div>
      )}
    </QueryClientProvider>,
  );
  return onSelecionar;
}

describe("MapaAlertas: descer até as contas", () => {
  const rolar = vi.fn();
  const original = Element.prototype.scrollIntoView;
  beforeEach(() => {
    Element.prototype.scrollIntoView = rolar;
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => {
      f(0);
      return 0;
    });
  });
  afterEach(() => {
    Element.prototype.scrollIntoView = original;
    rolar.mockClear();
    vi.unstubAllGlobals();
  });

  it("clicar num pin seleciona a cidade e rola até o bloco", async () => {
    const onSelecionar = montar(null);
    const pin = await screen.findByRole("button", { name: /Salvador \(BA\)/ });
    fireEvent.click(pin);
    expect(onSelecionar).toHaveBeenCalledWith(2927408);
    expect(rolar).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(document.getElementById("contas-cidade"));
  });

  it("Enter no pin também seleciona e rola", async () => {
    const onSelecionar = montar(null);
    const pin = await screen.findByRole("button", { name: /Recife \(PE\)/ });
    fireEvent.keyDown(pin, { key: "Enter" });
    expect(onSelecionar).toHaveBeenCalledWith(2611606);
    expect(rolar).toHaveBeenCalledTimes(1);
  });

  it("o botão do cartão rola até o bloco sem mudar a seleção", async () => {
    const onSelecionar = montar(2927408);
    const link = await screen.findByRole("link", { name: /Ver as contas de Salvador/ });
    fireEvent.click(link);
    expect(rolar).toHaveBeenCalledTimes(1);
    expect(onSelecionar).not.toHaveBeenCalled();
  });

  it("sem o bloco na página, o botão cai no comportamento normal da âncora", async () => {
    montar(2927408, vi.fn(), false);
    const link = await screen.findByRole("link", { name: /Ver as contas de Salvador/ });
    expect(fireEvent.click(link)).toBe(true);
    expect(rolar).not.toHaveBeenCalled();
  });

  it("o pin selecionado é a parada do Tab", async () => {
    montar(2611606);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Recife \(PE\)/ })).toHaveAttribute(
        "tabindex",
        "0",
      ),
    );
    expect(screen.getByRole("button", { name: /Salvador \(BA\)/ })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
