import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, Flag, LocateFixed, Maximize2, Minus, Plus } from "lucide-react";
import { nivelPessoal, type MunicipioGastos, type NivelPessoal } from "@/lib/gastos-data";
import { carregarMapa, distanciaKm, projetar } from "@/lib/mapa-data";

type Alertado = Exclude<NivelPessoal, "ok">;

const NIVEIS: { id: Alertado; rotulo: string; cor: string; texto: string }[] = [
  {
    id: "limite",
    rotulo: "Acima do limite máximo",
    cor: "#c8321f",
    texto: "acima do limite máximo da LRF",
  },
  {
    id: "prudencial",
    rotulo: "Acima do limite prudencial",
    cor: "#e8862a",
    texto: "acima do limite prudencial da LRF",
  },
  {
    id: "alerta",
    rotulo: "Acima do limite de alerta",
    cor: "#f2c230",
    texto: "acima do limite de alerta da LRF",
  },
];

const ZOOM_MAXIMO = 14;
const pct = (n: number) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const km = (n: number) => (n < 10 ? n.toFixed(1).replace(".", ",") : Math.round(n)) + " km";

type Pin = {
  m: MunicipioGastos;
  nivel: Alertado;
  cor: string;
  texto: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
};
type Vista = { x: number; y: number; w: number; h: number };

function descerParaContas(): boolean {
  const alvo = document.getElementById("contas-cidade");
  if (!alvo) return false;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  alvo.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  alvo.focus({ preventScroll: true });
  return true;
}

