import { naturezaSemAlertaRecente } from "./regras";

export type DadosCnpj = {
  abertura: string | null;
  pessoaFisica: boolean;
  consorcio: boolean;
  // false quando a BrasilAPI não respondeu de forma utilizável; os demais campos são valores neutros.
  verificado: boolean;
};

const cache = new Map<string, DadosCnpj>();
export const falhasCnpj: Record<string, number> = {};

const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export async function consultaCnpj(cnpj: string): Promise<DadosCnpj> {
  if (cache.has(cnpj)) return cache.get(cnpj)!;
  let dados: DadosCnpj = {
    abertura: null,
    pessoaFisica: false,
    consorcio: false,
    verificado: false,
  };
  let status = "erro-rede";
  for (let i = 1; i <= 3; i++) {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    status = r ? String(r.status) : "erro-rede";
    if (r?.ok) {
      const j = (await r.json()) as {
        data_inicio_atividade?: unknown;
        identificador_matriz_filial?: unknown;
        codigo_natureza_juridica?: unknown;
        opcao_pelo_mei?: unknown;
      };
      const v = j.data_inicio_atividade;
      // Filial traz a data da própria abertura, não a da empresa; usar essa data geraria falso positivo.
      const abertura =
        j.identificador_matriz_filial === 1 &&
        typeof v === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(v)
          ? v
          : null;
      // Empresário individual (2135) e MEI: o nome da empresa é o da pessoa física, que não é publicado.
      dados = {
        abertura,
        pessoaFisica: j.codigo_natureza_juridica === 2135 || j.opcao_pelo_mei === true,
        consorcio: naturezaSemAlertaRecente(j.codigo_natureza_juridica),
        verificado: true,
      };
      status = "ok";
      break;
    }
    if (r?.status === 404) break;
    await pausa(1500 * i);
  }
  if (status !== "ok") falhasCnpj[status] = (falhasCnpj[status] ?? 0) + 1;
  cache.set(cnpj, dados);
  await pausa(350);
  return dados;
}
