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
  falhasRgf: number;
};

export type Consulta = (rota: string, q: Record<string, string>) => Promise<ItemSiconfi[]>;

type Opcoes = { pausaMs?: number; concorrencia?: number; log?: (msg: string) => void };

// Abaixo disso o exercício é considerado ainda não fechado e o anterior é usado.
const COBERTURA_MINIMA = 0.7;
const MAX_FALHAS_SEGUIDAS = 20;
const MIN_PROCESSADOS_PARA_PROPORCAO = 40;

// Texto vindo da API não pode quebrar linha: "::" no início de linha vira comando de workflow.
const limpo = (t: string) => t.replace(/[\r\n]+/g, " ");
const mensagem = (e: unknown) => limpo(String((e as Error)?.message ?? e));

// Usa o exercício completo mais recente em que a maior parte dos municípios já enviou os dados.
// Só recua de ano quando a causa é falta de envio; falha de rede aborta, para não publicar ano velho por engano.
export async function coletarGastos(
  itens: Consulta,
  universo: Ente[],
  anoAtual: number,
  { pausaMs = 200, concorrencia = 4, log = console.log }: Opcoes = {},
): Promise<Resultado> {
  const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
  let escolhido: { achados: Coletado[]; ano: number } | null = null;
  let semDespesas = 0;
  let falhas: string[] = [];
  let falhasRgf = 0;

  for (const ano of [anoAtual - 1, anoAtual - 2]) {
    const achados: Coletado[] = [];
    semDespesas = 0;
    falhas = [];
    falhasRgf = 0;
    let seguidas = 0;
    let processados = 0;

    const processa = async (e: Ente) => {
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
          seguidas = 0;
          return;
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
        let rgfFalhou = false;
        try {
          pessoal = await rgf("Q", "3");
          if (pessoal) rgfPeriodicidade = "quadrimestral";
          else {
            pessoal = await rgf("S", "2");
            if (pessoal) rgfPeriodicidade = "semestral";
          }
        } catch {
          falhasRgf++;
          rgfFalhou = true;
        }
        seguidas = rgfFalhou ? seguidas + 1 : 0;
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
        seguidas++;
        falhas.push(`${e.cod_ibge}: ${mensagem(err)}`);
      } finally {
        processados++;
      }
    };

    // Com o servidor fora do ar ou travado, não vale percorrer o Nordeste inteiro só para descobrir isso.
    const desistir = () =>
      seguidas >= MAX_FALHAS_SEGUIDAS ||
      falhas.length > universo.length / 3 ||
      (processados >= MIN_PROCESSADOS_PARA_PROPORCAO && falhas.length > processados / 2);

    // Pool: um município lento não segura os demais trabalhadores.
    let proximo = 0;
    const trabalhador = async () => {
      while (proximo < universo.length && !desistir()) {
        const e = universo[proximo++];
        if (e) await processa(e);
        await pausa(pausaMs);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, concorrencia) }, trabalhador));

    const parouCedo = desistir();
    achados.sort((a, b) => a.codIbge - b.codIbge);
    log(
      `${ano}: ${achados.length}/${universo.length} municípios com dados (${semDespesas} sem envio, ${falhas.length} falhas, ${falhasRgf} falhas só do RGF)`,
    );
    if (achados.length >= universo.length * COBERTURA_MINIMA) {
      escolhido = { achados, ano };
      break;
    }
    // Parada antecipada vinda só de falhas do RGF não gera entrada em `falhas`, mas também não é falta de envio.
    if (falhas.length > 0 || parouCedo)
      throw new Error(
        `Falhas de rede em ${ano} (${falhas[0] ?? "coleta interrompida por falhas seguidas"}); abortando para não recuar de ano indevidamente`,
      );
  }

  if (!escolhido) throw new Error("Nenhum município com dados; abortando sem gravar");
  for (const f of falhas.slice(0, 5)) log(`::warning::${f}`);
  if (falhas.length > 5) log(`::warning::mais ${falhas.length - 5} falhas de consulta; ver o log`);

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
    falhasRgf,
  };
}