export function MapaAlertas({
  municipios,
  selecionado,
  onSelecionar,
  exercicio,
}: {
  exercicio: number;
  municipios: MunicipioGastos[];
  selecionado: number | null;
  onSelecionar: (cod: number) => void;
}) {
  const { data: mapa, isError } = useQuery({
    queryKey: ["mapa-nordeste"],
    queryFn: carregarMapa,
    retry: 1,
    staleTime: 86_400_000,
  });
  const [ativos, setAtivos] = useState<Set<Alertado>>(new Set(["limite", "prudencial", "alerta"]));
  const [vista, setVista] = useState<Vista | null>(null);
  const [largPx, setLargPx] = useState(0);
  const [dica, setDica] = useState<{ x: number; y: number; m: Pin } | null>(null);
  const [voce, setVoce] = useState<{ x: number; y: number } | null>(null);
  const [aviso, setAviso] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const quadroRef = useRef<HTMLDivElement>(null);
  const internoRef = useRef(false);
  const iniciouRef = useRef(false);
  const arrastouRef = useRef(false);

  const todos = useMemo(() => {
    if (!mapa) return [];
    const saida: Pin[] = [];
    for (const m of municipios) {
      const c = mapa.municipios[String(m.codIbge)];
      if (!c || !m.pessoal) continue;
      const nivel = nivelPessoal(m.pessoal);
      if (nivel === "ok") continue;
      const info = NIVEIS.find((n) => n.id === nivel);
      saida.push({
        m,
        nivel,
        cor: info?.cor ?? "var(--coral)",
        texto: info?.texto ?? "",
        lat: c[0],
        lon: c[1],
        ...projetar(mapa.afim, c[0], c[1]),
      });
    }
    return saida;
  }, [mapa, municipios]);
  const contagem = useMemo(() => {
    const c: Record<Alertado, number> = { limite: 0, prudencial: 0, alerta: 0 };
    for (const p of todos) c[p.nivel]++;
    return c;
  }, [todos]);
  // Os mais graves por último, para ficarem por cima quando os pontos se sobrepõem.
  const visiveis = useMemo(
    () =>
      todos
        .filter((p) => ativos.has(p.nivel))
        .sort(
          (a, b) =>
            NIVEIS.findIndex((n) => n.id === b.nivel) - NIVEIS.findIndex((n) => n.id === a.nivel),
        ),
    [todos, ativos],
  );

  const cheia: Vista | null = mapa ? { x: 0, y: 0, w: mapa.largura, h: mapa.altura } : null;
  const v = vista ?? cheia;

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLargPx(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapa]);

  const limitar = (n: Vista): Vista => {
    if (!mapa) return n;
    const w = Math.min(Math.max(n.w, mapa.largura / ZOOM_MAXIMO), mapa.largura);
    const h = w * (mapa.altura / mapa.largura);
    return {
      w,
      h,
      x: Math.min(Math.max(n.x, 0), mapa.largura - w),
      y: Math.min(Math.max(n.y, 0), mapa.altura - h),
    };
  };
  // Sempre a partir da vista anterior: vários eventos entre dois renders não podem partir do mesmo estado.
  const atualizar = (f: (a: Vista) => Vista) =>
    setVista((prev) => limitar(f(prev ?? cheia ?? { x: 0, y: 0, w: 1, h: 1 })));
  const zoom = (fator: number, ancora?: { cx: number; cy: number }) => {
    if (!mapa) return;
    const r = svgRef.current?.getBoundingClientRect();
    atualizar((a) => {
      const p =
        ancora && r
          ? {
              x: a.x + ((ancora.cx - r.left) / r.width) * a.w,
              y: a.y + ((ancora.cy - r.top) / r.height) * a.h,
            }
          : { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const w = Math.min(Math.max(a.w * fator, mapa.largura / ZOOM_MAXIMO), mapa.largura);
      const real = w / a.w;
      return { x: p.x - (p.x - a.x) * real, y: p.y - (p.y - a.y) * real, w, h: 0 };
    });
  };
  const enquadrar = (pts: { x: number; y: number }[], folga = 0.6) => {
    if (!mapa || pts.length === 0) return;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const w = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 90);
    const lado = w * (1 + folga);
    setVista(
      limitar({
        w: lado,
        h: 0,
        x: (Math.min(...xs) + Math.max(...xs)) / 2 - lado / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2 - (lado * (mapa.altura / mapa.largura)) / 2,
      }),
    );
  };

  // Seleção vinda de fora (busca por nome) leva o mapa até a cidade; clique no próprio pin não move a vista.
  useEffect(() => {
    if (selecionado === null || !mapa) return;
    // A cidade inicial da página não deve aproximar o mapa; só as escolhas seguintes.
    if (!iniciouRef.current) {
      iniciouRef.current = true;
      return;
    }
    if (internoRef.current) {
      internoRef.current = false;
      return;
    }
    const c = mapa.municipios[String(selecionado)];
    if (c) enquadrar([projetar(mapa.afim, c[0], c[1])], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionado, mapa]);

  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const ultimaDist = useRef(0);
  const onDown = (e: React.PointerEvent) => {
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 1) arrastouRef.current = false;
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      if (a && b) ultimaDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const p = ponteiros.current.get(e.pointerId);
    if (!p || !v) return;
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    if (ponteiros.current.size === 1) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!arrastouRef.current && Math.hypot(dx, dy) < 4) return;
      if (!arrastouRef.current) {
        arrastouRef.current = true;
        svgRef.current?.setPointerCapture(e.pointerId);
        setDica(null);
      }
      atualizar((a) => ({
        ...a,
        x: a.x - (dx / r.width) * a.w,
        y: a.y - (dy / r.height) * a.h,
      }));
      p.x = e.clientX;
      p.y = e.clientY;
    } else if (ponteiros.current.size === 2) {
      ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...ponteiros.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (ultimaDist.current && d > 0)
        zoom(ultimaDist.current / d, { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 });
      ultimaDist.current = d;
      arrastouRef.current = true;
    }
  };
  const soltar = (e: React.PointerEvent) => {
    ponteiros.current.delete(e.pointerId);
    ultimaDist.current = 0;
    setTimeout(() => {
      arrastouRef.current = false;
    }, 0);
  };
  // Roda do mouse só com Ctrl/Cmd, para a página continuar rolando normalmente.
  const onWheel = useRef<(e: WheelEvent) => void>(() => {});
  onWheel.current = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoom(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.004), { cx: e.clientX, cy: e.clientY });
  };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => onWheel.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [mapa]);

  const teclas = (e: React.KeyboardEvent) => {
    const noMapa = e.target === svgRef.current;
    const emPin = !noMapa && (e.target as Element).closest("[data-cod]") !== null;
    if (!noMapa && !emPin) return;
    const mover = (dx: number, dy: number) => () =>
      atualizar((a) => ({ ...a, x: a.x + dx * a.w * 0.12, y: a.y + dy * a.h * 0.12 }));
    // Setas num pin servem para trocar de pin; só no mapa elas movem a vista.
    const acao: Record<string, () => void> = {
      "+": () => zoom(0.7),
      "=": () => zoom(0.7),
      "-": () => zoom(1 / 0.7),
      ...(noMapa
        ? {
            ArrowLeft: mover(-1, 0),
            ArrowRight: mover(1, 0),
            ArrowUp: mover(0, -1),
            ArrowDown: mover(0, 1),
          }
        : {}),
    };
    const f = acao[e.key];
    if (f) {
      e.preventDefault();
      f();
    }
  };

  const mostrarDica = (el: Element, pin: Pin) => {
    const r = el.getBoundingClientRect();
    const q = quadroRef.current?.getBoundingClientRect();
    if (!q) return;
    setDica({ x: r.left - q.left + r.width / 2, y: r.top - q.top, m: pin });
  };
  const escolher = (pin: Pin) => {
    if (arrastouRef.current) return;
    // Só sinaliza quando a seleção vai mudar; do contrário o efeito não roda e a marca ficaria presa.
    if (pin.m.codIbge !== selecionado) internoRef.current = true;
    onSelecionar(pin.m.codIbge);
    // Aguarda o commit do React para o bloco já mostrar a cidade nova ao rolar.
    requestAnimationFrame(() => descerParaContas());
  };
  const noPin = (e: React.KeyboardEvent, i: number, pin: Pin) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      escolher(pin);
      return;
    }
    const alvo = {
      ArrowRight: visiveis[i + 1],
      ArrowDown: visiveis[i + 1],
      ArrowLeft: visiveis[i - 1],
      ArrowUp: visiveis[i - 1],
      Home: visiveis[0],
      End: visiveis[visiveis.length - 1],
    }[e.key];
    if (alvo) {
      e.preventDefault();
      quadroRef.current
        ?.querySelector<SVGElement>(`[data-cod="${CSS.escape(String(alvo.m.codIbge))}"]`)
        ?.focus();
    }
  };

  const localizar = () => {
    if (!mapa) return;
    if (!navigator.geolocation) {
      setAviso("Este navegador não informa a localização. Use a busca por cidade.");
      return;
    }
    setAviso("Procurando a sua posição…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        const proximo = Object.values(mapa.municipios).reduce(
          (min, c) => Math.min(min, distanciaKm(la, lo, c[0], c[1])),
          Infinity,
        );
        if (!(proximo < 120)) {
          setVoce(null);
          setAviso("Você parece estar fora do Nordeste. Use a busca por cidade.");
          return;
        }
        const eu = projetar(mapa.afim, la, lo);
        setVoce(eu);
        const perto = visiveis
          .map((p) => ({ p, d: distanciaKm(la, lo, p.lat, p.lon) }))
          .sort((a, b) => a.d - b.d)[0];
        if (!perto) {
          enquadrar([eu], 0);
          setAviso("Nenhum município em alerta com os filtros escolhidos.");
          return;
        }
        enquadrar([eu, perto.p], 0.5);
        setAviso(
          `Município em alerta mais próximo: ${perto.p.m.nome} (${perto.p.m.uf}), a ${km(perto.d)} em linha reta. Sua posição fica só no seu navegador.`,
        );
      },
      () => setAviso("Não foi possível obter a localização. Use a busca por cidade."),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const alternar = (id: Alertado) =>
    setAtivos((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (isError)
    return (
      <p role="alert" className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
        Não foi possível carregar o mapa agora. A busca por cidade abaixo continua funcionando.
      </p>
    );
  if (!mapa || !v) return null;

  const k = largPx > 0 ? v.w / largPx : 1;
  const longe = v.w > mapa.largura / 2.5;
  const sel = selecionado !== null ? municipios.find((m) => m.codIbge === selecionado) : undefined;
  const selCoord = sel ? mapa.municipios[String(sel.codIbge)] : undefined;
  const selPos = selCoord ? projetar(mapa.afim, selCoord[0], selCoord[1]) : null;
  const nivelSel = sel?.pessoal ? nivelPessoal(sel.pessoal) : null;
  const infoNivel = NIVEIS.find((n) => n.id === nivelSel);
  const botao =
    "flex size-9 items-center justify-center rounded-md border border-border bg-card text-ink shadow-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <div
      id="mapa-alertas"
      tabIndex={-1}
      className="mt-5 scroll-mt-24 focus:outline-none focus-visible:outline-2"
    >
      <h4 className="text-xl font-bold">Mapa dos municípios em alerta</h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada bandeira é um município cuja despesa com pessoal informada passou de um limite da Lei
        de Responsabilidade Fiscal. É um indício automático, não uma acusação. Toque ou clique na
        bandeira para ver os números.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por nível">
        {NIVEIS.map((n) => (
          <button
            key={n.id}
            type="button"
            aria-pressed={ativos.has(n.id)}
            onClick={() => alternar(n.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${ativos.has(n.id) ? "border-ink bg-card" : "border-border bg-secondary text-muted-foreground"}`}
          >
            <Flag
              className="size-4"
              style={{ color: n.cor, fill: n.cor, stroke: "var(--ink)", strokeWidth: 1.5 }}
              aria-hidden="true"
            />
            {n.rotulo} ({contagem[n.id].toLocaleString("pt-BR")})
          </button>
        ))}
      </div>
      <div
        ref={quadroRef}
        className="relative mx-auto mt-3 max-w-xl overflow-hidden rounded-lg border border-border bg-secondary"
      >
        <svg
          ref={svgRef}
          viewBox={`${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`}
          className="block h-auto w-full touch-none select-none"
          tabIndex={0}
          role="group"
          aria-label="Mapa do Nordeste com os municípios em alerta. Setas movem o mapa; mais e menos aproximam."
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onDoubleClick={(e) => {
            if ((e.target as Element).closest("[data-cod]")) return;
            zoom(0.5, { cx: e.clientX, cy: e.clientY });
          }}
          onKeyDown={teclas}
          onClick={() => setDica(null)}
        >
          {mapa.estados.map((e) => (
            <path
              key={e.uf}
              d={e.d}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ))}
          {visiveis.map((p, i) => {
            const cor = p.cor;
            const escolhido = p.m.codIbge === selecionado;
            return (
              <g
                key={p.m.codIbge}
                data-cod={p.m.codIbge}
                transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${k.toFixed(4)})`}
                role="button"
                tabIndex={
                  (
                    selecionado !== null && visiveis.some((v) => v.m.codIbge === selecionado)
                      ? escolhido
                      : i === 0
                  )
                    ? 0
                    : -1
                }
                aria-label={`${p.m.nome} (${p.m.uf}): ${p.texto}`}
                className="cursor-pointer outline-none [&:focus-visible_.anel]:opacity-100"
                onPointerEnter={(e) => !arrastouRef.current && mostrarDica(e.currentTarget, p)}
                onPointerLeave={() => setDica(null)}
                onFocus={(e) => {
                  atualizar((a) =>
                    p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h
                      ? a
                      : { ...a, x: p.x - a.w / 2, y: p.y - a.h / 2 },
                  );
                  mostrarDica(e.currentTarget, p);
                }}
                onBlur={() => setDica(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  escolher(p);
                }}
                onKeyDown={(e) => noPin(e, i, p)}
              >
                <circle
                  className="anel"
                  r={11}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  opacity={escolhido ? 1 : 0}
                />
                {longe && !escolhido ? (
                  <>
                    <circle r={8} fill="transparent" />
                    <circle r={3} fill={cor} stroke="var(--card)" strokeWidth={0.9} />
                  </>
                ) : (
                  <>
                    <rect x={-7} y={-20} width={20} height={22} fill="transparent" />
                    <path
                      d="M0 0V-17"
                      stroke="var(--ink)"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                    />
                    <path
                      d="M0 -17L11 -13L0 -9Z"
                      fill={cor}
                      stroke="var(--ink)"
                      strokeWidth={1}
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </g>
            );
          })}
          {selPos && !visiveis.some((p) => p.m.codIbge === selecionado) && (
            <circle
              cx={selPos.x}
              cy={selPos.y}
              r={7 * k}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={2 * k}
            />
          )}
          {voce && (
            <circle
              cx={voce.x}
              cy={voce.y}
              r={6 * k}
              fill="var(--sky)"
              stroke="var(--ink)"
              strokeWidth={2 * k}
            />
          )}
        </svg>
        {dica && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-areia shadow"
            style={{ left: Math.max(60, dica.x), top: Math.max(30, dica.y - 6) }}
          >
            {dica.m.m.nome} ({dica.m.m.uf})
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button type="button" className={botao} onClick={() => zoom(0.6)} aria-label="Aproximar">
            <Plus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={botao}
            onClick={() => zoom(1 / 0.6)}
            aria-label="Afastar"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={botao}
            onClick={() => cheia && setVista(cheia)}
            aria-label="Ver o Nordeste todo"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={botao}
            onClick={localizar}
            aria-label="Usar minha localização"
          >
            <LocateFixed className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-muted-foreground">
        {aviso}
      </p>
      {sel && (
        <div className="mt-2 rounded-lg border border-border bg-card p-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-lg font-bold">
              {sel.nome} ({sel.uf})
            </h5>
            {infoNivel && (
              <span
                className="rounded-full border border-ink px-2.5 py-0.5 text-xs font-bold text-ink"
                style={{ background: infoNivel.cor }}
              >
                {infoNivel.rotulo}
              </span>
            )}
          </div>
          {sel.pessoal ? (
            <p className="mt-2 text-sm">
              Despesa com pessoal do Executivo: <strong>{pct(sel.pessoal.percentual)}</strong> da
              receita corrente líquida ajustada. Limite máximo da LRF: {pct(sel.pessoal.limite)}
              {sel.pessoal.prudencial !== null && <>; prudencial: {pct(sel.pessoal.prudencial)}</>}
              {sel.pessoal.alerta !== null && <>; alerta: {pct(sel.pessoal.alerta)}</>}.
            </p>
          ) : (
            <p className="mt-2 text-sm">Sem dados de pessoal para este município no período.</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Valores informados pela prefeitura ao Tesouro Nacional (SICONFI, exercício {exercicio}).
            Indício automático, não é acusação.
          </p>
          {!infoNivel && sel.pessoal && (
            <p className="mt-1 text-sm text-muted-foreground">
              Este município não passou dos limites e por isso não tem bandeira no mapa.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="#contas-cidade"
              onClick={(e) => {
                if (descerParaContas()) e.preventDefault();
              }}
              className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-1 text-xs font-bold text-areia transition-colors hover:bg-primary"
            >
              Ver as contas de {sel.nome}
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </a>
            {selCoord && (
              <a
                className="text-sm font-semibold underline"
                href={`https://www.openstreetmap.org/?mlat=${selCoord[0]}&mlon=${selCoord[1]}#map=11/${selCoord[0]}/${selCoord[1]}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver no OpenStreetMap
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
