import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { gerarDenuncia, ouvidorias, type UF } from "@/lib/minuta";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/gerador")({
  head: () => meta("Gerador de Representações Cívicas — Visse?", "Preencha um formulário simples e baixe uma representação formal pronta para o Ministério Público ou TCE."),
  component: Page,
});

const tipos = ["Compra ou contrato suspeito", "Obra parada ou malfeita", "Falta remédio ou material no posto", "Prefeitura não informa os gastos", "Outro"];

function Page() {
  const [f, setF] = useState<{ nome: string; cidade: string; uf: UF; orgao: string; tipo: string; contrato: string; fatos: string; link: string }>({ nome: "", cidade: "", uf: "BA", orgao: "", tipo: tipos[0] as string, contrato: "", fatos: "", link: "" });
  const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value } as typeof f);
  return (
    <ProjectPage
      titulo="Faça sua denúncia"
      subtitulo="Viu algo errado na sua cidade? Preencha, baixe o documento e envie. Sem advogado, sem custo."
      objetivo="Você tem o direito de cobrar. A gente monta o papel certinho para você."
      passos={["Conte o que aconteceu", "Baixe o documento pronto", "Envie para o Ministério Público"]}
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        await gerarDenuncia({
          orgaoAlvo: f.orgao, tipoAnomalia: f.tipo, fatos: f.fatos,
          dadosConcretos: { contratoOuEmpenho: f.contrato, linkDaProva: f.link },
          fundamentacaoLegal: ["Art. 37 da CF/88", "Lei nº 4.717/1965 (Ação Popular)", "Lei nº 8.429/1992 (Improbidade Administrativa)"],
        }, { nome: f.nome, cidade: `${f.cidade}/${f.uf}` });
        setOk(true);
      }}>
        <input required className="field" placeholder="Seu nome completo" value={f.nome} onChange={set("nome")} />
        <div className="flex gap-2">
          <input required className="field" placeholder="Município" value={f.cidade} onChange={set("cidade")} />
          <select className="field w-28" value={f.uf} onChange={set("uf")}>{Object.keys(ouvidorias).filter((k) => k !== "MPF").map((k) => <option key={k}>{k}</option>)}</select>
        </div>
        <input required className="field" placeholder="Quem fez errado? (ex: Prefeitura de ...)" value={f.orgao} onChange={set("orgao")} />
        <select className="field" value={f.tipo} onChange={set("tipo")}>{tipos.map((t) => <option key={t}>{t}</option>)}</select>
        <input className="field" placeholder="Número do contrato (se souber)" value={f.contrato} onChange={set("contrato")} />
        <input className="field" placeholder="Link de uma prova (se tiver)" value={f.link} onChange={set("link")} />
        <textarea required rows={4} className="field md:col-span-2" placeholder="Conte o que aconteceu, do seu jeito" value={f.fatos} onChange={set("fatos")} />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit" className="h-11"><Download />Baixar minha denúncia</Button>
          {ok && (
            <>
              <a className="btn bg-sun text-ink" href={ouvidorias[f.uf].url} target="_blank" rel="noreferrer">Enviar ao {ouvidorias[f.uf].nome}</a>
              <a className="btn bg-card" href={ouvidorias.MPF.url} target="_blank" rel="noreferrer">Ouvidoria do MPF</a>
            </>
          )}
        </div>
      </form>
    </ProjectPage>
  );
}
