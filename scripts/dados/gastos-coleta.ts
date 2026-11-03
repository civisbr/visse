import { extrairDespesas, extrairPessoal, type Ente, type ItemSiconfi } from "./gastos-regras";

export type PeriodoRgf = { tipo: "Q" | "S"; numero: number };

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
  // Só no acompanhamento do ano corrente, em que cada município está num período diferente.
  periodo?: { bimestre: number; pessoal: PeriodoRgf | null };
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

type Periodos = { bimestres: number[]; rgf: PeriodoRgf[]; detalhar: boolean };

// Ano fechado: só o 6º bimestre (acumulado do ano) e o RGF do fim do ano.
const PERIODOS_FECHADO: Periodos = {
  bimestres: [6],
  rgf: [
    { tipo: "Q", numero: 3 },
    { tipo: "S", numero: 2 },
  ],
  detalhar: false,
};

// Abaixo disso o exercício é considerado ainda não fechado e o anterior é usado.
const COBERTURA_MINIMA = 0.7;
const MAX_FALHAS_SEGUIDAS = 20;
const MIN_PROCESSADOS_PARA_PROPORCAO = 40;
// No ano corrente a cobertura é parcial por natureza; só falha de rede em volume reprova.
const MAX_FALHAS_CORRENTE = 0.05;
const MAX_SEM_PESSOAL_CORRENTE = 0.9;

// Texto vindo da API não pode quebrar linha: "::" no início de linha vira comando de workflow.
const limpo = (t: string) => t.replace(/[\r\n]+/g, " ");
const mensagem = (e: unknown) => limpo(String((e as Error)?.message ?? e));

// Bimestres e períodos do RGF que já terminaram antes do mês de hoje; os mais recentes primeiro.
// O prazo de envio é de cerca de 30 dias, então o período que acabou no mês passado ainda pode existir.
export function periodosDoAno(mes: number): { bimestres: number[]; rgf: PeriodoRgf[] } {
  const bimestres = [6, 5, 4, 3, 2, 1].filter((b) => 2 * b < mes);
  const rgf: PeriodoRgf[] = [
    ...([3, 2, 1] as const).map((numero) => ({ tipo: "Q" as const, numero })),
    ...([2, 1] as const).map((numero) => ({ tipo: "S" as const, numero })),
  ].filter((p) => (p.tipo === "Q" ? 4 : 6) * p.numero < mes);
  return { bimestres, rgf };
}

type ResultadoAno = {
  achados: Coletado[];
  semDespesas: number;
  falhas: string[];
  falhasRgf: number;
  parouCedo: boolean;
};

