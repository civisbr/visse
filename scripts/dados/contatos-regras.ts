export type Veredito = "ok" | "inconclusivo" | "quebrado";

// Sites oficiais costumam barrar robôs (401/403/429) ou usar cadeia de certificados que o runner não conhece;
// isso não prova que o endereço mudou, então só 404/410, 5xx e DNS inexistente reprovam.
export function classificarStatus(status: number): Veredito {
  if (status >= 200 && status < 400) return "ok";
  if (status === 404 || status === 410 || status >= 500) return "quebrado";
  return "inconclusivo";
}

export function classificarErro(erro: unknown): Veredito {
  // Node (undici) põe o código em cause.code; o Bun, usado no workflow, põe direto no erro.
  const e = erro as { code?: unknown; cause?: { code?: unknown } } | null;
  const codigo = String(e?.code ?? e?.cause?.code ?? "");
  return codigo === "ENOTFOUND" ? "quebrado" : "inconclusivo";
}

export function diasDesde(iso: string, hoje: Date): number {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((hoje.getTime() - t) / 86_400_000);
}
