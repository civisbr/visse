const cache = new Map<string, string | null>();
export const falhasCnpj: Record<string, number> = {};

const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export async function aberturaCnpj(cnpj: string): Promise<string | null> {
  if (cache.has(cnpj)) return cache.get(cnpj)!;
  let data: string | null = null;
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
      };
      const v = j.data_inicio_atividade;
      // Filial traz a data da própria abertura, não a da empresa; usar essa data geraria falso positivo.
      data =
        j.identificador_matriz_filial === 1 &&
        typeof v === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(v)
          ? v
          : null;
      status = "ok";
      break;
    }
    if (r?.status === 404) break;
    await pausa(1500 * i);
  }
  if (status !== "ok") falhasCnpj[status] = (falhasCnpj[status] ?? 0) + 1;
  cache.set(cnpj, data);
  await pausa(350);
  return data;
}
