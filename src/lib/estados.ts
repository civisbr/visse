import { ESTADOS } from "./ouvidorias";

export const NOME_UF: Record<string, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.uf, e.nome]),
);

export type Grupo<T> = { uf: string; nome: string; itens: T[] };

// Ordem alfabética pelo nome do estado; UF desconhecida vai para o fim, sem sumir da lista.
export function agruparPorUF<T>(itens: T[], uf: (t: T) => string): Grupo<T>[] {
  const mapa = new Map<string, T[]>();
  for (const i of itens) {
    const k = uf(i);
    const lista = mapa.get(k);
    if (lista) lista.push(i);
    else mapa.set(k, [i]);
  }
  const ordem = new Intl.Collator("pt-BR");
  return [...mapa.entries()]
    .map(([k, v]) => ({ uf: k, nome: NOME_UF[k] ?? k, itens: v }))
    .sort((a, b) => {
      const sa = a.nome === a.uf ? 1 : 0;
      const sb = b.nome === b.uf ? 1 : 0;
      return sa - sb || ordem.compare(a.nome, b.nome);
    });
}
