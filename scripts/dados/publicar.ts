import type { DadosCnpj } from "./cnpj";
import { pareceCpfNoNome, type Alerta } from "./regras";

export type Descartes = {
  cpfNoObjeto: number;
  semVerificacao: number;
  pessoaFisica: number;
  acimaDoLimite: number;
};

// Só quem vai a público passa por aqui. Sem resposta confiável da BrasilAPI não dá para
// afastar que o fornecedor seja pessoa física, então o alerta fica de fora.
export async function filtrarPublicaveis(
  alertas: Alerta[],
  consulta: (cnpj: string) => Promise<DadosCnpj>,
  maximo: number,
): Promise<{ publicaveis: Alerta[]; descartes: Descartes }> {
  const publicaveis: Alerta[] = [];
  const descartes: Descartes = {
    cpfNoObjeto: 0,
    semVerificacao: 0,
    pessoaFisica: 0,
    acimaDoLimite: 0,
  };
  for (const a of alertas) {
    if (publicaveis.length >= maximo) {
      descartes.acimaDoLimite++;
      continue;
    }
    if (pareceCpfNoNome(a.contrato.objeto)) {
      descartes.cpfNoObjeto++;
      continue;
    }
    const d = await consulta(a.contrato.cnpj);
    if (!d.verificado) {
      descartes.semVerificacao++;
      continue;
    }
    if (d.pessoaFisica) {
      descartes.pessoaFisica++;
      continue;
    }
    publicaveis.push(a);
  }
  return { publicaveis, descartes };
}
