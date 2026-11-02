import { mkdir, writeFile } from "node:fs/promises";
import { consultaCnpj, falhasCnpj } from "./cnpj";
import { contratosNordeste } from "./pncp";
import { filtrarPublicaveis } from "./publicar";
import { aditivoAlto, empresaRecente, type Alerta } from "./regras";

const DIAS = Number(process.env["DIAS"] ?? 30);
const MAX_CNPJ = Number(process.env["MAX_CNPJ"] ?? 3000);
if (!Number.isInteger(DIAS) || DIAS < 1 || DIAS > 60)
  throw new Error("DIAS deve ser inteiro entre 1 e 60");
if (!Number.isInteger(MAX_CNPJ) || MAX_CNPJ < 0) throw new Error("MAX_CNPJ inválido");

const { contratos, descartados, excluidosPessoaFisica } = await contratosNordeste(DIAS);
console.log(
  `${contratos.length} contratos (descartados ${descartados}, pessoa física excluída ${excluidosPessoaFisica})`,
);
// Resposta vazia vira falha do job; do contrário um PNCP degradado sobrescreveria o JSON público com zero alertas.
if (contratos.length === 0) throw new Error("Nenhum contrato coletado; abortando sem gravar");

const alertas: Alerta[] = contratos.flatMap((c) => aditivoAlto(c) ?? []);
const MAX_ALERTAS = 50;

// A BrasilAPI limita a taxa; consulta só quem passa o corte de valor, do maior para o menor.
const elegiveis = contratos
  .filter((c) => c.valorInicial >= 100_000)
  .sort((a, b) => b.valorInicial - a.valorInicial);
const candidatos = elegiveis.slice(0, MAX_CNPJ);
let excluidosConsorcio = 0;
const falhasAteAgora = () => Object.values(falhasCnpj).reduce((a, b) => a + b, 0);
for (const [i, c] of candidatos.entries()) {
  // BrasilAPI degradada: abortar cedo em vez de insistir até o timeout do job.
  if (i >= 100 && i % 50 === 0 && falhasAteAgora() > i * 0.1)
    throw new Error(`${falhasAteAgora()} falhas de CNPJ em ${i} consultas; abortando`);
  const d = await consultaCnpj(c.cnpj);
  if (d.consorcio) {
    excluidosConsorcio++;
    continue;
  }
  const a = empresaRecente(c, d.abertura);
  if (a) alertas.push(a);
}

const falhas = falhasAteAgora();
const cnpjsUnicos = new Set(candidatos.map((c) => c.cnpj)).size;
// Falha silenciosa da BrasilAPI viraria "sem alerta"; acima de 10% o resultado não é confiável.
if (falhas > cnpjsUnicos * 0.1)
  throw new Error(`${falhas} de ${cnpjsUnicos} CNPJs sem consulta válida`);
if (falhas > 0) console.log(`::warning::${falhas} consultas de CNPJ falharam`, falhasCnpj);
console.log(
  `CNPJ: ${candidatos.length} consultados, ${elegiveis.length - candidatos.length} cortados por MAX_CNPJ, ${excluidosConsorcio} consórcios fora da regra de empresa recente`,
);

alertas.sort((a, b) => b.prioridade - a.prioridade);
const { publicaveis, descartes: porMotivo } = await filtrarPublicaveis(
  alertas,
  consultaCnpj,
  MAX_ALERTAS,
);
console.log(
  `Alertas: ${alertas.length} detectados, descartados na publicação ${JSON.stringify(porMotivo)}`,
);
await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/red-flags.json",
  JSON.stringify(
    {
      aviso:
        "Indicador estatístico automático sobre dados abertos. Não indica irregularidade nem culpa; serve apenas para priorizar conferência nas fontes oficiais.",
      fonte: "PNCP (pncp.gov.br) e BrasilAPI (CNPJ)",
      geradoEm: new Date().toISOString(),
      janelaDias: DIAS,
      analisados: contratos.length,
      cnpjConsultados: candidatos.length,
      cnpjCortados: elegiveis.length - candidatos.length,
      cnpjFalhas: falhas,
      alertasTotal: alertas.length,
      alertasDescartados: porMotivo,
      alertas: publicaveis,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${publicaveis.length} alertas gravados (${alertas.length} no total)`);
