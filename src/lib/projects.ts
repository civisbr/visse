export const projects = [
  { to: "/red-flags", emoji: "🚩", nome: "Contratos suspeitos", curto: "Alertas", resumo: "Avisamos quando a prefeitura faz uma compra estranha.", cor: "bg-coral" },
  { to: "/obras", emoji: "🏗️", nome: "Obras paradas", curto: "Obras", resumo: "Creches, escolas e postos que não ficaram prontos.", cor: "bg-sun" },
  { to: "/tradutor", emoji: "💬", nome: "Entenda os gastos", curto: "Gastos", resumo: "As contas da sua cidade em palavras simples.", cor: "bg-sky" },
  { to: "/gerador", emoji: "📢", nome: "Faça sua denúncia", curto: "Denunciar", resumo: "Baixe um documento pronto e envie ao Ministério Público.", cor: "bg-leaf" },
  { to: "/minuta-core", emoji: "🔒", nome: "Denúncia segura", curto: "Segura", resumo: "Seu nome fica só no seu celular.", cor: "bg-secondary" },
] as const;

export type Carta = { emoji: string; titulo: string; texto: string; cidade: string; valor: string; cor: string; orgao: string; tipo: string; dados: Record<string, string> };

export const cartas: Carta[] = [
  { emoji: "🏫", titulo: "Creche parada há 2 anos", texto: "Já pagaram 80% do dinheiro, mas só 35% da obra está pronta.", cidade: "Exemplópolis (BA)", valor: "R$ 1,68 milhão pago", cor: "bg-sun", orgao: "Prefeitura Municipal de Exemplópolis", tipo: "Obra paralisada com pagamento maior que a execução", dados: { obra: "Creche Proinfância Tipo B", valorPago: "R$ 1.680.000,00", execucaoFisica: "35%" } },
  { emoji: "🍎", titulo: "Merenda com uma empresa só", texto: "Só uma empresa disputou, e ela foi aberta 3 meses antes.", cidade: "Exemplópolis (BA)", valor: "R$ 450 mil", cor: "bg-coral", orgao: "Prefeitura Municipal de Exemplópolis", tipo: "Licitação com concorrente único e empresa recém-criada", dados: { licitacao: "Pregão 012/2026", valorTotal: "R$ 450.000,00", cnpjVencedor: "12.345.678/0001-99" } },
  { emoji: "🏥", titulo: "Reforma do posto ficou 30% mais cara", texto: "O contrato aumentou de valor pouco tempo depois de assinado.", cidade: "Serra Azul (CE)", valor: "+R$ 95 mil", cor: "bg-sky", orgao: "Prefeitura Municipal de Serra Azul", tipo: "Aditivo contratual acima de 25%", dados: { contrato: "Tomada de Preços 007/2026", aditivo: "R$ 95.000,00" } },
  { emoji: "🛣️", titulo: "Rua asfaltada? Só no papel", texto: "O contrato de asfalto teve R$ 420 mil a mais. Moradores dizem que a rua continua de terra.", cidade: "Vila Nova (PE)", valor: "R$ 1,2 milhão", cor: "bg-leaf", orgao: "Prefeitura Municipal de Vila Nova", tipo: "Aditivo contratual acima de 25% em obra de pavimentação", dados: { contrato: "Concorrência 003/2026", aditivo: "R$ 420.000,00" } },
];
