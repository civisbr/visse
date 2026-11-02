# Project: CivisBR - Civic Minuta Core (`civic-minuta-core`)

## 📋 Visão Geral
Módulo JavaScript/TypeScript leve e cliente-side (roda 100% no navegador do usuário) responsável por transformar alertas, anomalias e dados de obras/gastos em **minutas formais de denúncia em PDF**, prontas para o Ministério Público.

## 🎯 Princípios Fundamentais
1. **Privacidade Absoluta (Zero Server Processing):** Nenhum dado pessoal do cidadão (nome, CPF, e-mail) trafega por servidores do CivisBR ou banco de dados. Tudo é processado na memória do navegador.
2. **Neutralidade e Rigor Jurídico:** O texto gerado utiliza estritamente linguagem técnica, embasada na Lei de Licitações (Lei nº 14.133/2021), Lei de Acesso à Informação (LAI - Lei nº 12.527/2011) e princípios da administração pública (Art. 37 da CF/88).
3. **Reutilizabilidade:** Pode ser chamado via API JS simples por qualquer outro módulo do CivisBR (IA Tradutora, Red Flags de Licitações, Monitor de Obras).

## 🛠️ Stack Tecnológica
- **Linguagem:** JavaScript (ES6+) / TypeScript.
- **Geração de PDF:** `pdfmake` ou `jspdf` (leves e executáveis no cliente).
- **Interface:** Modais simples em HTML5/TailwindCSS.

## ⚙️ Interface de Chamada (API do Módulo)

```javascript
// Exemplo de como os outros projetos chamam o módulo:
CivisMinuta.gerarDenuncia({
  orgaoAlvo: "Prefeitura Municipal de [Nome]",
  tipoAnomalia: "Licitação com Concorrente Único e Empresa Recém-Criada",
  dadosConcretos: {
    licitacaoNum: "Pregão Eletrônico 012/2026",
    valorTotal: "R$ 450.000,00",
    cnpjVencedor: "12.345.678/0001-99",
    dataAberturaCNPJ: "15/01/2026",
    linkPortalTransparencia: "https://..."
  },
  fundamentacaoLegal: ["Art. 37, XXI da CF/88", "Lei 14.133/2021"]
});
```

## 🚀 Fluxo de Execução no Navegador
1. **Gatilho:** O cidadão clica em `"Denunciar essa irregularidade ao MP"`.
2. **Modal de Dados:** O sistema abre um modal solicitando apenas Nome Completo e Cidade (para qualificar o denunciante na petição).
3. **Compilação:** O código injeta os dados do cidadão e os dados da anomalia no template jurídico em Markdown/JSON.
4. **Download do PDF:** O navegador gera o PDF instantaneamente e inicia o download.
5. **Redirecionamento:** O site exibe os botões diretos para os sistemas de ouvidoria oficiais (ex: *Ouvidoria do MPF*, *Ouvidoria do MPE-BA, MPE-PE, MPE-CE*, etc.).

## 🏃‍♂️ Roteiro de Implementação (MVP)
- [ ] Criar o arquivo `minutaTemplate.js` com o texto padrão de representação jurídica.
- [ ] Configurar a biblioteca `pdfmake` para formatar o documento (margens padrão A4, cabeçalho formal, numeração de páginas).
- [ ] Montar uma tabela de mapeamento com os links das Ouvidorias dos Ministérios Públicos dos estados do Nordeste.
- [ ] Criar uma demo simples em HTML testando o download do PDF.
