import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type OpcaoCidade = { codIbge: number; nome: string; uf: string };

const MAXIMO_VISIVEL = 40;

export const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

type Indexada<T> = { c: T; nome: string; alvo: string };

export const indexarCidades = <T extends OpcaoCidade>(lista: T[]): Indexada<T>[] =>
  lista.map((c) => {
    const nome = semAcento(c.nome);
    return { c, nome, alvo: `${nome} ${c.uf.toLowerCase()}` };
  });

// Aceita "cidade", "cidade ce" ou "cidade - ce". A chave normalizada é calculada uma vez, não a cada tecla.
export function filtrarIndexadas<T extends OpcaoCidade>(
  indice: Indexada<T>[],
  busca: string,
): { itens: T[]; total: number } {
  const termos = semAcento(busca)
    .split(/[\s\-–/()]+/)
    .filter(Boolean);
  if (termos.length === 0)
    return { itens: indice.slice(0, MAXIMO_VISIVEL).map((i) => i.c), total: indice.length };
  const completa = termos.join(" ");
  const ordem = (i: Indexada<T>) =>
    i.nome.startsWith(completa)
      ? 0
      : i.nome.split(" ").some((p) => p.startsWith(termos[0] ?? ""))
        ? 1
        : 2;
  const achadas = indice
    .filter((i) => termos.every((t) => i.alvo.includes(t)))
    .map((i) => ({ i, o: ordem(i) }))
    .sort((a, b) => a.o - b.o);
  return { itens: achadas.slice(0, MAXIMO_VISIVEL).map((x) => x.i.c), total: achadas.length };
}

export const filtrarCidades = <T extends OpcaoCidade>(lista: T[], busca: string): T[] =>
  filtrarIndexadas(indexarCidades(lista), busca).itens;

export function CidadeCombobox<T extends OpcaoCidade>({
  id,
  cidades,
  selecionada,
  onSelecionar,
}: {
  id: string;
  cidades: T[];
  selecionada: T;
  onSelecionar: (codIbge: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const indice = useMemo(() => indexarCidades(cidades), [cidades]);
  const { itens, total } = useMemo(() => {
    const r = filtrarIndexadas(indice, busca);
    // Sem busca, a cidade escolhida vem primeiro para o check aparecer mesmo fora das 40 primeiras.
    if (busca.trim() === "" && !r.itens.some((c) => c.codIbge === selecionada.codIbge))
      return { ...r, itens: [selecionada, ...r.itens.slice(0, MAXIMO_VISIVEL - 1)] };
    return r;
  }, [indice, busca, selecionada]);
  const aviso =
    total > itens.length
      ? `Mostrando ${itens.length} de ${total.toLocaleString("pt-BR")} cidades. Continue digitando para filtrar.`
      : undefined;

  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) setBusca("");
      }}
    >
      <PopoverTrigger id={id} className="field mt-1 flex items-center justify-between text-left">
        <span className="truncate">
          {selecionada.nome} ({selecionada.uf})
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false} label="Buscar cidade">
          <CommandInput
            value={busca}
            onValueChange={setBusca}
            placeholder="Digite o nome da cidade…"
            className="text-base sm:text-sm"
          />
          <span role="status" className="sr-only">
            {total === 0 ? "Nenhuma cidade encontrada" : `${total} cidades`}
          </span>
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada. Confira a grafia.</CommandEmpty>
            <CommandGroup heading={aviso}>
              {itens.map((c) => (
                <CommandItem
                  key={c.codIbge}
                  value={String(c.codIbge)}
                  onSelect={() => {
                    onSelecionar(c.codIbge);
                    setAberto(false);
                    setBusca("");
                  }}
                >
                  <Check
                    className={`mr-2 size-4 ${c.codIbge === selecionada.codIbge ? "opacity-100" : "opacity-0"}`}
                    aria-hidden="true"
                  />
                  {c.nome} ({c.uf})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
