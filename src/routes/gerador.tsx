import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { OndeEnviar } from "@/components/OndeEnviar";
import { gerarDenuncia } from "@/lib/minuta";
import { ESTADOS, type UF } from "@/lib/ouvidorias";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gerador")({
  head: () =>
    meta(
      "Faça sua denúncia — Visse?",
      "Preencha um formulário simples, baixe a representação pronta e veja para onde enviar ao Ministério Público do seu estado.",
    ),
  component: Page,
});

const tipos = [
  "Compra ou contrato suspeito",
  "Obra parada ou malfeita",
  "Falta remédio ou material no posto",
  "Prefeitura não informa os gastos",
  "Outro",
];

type Form = {
  nome: string;
  cidade: string;
  uf: Exclude<UF, "MPF">;
  orgao: string;
  tipo: string;
  contrato: string;
  fatos: string;
  link: string;
};

function Page() {
  const [f, setF] = useState<Form>({
    nome: "",
    cidade: "",
    uf: "BA",
    orgao: "",
    tipo: tipos[0] as string,
    contrato: "",
    fatos: "",
    link: "",
  });
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState(false);
  const destino = useRef<HTMLElement>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value } as Form);
  return (
    <ProjectPage
      titulo="Faça sua denúncia"
      subtitulo="Viu algo errado na sua cidade? Preencha, baixe o documento e envie. Sem advogado, sem custo."
      objetivo="Você tem o direito de cobrar. A gente monta o papel certinho e mostra para onde mandar. Seus dados ficam só no seu aparelho."
      passos={["Conte o que aconteceu", "Baixe o documento pronto", "Envie ao Ministério Público"]}
    >
      <h3 className="text-xl font-bold">1. Conte o que aconteceu</h3>
      <form
        className="mt-4 grid gap-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(false);
          try {
            await gerarDenuncia(
              {
                orgaoAlvo: f.orgao,
                tipoAnomalia: f.tipo,
                fatos: f.fatos,
                dadosConcretos: { contratoOuEmpenho: f.contrato, linkDaProva: f.link },
                fundamentacaoLegal: [
                  "Art. 37 da CF/88",
                  "Lei nº 4.717/1965 (Ação Popular)",
                  "Lei nº 8.429/1992 (Improbidade Administrativa)",
                ],
              },
              { nome: f.nome, cidade: `${f.cidade}/${f.uf}` },
            );
          } catch {
            setOk(false);
            setErro(true);
            return;
          }
          setOk(true);
          const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          destino.current?.scrollIntoView({
            behavior: reduzido ? "auto" : "smooth",
            block: "start",
          });
        }}
      >
        <input
          required
          className="field"
          placeholder="Seu nome completo"
          aria-label="Seu nome completo"
          value={f.nome}
          onChange={set("nome")}
        />
        <div className="flex gap-2">
          <input
            required
            className="field"
            placeholder="Município"
            aria-label="Município"
            value={f.cidade}
            onChange={set("cidade")}
          />
          <select className="field w-28" aria-label="Estado" value={f.uf} onChange={set("uf")}>
            {ESTADOS.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.uf}
              </option>
            ))}
          </select>
        </div>
        <input
          required
          className="field"
          placeholder="Quem fez errado? (ex: Prefeitura de ...)"
          aria-label="Quem fez errado"
          value={f.orgao}
          onChange={set("orgao")}
        />
        <select
          className="field"
          aria-label="Tipo de problema"
          value={f.tipo}
          onChange={set("tipo")}
        >
          {tipos.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          className="field"
          placeholder="Número do contrato (se souber)"
          aria-label="Número do contrato"
          value={f.contrato}
          onChange={set("contrato")}
        />
        <input
          className="field"
          placeholder="Link de uma prova (se tiver)"
          aria-label="Link de uma prova"
          value={f.link}
          onChange={set("link")}
        />
        <textarea
          required
          rows={4}
          className="field md:col-span-2"
          placeholder="Conte o que aconteceu, do seu jeito"
          aria-label="O que aconteceu"
          value={f.fatos}
          onChange={set("fatos")}
        />
        <div className="md:col-span-2">
          <Button type="submit" className="h-11">
            <Download />
            Baixar minha denúncia
          </Button>
        </div>
      </form>

      <section
        id="onde-enviar"
        ref={destino}
        className="mt-12 scroll-mt-24 border-t border-border pt-8"
        aria-labelledby="titulo-onde-enviar"
      >
        <h3 id="titulo-onde-enviar" className="text-xl font-bold">
          2. Envie ao Ministério Público
        </h3>
        <p
          role="status"
          className={`mt-2 ${erro ? "font-semibold text-destructive" : ok ? "font-semibold text-ink" : "text-muted-foreground"}`}
        >
          {erro
            ? "Não foi possível gerar o documento. Confira os campos e tente de novo."
            : ok
              ? "Documento baixado. Agora protocole com um dos canais abaixo."
              : "Depois de baixar o documento, protocole com um dos canais abaixo."}
        </p>
        <div className="mt-5">
          <OndeEnviar uf={f.uf} onUf={(uf) => setF({ ...f, uf })} />
        </div>
      </section>
    </ProjectPage>
  );
}
