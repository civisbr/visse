import { useId, useState, type ReactNode } from "react";
import { agruparPorUF } from "@/lib/estados";

const chip = "rounded-full border px-3 py-1 text-sm font-semibold transition-colors";

// Seletor de estado com contagem; em "Todos" a lista vem agrupada por estado, com título em cada grupo.
export function ListaPorEstado<T>({
  itens,
  uf,
  chave,
  renderItem,
  classeLista = "mt-3 grid gap-4 md:grid-cols-2",
}: {
  itens: T[];
  uf: (t: T) => string;
  chave: (t: T) => string;
  renderItem: (t: T) => ReactNode;
  classeLista?: string;
}) {
  const prefixo = useId();
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const grupos = agruparPorUF(itens, uf);
  const atual = grupos.find((g) => g.uf === escolhido) ?? null;
  const visiveis = atual ? [atual] : grupos;
  return (
    <div className="mt-4">
      {grupos.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          <button
            type="button"
            aria-pressed={atual === null}
            onClick={() => setEscolhido(null)}
            className={`${chip} ${atual === null ? "border-ink bg-ink text-areia" : "border-border bg-card hover:bg-secondary"}`}
          >
            Todos ({itens.length.toLocaleString("pt-BR")})
          </button>
          {grupos.map((g) => (
            <button
              key={g.uf}
              type="button"
              aria-pressed={atual?.uf === g.uf}
              onClick={() => setEscolhido(g.uf)}
              className={`${chip} ${atual?.uf === g.uf ? "border-ink bg-ink text-areia" : "border-border bg-card hover:bg-secondary"}`}
            >
              {g.nome} ({g.itens.length.toLocaleString("pt-BR")})
            </button>
          ))}
        </div>
      )}
      {visiveis.map((g) => (
        <section key={g.uf} className="mt-6" aria-labelledby={`${prefixo}-${g.uf}`}>
          <h4
            id={`${prefixo}-${g.uf}`}
            className="border-b border-ink pb-1 text-xl font-black text-ink"
          >
            {g.nome}{" "}
            <span className="text-base font-semibold text-muted-foreground">
              ({g.itens.length.toLocaleString("pt-BR")})
            </span>
          </h4>
          <ul className={classeLista}>
            {g.itens.map((i) => (
              <li key={chave(i)}>{renderItem(i)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
