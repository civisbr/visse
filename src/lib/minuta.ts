export const ouvidorias = {
  MPF: { nome: "Ouvidoria do MPF", url: "https://www.mpf.mp.br/mpfservicos" },
  BA: { nome: "MP da Bahia", url: "https://www.mpba.mp.br/ouvidoria" },
  PE: { nome: "MP de Pernambuco", url: "https://www.mppe.mp.br/ouvidoria" },
  CE: { nome: "MP do Ceará", url: "https://www.mpce.mp.br/ouvidoria" },
  PB: { nome: "MP da Paraíba", url: "https://www.mppb.mp.br/ouvidoria" },
  RN: { nome: "MP do Rio Grande do Norte", url: "https://www.mprn.mp.br/ouvidoria" },
  AL: { nome: "MP de Alagoas", url: "https://www.mpal.mp.br/ouvidoria" },
  SE: { nome: "MP de Sergipe", url: "https://www.mpse.mp.br/ouvidoria" },
  PI: { nome: "MP do Piauí", url: "https://www.mppi.mp.br/ouvidoria" },
  MA: { nome: "MP do Maranhão", url: "https://www.mpma.mp.br/ouvidoria" },
} as const;
export type UF = keyof typeof ouvidorias;

export type Denuncia = {
  orgaoAlvo: string;
  tipoAnomalia: string;
  dadosConcretos: Record<string, string>;
  fundamentacaoLegal: string[];
  fatos?: string;
};

export type Denunciante = { nome: string; cidade: string };

const rotulo = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Gera o texto da minuta (puro, testável). */
export function montarTexto(d: Denuncia, p: Denunciante): string[] {
  const dados = Object.entries(d.dadosConcretos)
    .filter(([, v]) => v)
    .map(([k, v]) => `• ${rotulo(k)}: ${v}`);
  return [
    "EXCELENTÍSSIMO(A) SENHOR(A) PROMOTOR(A) / PROCURADOR(A) DO MINISTÉRIO PÚBLICO",
    "",
    `${p.nome}, cidadão(ã) residente em ${p.cidade}, no exercício do direito de petição (Art. 5º, XXXIV, "a", da CF/88), vem respeitosamente apresentar a presente REPRESENTAÇÃO em face de ${d.orgaoAlvo}, pelos fatos e fundamentos a seguir expostos.`,
    "",
    "I. DOS FATOS",
    `Foi identificada possível irregularidade do tipo: ${d.tipoAnomalia}.`,
    ...(d.fatos ? [d.fatos] : []),
    ...dados,
    "",
    "II. DOS FUNDAMENTOS",
    `Os fatos acima podem afrontar os princípios da legalidade, impessoalidade, moralidade, publicidade e eficiência (Art. 37 da CF/88), bem como: ${d.fundamentacaoLegal.join("; ")}.`,
    "",
    "III. DOS PEDIDOS",
    "a) O recebimento e autuação desta representação;",
    "b) A instauração de procedimento para apuração dos fatos;",
    "c) A requisição de documentos ao órgão representado, nos termos da Lei nº 12.527/2011 (LAI);",
    "d) A adoção das medidas cabíveis caso confirmadas as irregularidades.",
    "",
    `${p.cidade}, ${new Date().toLocaleDateString("pt-BR")}.`,
    "",
    "_______________________________",
    p.nome,
  ];
}

/** CivisMinuta.gerarDenuncia — roda 100% no navegador. */
export async function gerarDenuncia(d: Denuncia, p: Denunciante) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margem = 25;
  const largura = 210 - margem * 2;
  let y = 30;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  for (const linha of montarTexto(d, p)) {
    const bold = /^(EXCELENT|I\.|II\.|III\.)/.test(linha);
    doc.setFont("times", bold ? "bold" : "normal");
    const partes = doc.splitTextToSize(linha || " ", largura);
    for (const parte of partes) {
      if (y > 270) { doc.addPage(); y = 25; }
      doc.text(parte, margem, y, { align: "left" });
      y += 6.5;
    }
  }
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${total} — gerado no navegador pelo Visse?`, 105, 287, { align: "center" });
  }
  doc.save(`representacao-civisbr-${Date.now()}.pdf`);
}
