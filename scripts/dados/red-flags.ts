import { mkdir, writeFile } from "node:fs/promises";
import { consultaCnpj, falhasCnpj } from "./cnpj";
import { contratosNordeste } from "./pncp";
import { aditivoAlto, empresaRecente, pareceCpfNoNome, type Alerta } from "./regras";

const DIAS = Number(process.env["DIAS"] ?? 14);
const MAX_CNPJ = Number(process.env["MAX_CNPJ"] ?? 400);
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
for (const c of candidatos) {
  const a = empresaRecente(c, (await consultaCnpj(c.cnpj)).abertura);
  if (a) alertas.push(a);
}

const falhas = Object.values(falhasCnpj).reduce((a, b) => a + b, 0);
// Falha silenciosa da BrasilAPI viraria "sem alerta"; acima de 10% o resultado não é confiável.
if (falhas > candidatos.length * 0.1)
  throw new Error(`${falhas} de ${candidatos.length} consultas de CNPJ falharam`);
if (falhas > 0) console.log(`::warning::${falhas} consultas de CNPJ falharam`, falhasCnpj);
console.log(
  `CNPJ: ${candidatos.length} consultados, ${elegiveis.length - candidatos.length} cortados por MAX_CNPJ`,
);

alertas.sort((a, b) => b.prioridade - a.prioridade);
// Só quem vai a público passa pela checagem de pessoa física; o texto livre do objeto também não pode trazer CPF.
const publicaveis: Alerta[] = [];
for (const a of alertas) {
  if (publicaveis.length >= MAX_ALERTAS) break;
  if (pareceCpfNoNome(a.contrato.objeto)) continue;
  if ((await consultaCnpj(a.contrato.cnpj)).pessoaFisica) continue;
  publicaveis.push(a);
}
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
      alertas: publicaveis,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${publicaveis.length} alertas gravados (${alertas.length} no total)`);
