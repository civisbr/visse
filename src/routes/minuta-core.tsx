import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage, meta } from "@/components/ProjectPage";
import { DenunciaButton } from "@/components/DenunciaButton";
import { ouvidorias, type Denuncia } from "@/lib/minuta";

export const Route = createFileRoute("/minuta-core")({
  head: () => meta("Minuta Core — Módulo de denúncias em PDF do Visse?", "Módulo que roda no navegador e transforma alertas em minutas formais de denúncia ao Ministério Público."),
  component: Page,
});

const exemplo: Denuncia = {
  orgaoAlvo: "Prefeitura Municipal de Exemplópolis",
  tipoAnomalia: "Licitação com Concorrente Único e Empresa Recém-Criada",
  dadosConcretos: { licitacaoNum: "Pregão Eletrônico 012/2026", valorTotal: "R$ 450.000,00", cnpjVencedor: "12.345.678/0001-99", dataAberturaCNPJ: "15/01/2026" },
  fundamentacaoLegal: ["Art. 37, XXI da CF/88", "Lei 14.133/2021"],
};

function Page() {
  return (
    <ProjectPage
      titulo="Denúncia segura"
      subtitulo="Seu nome fica só no seu celular. Ninguém do Visse? vê seus dados."
      objetivo="É o botão “Denunciar” que aparece no site todo. Ele cria o documento na hora, direto no seu aparelho."
      passos={["Toque em “Denunciar”", "Diga seu nome e cidade", "O documento é baixado na hora"]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xl font-bold">Teste agora</h3>
          <p className="mt-2 text-muted-foreground">Veja como fica um documento de exemplo sobre uma compra suspeita.</p>
          <div className="mt-4"><DenunciaButton denuncia={exemplo} label="Ver documento de exemplo" /></div>
        </div>
        <div>
          <h3 className="text-xl font-bold">Por que é seguro</h3>
          <ul className="mt-3 space-y-2 text-lg">
            <li>🔒 Seus dados não saem do aparelho</li>
            <li>⚖️ Texto escrito do jeito que a lei pede</li>
            <li>⚡ Pronto em segundos</li>
          </ul>
          <h3 className="mt-6 text-xl font-bold">Para onde enviar</h3>
          <div className="mt-2 flex flex-wrap gap-2">{Object.values(ouvidorias).map((o) => <span key={o.nome} className="rounded-full border-2 border-ink px-3 py-0.5 text-xs font-semibold">{o.nome}</span>)}</div>
        </div>
      </div>
    </ProjectPage>
  );
}
