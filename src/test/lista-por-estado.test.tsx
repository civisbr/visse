import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListaPorEstado } from "@/components/ListaPorEstado";

type Item = { id: string; uf: string };
const itens: Item[] = [
  { id: "a", uf: "PE" },
  { id: "b", uf: "BA" },
  { id: "c", uf: "PE" },
];
const montar = (lista: Item[]) => (
  <ListaPorEstado
    itens={lista}
    uf={(i) => i.uf}
    chave={(i) => i.id}
    renderItem={(i) => <span>item-{i.id}</span>}
  />
);

describe("ListaPorEstado", () => {
  it("agrupa por estado e mostra a contagem em cada chip", () => {
    render(montar(itens));
    expect(screen.getByRole("button", { name: "Todos (3)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Bahia (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pernambuco (2)" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "Bahia (1)",
      "Pernambuco (2)",
    ]);
  });
  it("filtra pelo estado escolhido e volta com Todos", () => {
    render(montar(itens));
    fireEvent.click(screen.getByRole("button", { name: "Pernambuco (2)" }));
    expect(screen.getByRole("button", { name: "Pernambuco (2)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("item-b")).not.toBeInTheDocument();
    expect(screen.getByText("item-a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos (3)" }));
    expect(screen.getByText("item-b")).toBeInTheDocument();
  });
  it("sem chips quando só há um estado, e cai em Todos se o estado escolhido some", () => {
    const { rerender } = render(montar(itens));
    fireEvent.click(screen.getByRole("button", { name: "Bahia (1)" }));
    rerender(montar([{ id: "a", uf: "PE" }]));
    expect(screen.queryByRole("group", { name: "Filtrar por estado" })).not.toBeInTheDocument();
    const lista = screen.getByRole("list");
    expect(within(lista).getByText("item-a")).toBeInTheDocument();
  });
});
