import { Link } from "@tanstack/react-router";
import { ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import { CONFERIDO_EM, ESTADOS, ouvidoriasMP, type CanalMP, type UF } from "@/lib/ouvidorias";

const AVISAR =
  "https://github.com/civisbr/visse/issues/new?title=Contato%20de%20ouvidoria%20desatualizado";
const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const link = "font-semibold underline underline-offset-2 hover:text-primary";

function Cartao({ c, destaque }: { c: CanalMP; destaque?: boolean }) {
  return (
    <section
      className={`rounded-lg border bg-card p-5 ${destaque ? "border-ink shadow-[var(--shadow-pop)]" : "border-border"}`}
    >
      <h4 className="text-xl font-bold">
        {c.nome} <span className="text-base font-semibold text-muted-foreground">({c.sigla})</span>
      </h4>
      {c.nota && <p className="mt-2 text-sm text-muted-foreground">{c.nota}</p>}
      <ul className="mt-4 space-y-3 text-sm">
        {c.formulario && (
          <li>
            <a
              href={c.formulario}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-bold text-areia transition-colors hover:bg-primary"
            >
              Registrar online
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only"> no {c.sigla} (abre em nova aba)</span>
            </a>
            {c.exigeGovBr && (
              <span className="mt-1 block text-muted-foreground">Pede conta gov.br.</span>
            )}
          </li>
        )}
        {c.telefones.map((t) => (
          <li key={t.tel} className="flex items-start gap-2">
            <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <a href={`tel:${t.tel}`} className={link}>
                {t.exibido}
              </a>
              <span className="block text-muted-foreground">{t.rotulo}</span>
            </span>
          </li>
        ))}
        {c.whatsapp && (
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <a
                href={`https://wa.me/${c.whatsapp.numero}`}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                {c.whatsapp.exibido}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
              <span className="block text-muted-foreground">WhatsApp da ouvidoria</span>
            </span>
          </li>
        )}
        <li className="flex items-start gap-2">
          <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <a href={`mailto:${c.email}`} className={link}>
              {c.email}
            </a>
          </span>
        </li>
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">{c.horario}</p>
      <p className="mt-2 text-sm">
        <a href={c.pagina} target="_blank" rel="noopener noreferrer" className={link}>
          Página da ouvidoria no site do {c.sigla}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </p>
    </section>
  );
}

type UFEstado = Exclude<UF, "MPF">;

export function OndeEnviar({ uf, onUf }: { uf: UFEstado; onUf: (uf: UFEstado) => void }) {
  return (
    <div>
      <div className="max-w-sm rounded-lg border border-border bg-secondary p-4">
        <label htmlFor="estado-mp" className="mb-2 block text-sm font-bold">
          Ministério Público de qual estado?
        </label>
        <select
          id="estado-mp"
          className="field w-full"
          value={uf}
          onChange={(e) => onUf(e.target.value as UFEstado)}
        >
          {ESTADOS.map((e) => (
            <option key={e.uf} value={e.uf}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Cartao c={ouvidoriasMP[uf]} destaque />
        <Cartao c={ouvidoriasMP.MPF} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Contatos conferidos nos sites oficiais em {dataBr(CONFERIDO_EM)}. Se algum não funcionar,
        use a página da ouvidoria e{" "}
        <a href={AVISAR} target="_blank" rel="noopener noreferrer" className="underline">
          avise que o contato está errado
        </a>
        . Seu nome e seus dados ficam só no seu aparelho:{" "}
        <Link to="/privacidade" className="underline">
          veja a política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
