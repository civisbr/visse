import { useRef, useState } from "react";
import { cartas, type Carta } from "@/lib/projects";
import { DenunciaButton } from "./DenunciaButton";
import { Button } from "@/components/ui/button";
import { X, Megaphone, MapPin, Check, HardHat, Utensils, Hospital, Route } from "lucide-react";
import obraExemplo from "@/assets/obra-exemplo.jpg";

const caseIcons = [HardHat, Utensils, Hospital, Route];

export function SwipeDeck() {
  const [i, setI] = useState(0);
  const [cobrar, setCobrar] = useState<Carta[]>([]);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const atual = cartas[i];

  const decidir = (sim: boolean) => {
    if (!atual) return;
    if (sim) setCobrar((c) => [...c, atual]);
    setDx(0);
    setI((n) => n + 1);
  };

  if (!atual)
    return (
      <div className="pop animate-pop-in mx-auto max-w-lg rounded-xl bg-card p-6 text-center">
        <Check className="mx-auto size-10 text-leaf" aria-hidden="true" />
        <h3 className="mt-2 text-2xl font-black">Você viu tudo!</h3>
        <p className="mt-1 text-muted-foreground">
          {cobrar.length
            ? `Você quer cobrar ${cobrar.length} problema(s). Toque para denunciar:`
            : "Nenhum problema escolhido."}
        </p>
        <div className="mt-4 space-y-2">
          {cobrar.map((c) => (
            <div
              key={c.titulo}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2 text-left text-sm font-bold"
            >
              <span>{c.titulo}</span>
              <DenunciaButton
                label="Cobrar"
                denuncia={{
                  orgaoAlvo: c.orgao,
                  tipoAnomalia: c.tipo,
                  dadosConcretos: c.dados,
                  fundamentacaoLegal: ["Art. 37 da CF/88", "Lei nº 14.133/2021"],
                }}
              />
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => {
            setI(0);
            setCobrar([]);
          }}
        >
          Ver de novo
        </Button>
      </div>
    );

  const Icon = caseIcons[i] ?? HardHat;
  return (
    <div className="mx-auto max-w-xl select-none">
      <div className="relative h-[31rem] md:h-[33rem]">
        {cartas[i + 1] && (
          <div className="absolute inset-0 translate-y-2.5 scale-[.97] rounded-xl border border-border bg-secondary" />
        )}
        <div
          key={i}
          className="pop animate-pop-in absolute inset-0 flex touch-pan-y flex-col overflow-hidden rounded-xl bg-card"
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 15}deg)`,
            transition: start.current === null ? "transform .25s" : "none",
          }}
          onPointerDown={(e) => {
            start.current = e.clientX;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
          onPointerUp={() => {
            start.current = null;
            if (dx > 100) decidir(true);
            else if (dx < -100) decidir(false);
            else setDx(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDx(0);
          }}
        >
          <div className="relative h-52 shrink-0 overflow-hidden bg-secondary md:h-60">
            {i === 0 ? (
              <img
                src={obraExemplo}
                alt="Ilustração de uma escola em construção; não é foto do caso"
                width={1536}
                height={1024}
                className="size-full object-cover"
              />
            ) : (
              <div className={`flex size-full items-center justify-center ${atual.cor}`}>
                <Icon className="size-20 text-ink" strokeWidth={1} aria-hidden="true" />
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-ink">
              {i === 0 ? "Imagem ilustrativa · caso fictício" : "Caso fictício"}
            </span>
          </div>
          {dx > 40 && (
            <span className="absolute left-4 top-16 -rotate-12 rounded-lg border-4 border-leaf bg-card px-3 py-1 text-xl font-black text-leaf">
              COBRAR!
            </span>
          )}
          {dx < -40 && (
            <span className="absolute right-4 top-16 rotate-12 rounded-lg border-4 border-coral bg-card px-3 py-1 text-xl font-black text-coral">
              PULAR
            </span>
          )}
          <div className="flex flex-1 flex-col p-5 md:p-6">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              {atual.cidade}
            </span>
            <h3 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{atual.titulo}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{atual.texto}</p>
            <span className="mt-auto border-t border-border pt-3 text-xl font-bold tabular-nums text-primary">
              {atual.valor}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          aria-label="Pular"
          onClick={() => decidir(false)}
          className="h-12 px-5"
        >
          <X aria-hidden="true" />
          Pular
        </Button>
        <span className="text-xs font-semibold text-muted-foreground">
          {i + 1} / {cartas.length}
        </span>
        <Button aria-label="Quero cobrar" onClick={() => decidir(true)} className="h-12 px-5">
          <Megaphone aria-hidden="true" />
          Quero cobrar
        </Button>
      </div>
    </div>
  );
}
