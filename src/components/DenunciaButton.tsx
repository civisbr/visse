import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { gerarDenuncia, ouvidorias, type Denuncia } from "@/lib/minuta";
import { Button } from "@/components/ui/button";
import { Download, Megaphone, CheckCircle } from "lucide-react";

export function DenunciaButton({
  denuncia,
  label = "Denunciar ao MP",
  confirmar,
}: {
  denuncia: Denuncia;
  label?: string;
  confirmar?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [feito, setFeito] = useState(false);
  const [conferi, setConferi] = useState(false);

  return (
    <>
      <Button
        className="whitespace-normal text-sm"
        onClick={() => {
          setAberto(true);
          setFeito(false);
          setConferi(false);
        }}
      >
        <Megaphone /> {label}
      </Button>
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Preparar denúncia"
            className="pop max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!feito ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await gerarDenuncia(denuncia, { nome, cidade });
                  setFeito(true);
                }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-bold">Prepare sua denúncia</h3>
                <p className="text-sm text-muted-foreground">
                  Seus dados ficam só no seu navegador. Nada é enviado para nós.
                </p>
                <input
                  required
                  className="field"
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <input
                  required
                  className="field"
                  placeholder="Sua cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
                {confirmar && (
                  <label className="flex items-start gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      required
                      className="mt-0.5 h-5 w-5 accent-[var(--coral)]"
                      checked={conferi}
                      onChange={(e) => setConferi(e.target.checked)}
                    />
                    {confirmar}
                  </label>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Download />
                    Baixar PDF
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-2xl font-bold">
                  <CheckCircle className="text-leaf" /> PDF baixado!
                </h3>
                <p className="text-sm">Agora protocole na ouvidoria:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ouvidorias).map(([k, o]) => (
                    <a
                      key={k}
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border-2 border-ink px-3 py-2 text-sm font-semibold hover:bg-sun"
                    >
                      {o.nome}
                    </a>
                  ))}
                </div>
                <p className="text-sm">
                  Telefone, e-mail e horário de cada ouvidoria:{" "}
                  <Link to="/gerador" hash="onde-enviar" className="font-semibold underline">
                    veja os canais de envio
                  </Link>
                  .
                </p>
                <Button variant="outline" onClick={() => setAberto(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
