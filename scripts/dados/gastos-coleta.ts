import { extrairDespesas, extrairPessoal, type Ente, type ItemSiconfi } from "./gastos-regras";

export type Coletado = {
  codIbge: number;
  nome: string;
  uf: string;
  populacao: number;
  despesaTotal: number;
  saude: number;
  educacao: number;
  pessoal: ReturnType<typeof extrairPessoal>;
  rgfPeriodicidade: "quadrimestral" | "semestral" | null;
};

export type Resultado = {
  municipios: Coletado[];
  exercicio: number;
  semDespesas: number;
  semPessoal: number;
  falhas: string[];
};

export type Consulta = (rota: string, q: Record<string, string>) => Promise<ItemSiconfi[]>;

// Texto vindo da API não pode quebrar linha: "::" no início de linha vira comando de workflow.
const limpo = (t: string) => t.replace(/[\r\n]+/g, " ");

type Opcoes = { pausaMs?: number; log?: (msg: string) => void };

// Usa o exercício completo mais recente em que a maioria dos municípios já enviou os dados.
// Só recua de ano quando a causa é falta de envio; falha de rede aborta, para não publicar ano velho por engano.
export async function coletarGastos(
  itens: Consulta,
  piloto: Ente[],
  anoAtual: number,
  { pausaMs = 200, log = console.log }: Opcoes = {},
): Promise<Resultado> {
  const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
  let escolhido: { achados: Coletado[]; ano: number } | null = null;
  let semDespesas = 0;
  let falhas: string[] = [];

  for (const ano of [anoAtual - 1, anoAtual - 2]) {
    const achados: Coletado[] = [];
    semDespesas = 0;
    falhas = [];
    for (const e of piloto) {
      try {
        const desp = extrairDespesas(
          await itens("rreo", {
            an_exercicio: String(ano),
            nr_periodo: "6",
            co_tipo_demonstrativo: "RREO",
            no_anexo: "RREO-Anexo 02",
            id_ente: String(e.cod_ibge),
          }),
        );
        if (!desp) {
          semDespesas++;
          log(`::notice::${e.cod_ibge} ${limpo(e.ente)}: sem despesas por função em ${ano}`);
          continue;
        }
        // Município pequeno pode publicar o RGF por semestre em vez de quadrimestre.
        const rgf = async (p: string, n: string) =>
          extrairPessoal(
            await itens("rgf", {
              an_exercicio: String(ano),
              in_periodicidade: p,
              nr_periodo: n,
              co_tipo_demonstrativo: "RGF",
              no_anexo: "RGF-Anexo 01",
              co_esfera: "M",
              co_poder: "E",
              id_ente: String(e.cod_ibge),
            }),
          );
        let pessoal: Coletado["pessoal"] = null;
        let rgfPeriodicidade: Coletado["rgfPeriodicidade"] = null;
        try {
          pessoal = await rgf("Q", "3");
          if (pessoal) rgfPeriodicidade = "quadrimestral";
          else {
            pessoal = await rgf("S", "2");
            if (pessoal) rgfPeriodicidade = "semestral";
          }
        } catch (err) {
          log(
            `::warning::${e.cod_ibge} ${limpo(e.ente)}: RGF indisponível (${limpo((err as Error).message)})`,
          );
        }
        if (!pessoal) log(`::notice::${e.cod_ibge} ${limpo(e.ente)}: sem RGF de pessoal em ${ano}`);
        achados.push({
          codIbge: e.cod_ibge,
          nome: e.ente,
          uf: e.uf,
          populacao: e.populacao,
          ...desp,
          pessoal,
          rgfPeriodicidade,
        });
      } catch (err) {
        falhas.push(`${e.cod_ibge}: ${limpo((err as Error).message)}`);
      }
      await pausa(pausaMs);
    }
    log(
      `${ano}: ${achados.length}/${piloto.length} municípios com dados (${semDespesas} sem envio, ${falhas.length} falhas)`,
    );
    if (achados.length >= piloto.length / 2) {
      escolhido = { achados, ano };
      break;
    }
    if (falhas.length > 0)
      throw new Error(
        `Falhas de rede em ${ano} (${limpo(falhas[0] ?? "")}); abortando para não recuar de ano indevidamente`,
      );
  }

  if (!escolhido) throw new Error("Nenhum município com dados; abortando sem gravar");
  if (falhas.length > piloto.length / 3)
    throw new Error(`${falhas.length} consultas falharam: ${falhas[0]}`);
  for (const f of falhas) log(`::warning::${limpo(f)}`);

  // Maioria sem pessoal indica mudança de esquema do RGF, não ausência de envio.
  const semPessoal = escolhido.achados.filter((m) => !m.pessoal).length;
  if (semPessoal > escolhido.achados.length / 2)
    throw new Error(
      `${semPessoal} de ${escolhido.achados.length} sem dados de pessoal; esquema do RGF pode ter mudado`,
    );

  return {
    municipios: escolhido.achados,
    exercicio: escolhido.ano,
    semDespesas,
    semPessoal,
    falhas,
  };
}