async function coletarAno(
  itens: Consulta,
  universo: Ente[],
  ano: number,
  { bimestres, rgf: periodosRgf, detalhar }: Periodos,
  { pausaMs = 200, concorrencia = 4 }: Opcoes,
): Promise<ResultadoAno> {
  const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
  const achados: Coletado[] = [];
  let semDespesas = 0;
  const falhas: string[] = [];
  let falhasRgf = 0;
  let seguidas = 0;
  let processados = 0;

  const processa = async (e: Ente) => {
    try {
      let desp: ReturnType<typeof extrairDespesas> = null;
      let bimestre = 0;
      for (const b of bimestres) {
        desp = extrairDespesas(
          await itens("rreo", {
            an_exercicio: String(ano),
            nr_periodo: String(b),
            co_tipo_demonstrativo: "RREO",
            no_anexo: "RREO-Anexo 02",
            id_ente: String(e.cod_ibge),
          }),
        );
        if (desp) {
          bimestre = b;
          break;
        }
      }
      if (!desp) {
        semDespesas++;
        seguidas = 0;
        return;
      }
      // Município pequeno pode publicar o RGF por semestre em vez de quadrimestre.
      const rgf = async ({ tipo, numero }: PeriodoRgf) =>
        extrairPessoal(
          await itens("rgf", {
            an_exercicio: String(ano),
            in_periodicidade: tipo,
            nr_periodo: String(numero),
            co_tipo_demonstrativo: "RGF",
            no_anexo: "RGF-Anexo 01",
            co_esfera: "M",
            co_poder: "E",
            id_ente: String(e.cod_ibge),
          }),
        );
      let pessoal: Coletado["pessoal"] = null;
      let achadoRgf: PeriodoRgf | null = null;
      let rgfFalhou = false;
      try {
        for (const p of periodosRgf) {
          pessoal = await rgf(p);
          if (pessoal) {
            achadoRgf = p;
            break;
          }
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
        rgfPeriodicidade: achadoRgf
          ? achadoRgf.tipo === "Q"
            ? "quadrimestral"
            : "semestral"
          : null,
        ...(detalhar ? { periodo: { bimestre, pessoal: achadoRgf } } : {}),
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

  achados.sort((a, b) => a.codIbge - b.codIbge);
  return { achados, semDespesas, falhas, falhasRgf, parouCedo: desistir() };
}

// Usa o exercício completo mais recente em que a maior parte dos municípios já enviou os dados.
// Só recua de ano quando a causa é falta de envio; falha de rede aborta, para não publicar ano velho por engano.
export async function coletarGastos(
  itens: Consulta,
  universo: Ente[],
  anoAtual: number,
  opcoes: Opcoes = {},
): Promise<Resultado> {
  const log = opcoes.log ?? console.log;
  let escolhido: { r: ResultadoAno; ano: number } | null = null;

  for (const ano of [anoAtual - 1, anoAtual - 2]) {
    const r = await coletarAno(itens, universo, ano, PERIODOS_FECHADO, opcoes);
    log(
      `${ano}: ${r.achados.length}/${universo.length} municípios com dados (${r.semDespesas} sem envio, ${r.falhas.length} falhas, ${r.falhasRgf} falhas só do RGF)`,
    );
    if (r.achados.length >= universo.length * COBERTURA_MINIMA) {
      escolhido = { r, ano };
      break;
    }
    // Parada antecipada vinda só de falhas do RGF não gera entrada em `falhas`, mas também não é falta de envio.
    if (r.falhas.length > 0 || r.parouCedo)
      throw new Error(
        `Falhas de rede em ${ano} (${r.falhas[0] ?? "coleta interrompida por falhas seguidas"}); abortando para não recuar de ano indevidamente`,
      );
  }

  if (!escolhido) throw new Error("Nenhum município com dados; abortando sem gravar");
  const { r, ano } = escolhido;
  for (const f of r.falhas.slice(0, 5)) log(`::warning::${f}`);
  if (r.falhas.length > 5)
    log(`::warning::mais ${r.falhas.length - 5} falhas de consulta; ver o log`);

  // Maioria sem pessoal indica mudança de esquema do RGF, não ausência de envio.
  const semPessoal = r.achados.filter((m) => !m.pessoal).length;
  if (semPessoal > r.achados.length / 2)
    throw new Error(
      `${semPessoal} de ${r.achados.length} sem dados de pessoal; esquema do RGF pode ter mudado`,
    );

  return {
    municipios: r.achados,
    exercicio: ano,
    semDespesas: r.semDespesas,
    semPessoal,
    falhas: r.falhas,
    falhasRgf: r.falhasRgf,
  };
}

// Acompanhamento do ano em curso: cada município entra com o último bimestre (e o último período do RGF)
// que já enviou ao Tesouro. Devolve null quando nenhum bimestre do ano terminou ainda.
export async function coletarCorrente(
  itens: Consulta,
  universo: Ente[],
  ano: number,
  mes: number,
  opcoes: Opcoes = {},
): Promise<(Resultado & { bimestreMax: number }) | null> {
  const log = opcoes.log ?? console.log;
  const periodos = periodosDoAno(mes);
  if (periodos.bimestres.length === 0) return null;
  const r = await coletarAno(itens, universo, ano, { ...periodos, detalhar: true }, opcoes);
  log(
    `${ano} (parcial): ${r.achados.length}/${universo.length} municípios com dados (${r.semDespesas} sem envio, ${r.falhas.length} falhas, ${r.falhasRgf} falhas só do RGF)`,
  );
  if (r.parouCedo || r.falhas.length > universo.length * MAX_FALHAS_CORRENTE)
    throw new Error(
      `Falhas de rede no acompanhamento de ${ano} (${r.falhas[0] ?? "coleta interrompida por falhas seguidas"})`,
    );
  if (r.achados.length === 0)
    throw new Error(`Nenhum município com dados de ${ano}; abortando sem gravar`);
  // Quase todos sem pessoal indica mudança de esquema do RGF; o limite é folgado porque o ano ainda está em curso.
  const semPessoal = r.achados.filter((m) => !m.pessoal).length;
  if (periodos.rgf.length > 0 && semPessoal > r.achados.length * MAX_SEM_PESSOAL_CORRENTE)
    throw new Error(
      `${semPessoal} de ${r.achados.length} sem dados de pessoal; esquema do RGF pode ter mudado`,
    );
  for (const f of r.falhas.slice(0, 5)) log(`::warning::${f}`);
  return {
    municipios: r.achados,
    exercicio: ano,
    semDespesas: r.semDespesas,
    semPessoal,
    falhas: r.falhas,
    falhasRgf: r.falhasRgf,
    // O último bimestre que algum município de fato enviou, não o último consultado.
    bimestreMax: Math.max(...r.achados.map((m) => m.periodo?.bimestre ?? 0)),
  };
}
