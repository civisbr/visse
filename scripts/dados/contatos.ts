import { appendFile } from "node:fs/promises";
import { CONFERIDO_EM, ouvidoriasMP, type CanalMP } from "../../src/lib/ouvidorias";
import { classificarErro, classificarStatus, diasDesde, type Veredito } from "./contatos-regras";

const LIMITE_DIAS = 90;
const HEADERS = {
  "user-agent": "visse-dados/1.0 (+https://github.com/civisbr/visse)",
  accept: "text/html,*/*",
};

const canais: CanalMP[] = Object.values(ouvidoriasMP);
const alvos = canais.flatMap((o) =>
  [o.pagina, o.formulario]
    .filter((u): u is string => Boolean(u))
    .map((url) => ({ sigla: o.sigla, url })),
);

// O detalhe vai para o log do runner e para uma tabela Markdown: "::" abriria comando de workflow e "|" quebraria a tabela.
const limpar = (t: string) =>
  t
    .replace(/[\r\n|]+/g, " ")
    .replace(/::/g, ": :")
    .slice(0, 120);

async function testar(url: string): Promise<{ veredito: Veredito; detalhe: string }> {
  try {
    const r = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    await r.body?.cancel();
    return { veredito: classificarStatus(r.status), detalhe: `HTTP ${r.status}` };
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    const causa = err?.code ?? err?.cause?.code;
    return { veredito: classificarErro(e), detalhe: limpar(causa ?? String(e)) };
  }
}

const resultados = [];
for (const a of alvos) resultados.push({ ...a, ...(await testar(a.url)) });

const idade = diasDesde(CONFERIDO_EM, new Date());
const vencido = idade > LIMITE_DIAS;
const quebrados = resultados.filter((r) => r.veredito === "quebrado");
const inconclusivos = resultados.filter((r) => r.veredito === "inconclusivo");

const linhas = [
  "### Conferência dos contatos do Ministério Público",
  "",
  `Última conferência manual: ${CONFERIDO_EM} (${idade} dias${vencido ? `, acima de ${LIMITE_DIAS}` : ""}).`,
  "",
  "| Órgão | Endereço | Resultado |",
  "| --- | --- | --- |",
  ...resultados.map((r) => `| ${r.sigla} | ${r.url} | ${r.veredito} (${r.detalhe}) |`),
  "",
  "Telefones, e-mails e WhatsApp não são verificáveis por robô; confira nos sites oficiais e atualize `CONFERIDO_EM` em `src/lib/ouvidorias.ts`.",
];
const texto = linhas.join("\n") + "\n";
console.log(texto);
const resumo = process.env["GITHUB_STEP_SUMMARY"];
if (resumo) await appendFile(resumo, texto);
if (inconclusivos.length > 0)
  console.log(`::warning::${inconclusivos.length} endereço(s) sem resposta conclusiva`);
// Se a maioria deixa de responder, o robô provavelmente foi bloqueado e a conferência perdeu o sentido.
const maioriaMuda = inconclusivos.length > alvos.length / 2;
if (maioriaMuda) console.log("::error::A maioria dos endereços não respondeu de forma conclusiva");
if (quebrados.length > 0 || vencido || maioriaMuda) process.exitCode = 1;
