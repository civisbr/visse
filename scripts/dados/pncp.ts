import { pareceCpfNoNome, type Contrato } from "./regras";

const BASE = "https://pncp.gov.br/api/consulta/v1/contratos";
const NORDESTE = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);

type ItemPncp = {
  numeroControlePNCP: string;
  orgaoEntidade: { razaoSocial: string; esferaId: string };
  unidadeOrgao: { ufSigla: string; municipioNome: string };
  objetoContrato: string;
  nomeRazaoSocialFornecedor: string;
  niFornecedor: string;
  tipoPessoa: string;
  valorInicial: number;
  valorAcumulado: number | null;
  dataAssinatura: string;
};

function linkContrato(controle: string): string {
  const m = /^(\d{14})-2-(\d+)\/(\d{4})$/.exec(controle);
  return m
    ? `https://pncp.gov.br/app/contratos/${m[1]}/${m[3]}/${Number(m[2])}`
    : "https://pncp.gov.br/app/contratos";
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");

async function get<T>(url: string, tentativas = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (r.status === 204) return { data: [], totalPaginas: 0 } as T;
      if (!r.ok) {
        if (r.status >= 400 && r.status < 500 && r.status !== 429) i = tentativas;
        throw new Error(`HTTP ${r.status}`);
      }
      return (await r.json()) as T;
    } catch (e) {
      if (i >= tentativas) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

// 60 dias de contratos do país inteiro passam de 650 páginas de 500; o teto é só proteção contra resposta absurda.
const MAX_PAGINAS = 1000;

export type Coleta = { contratos: Contrato[]; descartados: number; excluidosPessoaFisica: number };

export async function contratosNordeste(dias: number, hoje = new Date()): Promise<Coleta> {
  const inicio = new Date(hoje.getTime() - dias * 86_400_000);
  const saida = new Map<string, Contrato>();
  let descartados = 0;
  let excluidosPessoaFisica = 0;
  for (let pagina = 1, total = 1; pagina <= total; pagina++) {
    const q = new URLSearchParams({
      dataInicial: ymd(inicio),
      dataFinal: ymd(hoje),
      pagina: String(pagina),
      tamanhoPagina: "500",
    });
    const r = await get<{ data: ItemPncp[]; totalPaginas: number }>(`${BASE}?${q}`);
    if (
      !Array.isArray(r.data) ||
      !Number.isInteger(r.totalPaginas) ||
      r.totalPaginas < 0 ||
      r.totalPaginas > MAX_PAGINAS
    ) {
      throw new Error(`Resposta inesperada do PNCP na página ${pagina}`);
    }
    total = r.totalPaginas;
    for (const i of r.data) {
      if (
        !i?.orgaoEntidade ||
        !i.unidadeOrgao ||
        typeof i.valorInicial !== "number" ||
        typeof i.dataAssinatura !== "string"
      ) {
        descartados++;
        continue;
      }
      if (i.orgaoEntidade.esferaId !== "M" || !NORDESTE.has(i.unidadeOrgao.ufSigla)) continue;
      if (i.tipoPessoa !== "PJ" || !/^\d{14}$/.test(i.niFornecedor)) continue;
      if (pareceCpfNoNome(i.nomeRazaoSocialFornecedor ?? "")) {
        excluidosPessoaFisica++;
        continue;
      }
      saida.set(i.numeroControlePNCP, {
        id: i.numeroControlePNCP,
        orgao: i.orgaoEntidade.razaoSocial,
        municipio: i.unidadeOrgao.municipioNome,
        uf: i.unidadeOrgao.ufSigla,
        objeto: i.objetoContrato,
        fornecedor: i.nomeRazaoSocialFornecedor,
        cnpj: i.niFornecedor,
        valorInicial: i.valorInicial,
        valorAcumulado: i.valorAcumulado ?? i.valorInicial,
        assinatura: i.dataAssinatura,
        link: linkContrato(i.numeroControlePNCP),
      });
    }
  }
  return { contratos: [...saida.values()], descartados, excluidosPessoaFisica };
}
