type Dependencias = {
  fetchFn?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  agora?: () => number;
  intervaloMs?: number;
  intervaloMaxMs?: number;
  tentativas?: number;
  tentativas429?: number;
  esperaPadrao429Ms?: number;
  recuoMs?: number;
  orcamentoBloqueioMs?: number;
  headers?: Record<string, string>;
};

export type Estatisticas = {
  chamadas: number;
  http429: number;
  http503: number;
  novasTentativas: number;
  bloqueadoMs: number;
  intervaloFinalMs: number;
};

const TETO_ESPERA_MS = 120_000;

// A API do Tesouro devolve 429 quando muitas consultas chegam juntas ou a cota da janela estoura. O ritmo é global:
// os trabalhadores concorrentes compartilham o intervalo mínimo e, num 429, todos esperam, inclusive quem já
// reservou a vez. O intervalo dobra a cada 429 e volta ao valor base depois de uma sequência de sucessos.
export function criarCliente({
  fetchFn = fetch,
  esperar = (ms) => new Promise((ok) => setTimeout(ok, ms)),
  agora = Date.now,
  intervaloMs = 350,
  intervaloMaxMs = 2000,
  tentativas = 3,
  tentativas429 = 6,
  esperaPadrao429Ms = 30_000,
  recuoMs = 2000,
  orcamentoBloqueioMs = 40 * 60_000,
  headers = {},
}: Dependencias = {}) {
  let intervalo = intervaloMs;
  let proximaSaida = 0;
  let bloqueadoAte = 0;
  let sucessosSeguidos = 0;
  const estatisticas: Estatisticas = {
    chamadas: 0,
    http429: 0,
    http503: 0,
    novasTentativas: 0,
    bloqueadoMs: 0,
    intervaloFinalMs: intervalo,
  };

  const aguardarVez = async () => {
    for (;;) {
      const t = agora();
      const alvo = Math.max(proximaSaida, bloqueadoAte);
      if (alvo <= t) {
        proximaSaida = t + intervalo;
        return;
      }
      await esperar(alvo - t);
    }
  };

  const bloquear = (ms: number) => {
    const novo = agora() + Math.min(ms, TETO_ESPERA_MS);
    if (novo > bloqueadoAte) {
      estatisticas.bloqueadoMs += novo - Math.max(bloqueadoAte, agora());
      bloqueadoAte = novo;
    }
    if (estatisticas.bloqueadoMs > orcamentoBloqueioMs)
      throw new Error("Tempo acumulado de espera por limite de taxa excedeu o orçamento");
    intervalo = Math.min(intervalo * 2, intervaloMaxMs);
    sucessosSeguidos = 0;
    estatisticas.intervaloFinalMs = intervalo;
  };

  const get = async function get<T>(url: string): Promise<T> {
    for (let i = 1; ; i++) {
      let maximo = tentativas;
      try {
        await aguardarVez();
        estatisticas.chamadas++;
        const r = await fetchFn(url, { headers, signal: AbortSignal.timeout(45_000) });
        if (!r.ok) {
          await r.body?.cancel().catch(() => {});
          if (r.status === 429 || r.status === 503) {
            maximo = tentativas429;
            if (r.status === 429) estatisticas.http429++;
            else estatisticas.http503++;
            const cabecalho = r.headers.get("retry-after");
            const segundos = Number(cabecalho);
            const data = cabecalho ? Date.parse(cabecalho) : Number.NaN;
            const espera =
              Number.isFinite(segundos) && segundos > 0
                ? segundos * 1000
                : Number.isFinite(data)
                  ? Math.max(0, data - agora())
                  : esperaPadrao429Ms * i;
            if (espera > TETO_ESPERA_MS) {
              maximo = i;
              throw new Error(
                `HTTP ${r.status} com Retry-After acima de ${TETO_ESPERA_MS / 1000}s`,
              );
            }
            bloquear(espera);
          } else if (r.status >= 400 && r.status < 500) {
            maximo = i;
          }
          throw new Error(`HTTP ${r.status}`);
        }
        if (++sucessosSeguidos >= 50 && intervalo > intervaloMs) {
          intervalo = Math.max(intervaloMs, intervalo / 2);
          sucessosSeguidos = 0;
          estatisticas.intervaloFinalMs = intervalo;
        }
        return (await r.json()) as T;
      } catch (e) {
        if (i >= maximo) throw new Error(`${url}: ${(e as Error).message}`);
        estatisticas.novasTentativas++;
        await esperar(Math.min(recuoMs * i, TETO_ESPERA_MS));
      }
    }
  };

  return Object.assign(get, { estatisticas });
}
