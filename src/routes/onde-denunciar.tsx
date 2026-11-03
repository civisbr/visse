import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { CONFERIDO_EM, ouvidoriasMP, type CanalMP, type UF } from "@/lib/ouvidorias";

export const Route = createFileRoute("/onde-denunciar")({
  head: () =>
    meta(
      "Onde denunciar — Visse?",
      "Site, telefone e e-mail da ouvidoria do Ministério Público de cada estado do Nordeste e do MPF.",
    ),
  component: Page,
});

export const ESTADOS: { uf: UF; nome: string }[] = [
  { uf: "AL", nome: "Alagoas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "SE", nome: "Sergipe" },
];

const AVISAR =
  "https://github.com/civisbr/visse/issues/new?title=Contato%20de%20ouvidoria%20desatualizado";
const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const link = "font-semibold underline underline-offset-2 hover:text-primary";

function Cartao({ c, destaque }: { c: CanalMP; destaque?: boolean }) {
  return (
    <section
      className={`rounded-lg border bg-card p-5 ${destaque ? "border-ink shadow-[var(--shadow-pop)]" : "border-border"}`}
    >
      <h3 className="text-xl font-bold">
        {c.nome} <span className="text-base font-semibold text-muted-foreground">({c.sigla})</span>
      </h3>
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

function Page() {
  const [uf, setUf] = useState<UF>("BA");
  return (
    <ProjectPage
      titulo="Onde denunciar"
      subtitulo="Telefone, e-mail e site da ouvidoria do Ministério Público do seu estado."
      objetivo="Com o documento pronto, é aqui que você protocola. Escolha o seu estado. Se o dinheiro for federal, use também o MPF."
      passos={[
        "Prepare o documento em “Faça sua denúncia”",
        "Escolha o seu estado aqui",
        "Registre online, ligue ou escreva",
      ]}
    >
      <div className="text-sm font-bold">
        <label htmlFor="estado-mp">Seu estado</label>
        <select
          id="estado-mp"
          className="field mt-1 max-w-xs"
          value={uf}
          onChange={(e) => setUf(e.target.value as UF)}
        >
          {ESTADOS.map((e) => (
            <option key={e.uf} value={e.uf}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Cartao c={ouvidoriasMP[uf]} destaque />
        <Cartao c={ouvidoriasMP.MPF} />
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        Contatos conferidos nos sites oficiais em {dataBr(CONFERIDO_EM)}. Se algum não funcionar,
        use a página da ouvidoria. Seu nome e seus dados ficam só no seu aparelho:{" "}
        <Link to="/privacidade" className="underline">
          veja a política de privacidade
        </Link>
        .
      </p>
    </ProjectPage>
  );
}
