export type Telefone = { rotulo: string; exibido: string; tel: string };
export type CanalMP = {
  nome: string;
  sigla: string;
  pagina: string;
  formulario?: string;
  telefones: Telefone[];
  whatsapp?: { exibido: string; numero: string };
  email: string;
  horario: string;
  nota?: string;
  // O formulário pede login gov.br; a forma curta usa a página informativa para ninguém cair num login sem aviso.
  exigeGovBr?: true;
};

// Conferido nos sites oficiais de cada Ministério Público; a ouvidoria muda de endereço e de telefone sem aviso.
export const CONFERIDO_EM = "2026-11-03";

const zap = (exibido: string) => ({ exibido, numero: `55${exibido.replace(/\D/g, "")}` });

const fone = (rotulo: string, exibido: string): Telefone => ({
  rotulo,
  exibido,
  tel: exibido.replace(/[^\d]/g, ""),
});

export const ouvidoriasMP = {
  MPF: {
    nome: "Ministério Público Federal",
    sigla: "MPF",
    pagina: "https://www.mpf.mp.br/servicos/denuncias",
    formulario: "https://aplicativos.mpf.mp.br/ouvidoria/app/cidadao/manifestacao/cadastro/2",
    telefones: [
      fone("Ligação gratuita", "0800 000 5640"),
      fone("Informações, de segunda a sexta, das 12h às 18h", "(61) 3105-7070"),
    ],
    email: "ouvidoria@mpf.mp.br",
    horario: "Atendimento presencial em Brasília, de segunda a sexta, das 10h às 17h",
    nota: "Use quando houver dinheiro federal na história (por exemplo, obra paga pelo governo federal).",
    exigeGovBr: true,
  },
  // O site bloqueia leitura automática; os dados vieram da página de ouvidoria aberta no navegador.
  BA: {
    nome: "Ministério Público da Bahia",
    sigla: "MPBA",
    pagina: "https://atendimento.mpba.mp.br/ouvidoria/",
    formulario: "https://tag.sistemas.mpba.mp.br/",
    telefones: [fone("Ligação gratuita", "0800 284 6803"), fone("Ouvidoria", "(71) 3103-0490")],
    email: "ouvidoria@mpba.mp.br",
    horario: "Segunda a sexta, das 8h às 18h",
  },
  // A página oficial lista também (81) 3225-5107 para manifestações, sem dizer qual está em uso; confirmar por telefone.
  PE: {
    nome: "Ministério Público de Pernambuco",
    sigla: "MPPE",
    pagina: "https://portal.mppe.mp.br/ouvidoria",
    formulario: "https://portal.mppe.mp.br/formul%C3%A1rio-de-ouvidoria",
    telefones: [
      fone("Ouvidoria, de segunda a sexta, das 8h às 17h", "(81) 99319-3350"),
      fone("Disque MPPE, de segunda a sexta, das 8h às 14h", "127"),
    ],
    whatsapp: zap("(81) 99679-0221"),
    email: "ouvidoria@mppe.mp.br",
    horario: "Segunda a sexta, das 8h às 17h",
  },
  CE: {
    nome: "Ministério Público do Ceará",
    sigla: "MPCE",
    pagina: "https://mpce.mp.br/institucional/ouvidoria-geral/",
    formulario: "https://mpce.mp.br/institucional/ouvidoria-geral/manifestacoes-online/",
    telefones: [fone("Ouvidoria", "(85) 3106-5352"), fone("Ouvidoria", "(85) 3106-5351")],
    email: "ouvidoria@mpce.mp.br",
    horario: "Segunda a sexta, das 8h às 14h",
  },
  PB: {
    nome: "Ministério Público da Paraíba",
    sigla: "MPPB",
    pagina: "https://www.mppb.mp.br/index.php/pt/servicos/cidadao/ouvidoria",
    telefones: [fone("Ouvidoria", "(83) 2107-6150")],
    whatsapp: zap("(83) 99181-7355"),
    email: "ouvidoria@mppb.mp.br",
    horario: "Atendimento presencial: segunda a quinta, das 7h às 14h; sexta, das 7h às 13h",
  },
  RN: {
    nome: "Ministério Público do Rio Grande do Norte",
    sigla: "MPRN",
    pagina: "https://www.mprn.mp.br/ouvidoria",
    formulario:
      "https://ouvidoria.mprn.mp.br/ouvidoria/cidadao/termoManifestacao.do?idOuvidoria=7&origem=&destino=cadastro",
    telefones: [],
    whatsapp: zap("(84) 99994-6057"),
    email: "ouvidoria@mprn.mp.br",
    horario: "Segunda a quinta, das 8h às 17h; sexta, das 8h às 14h",
  },
  AL: {
    nome: "Ministério Público de Alagoas",
    sigla: "MPAL",
    pagina: "https://www.mpal.mp.br/ouvidoria",
    telefones: [fone("Ouvidoria", "(82) 2122-3512")],
    email: "ouvidoria@mpal.mp.br",
    horario: "Segunda a sexta, das 7h30 às 13h30",
  },
  // O certificado do site não é aceito por leitores automáticos; os dados vieram da página aberta no navegador.
  SE: {
    nome: "Ministério Público de Sergipe",
    sigla: "MPSE",
    pagina: "https://www.mpse.mp.br/portal-ouvidoria/",
    formulario: "https://sistemas.mpse.mp.br/4.5/Ouvidoria/Manifestacao/Ouvidoria.aspx",
    telefones: [fone("Ouvidoria", "(79) 3209-2400")],
    email: "ouvidoria@mpse.mp.br",
    horario: "Segunda a sexta, das 7h às 14h",
  },
  PI: {
    nome: "Ministério Público do Piauí",
    sigla: "MPPI",
    pagina: "https://www.mppi.mp.br/internet/ouvidoria",
    formulario: "https://aplicativos3.mppi.mp.br/ouvidoria/publico/formularioOuvidoria.xhtml",
    telefones: [fone("Ouvidoria", "(86) 2222-8131"), fone("Disque MPPI", "127")],
    whatsapp: zap("(86) 98134-9773"),
    email: "ouvidoria@mppi.mp.br",
    horario: "Segunda a sexta, das 8h às 14h",
  },
  MA: {
    nome: "Ministério Público do Maranhão",
    sigla: "MPMA",
    pagina: "https://www.mpma.mp.br/ouvidoria/",
    formulario: "https://ouvidoria.mpma.mp.br/sistema/manifestacao/cadastrar",
    telefones: [fone("Ouvidoria", "(98) 3219-1738"), fone("Disque MPMA", "127")],
    whatsapp: zap("(98) 99137-1298"),
    email: "ouvidoria@mpma.mp.br",
    horario: "Segunda a sexta, das 8h às 15h",
  },
} as const satisfies Record<string, CanalMP>;

export type UF = keyof typeof ouvidoriasMP;

// Forma curta usada pelo gerador e pelo botão de denúncia: abre o formulário quando existe, senão a página da ouvidoria.
export const ouvidorias = Object.fromEntries(
  Object.entries(ouvidoriasMP).map(([uf, c]) => [
    uf,
    {
      nome: c.nome,
      url: (c as CanalMP).exigeGovBr ? c.pagina : ((c as CanalMP).formulario ?? c.pagina),
    },
  ]),
) as Record<UF, { nome: string; url: string }>;
