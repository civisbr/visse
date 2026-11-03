import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ARQUIVOS_DADOS, avaliarSanidade } from "./sanidade-regras";

// Compara os arquivos coletados com os da main. No workflow o commit dos dados já existe, então BASE_REF aponta para o pai dele.
// Saída 1 = não publicar sozinho.
const BASE = process.env["BASE_REF"] ?? "HEAD";
const lerAntes = (arq: string): string | null => {
  try {
    return execFileSync("git", ["show", `${BASE}:public/data/${arq}.json`], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

const motivos: string[] = [];
for (const arq of ARQUIVOS_DADOS) {
  const caminho = new URL(`../../public/data/${arq}.json`, import.meta.url);
  const depois = existsSync(caminho) ? readFileSync(caminho, "utf8") : null;
  const antes = lerAntes(arq);
  if (depois === antes) continue;
  try {
    motivos.push(
      ...avaliarSanidade(
        arq,
        antes === null ? null : JSON.parse(antes),
        depois === null ? null : JSON.parse(depois),
      ),
    );
  } catch {
    motivos.push(`${arq}.json inválido (o novo ou o da main)`);
  }
}

if (motivos.length > 0) {
  for (const m of motivos) console.log(`::error::${m}`);
  process.exit(1);
}
console.log("Variação dentro do esperado");
