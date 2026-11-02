# Project: CivisBR - Civic Complaint Generator (Minuta Cívica)

## 📋 Visão Geral
Ferramenta web leve que ajuda o cidadão a transformar dados de uma irregularidade encontrada em uma **minuta formal de representação**, pronta para ser protocolada nas Ouvidorias do Ministério Público (MPF/MPE) ou Tribunais de Contas (TCE).

## 🎯 Objetivo
Fechar o ciclo da fiscalização: não basta encontrar o problema ou a anomalia; é preciso dar ao cidadão comum o instrumento jurídico padronizado e sem fricção para exigir investigação oficial das autoridades competentes.

## 🛠️ Stack Tecnológica Sugerida
- **Frontend:** HTML5, TailwindCSS (via CDN) e JavaScript puro (sem necessidade de frameworks complexos, rodando direto no GitHub Pages).
- **Geração de Documentos:** Biblioteca JS (como `pdfmake` ou `jspdf`) ou template string dinâmico que gera um arquivo `.docx` ou `.pdf` formatado no navegador do usuário.

## 🚀 Arquitetura e Fluxo de Execução
1. **Formulário Simples:** O usuário preenche dados básicos (Município, Órgão alvo, Tipo de irregularidade identificada, links ou números de empenho/contrato).
2. **Template Jurídico Base:** O sistema preenche automaticamente uma petição/representação padrão com linguagem técnico-jurídica adequada, baseada na Lei da Ação Popular e Lei de Improbidade Administrativa.
3. **Exportação e Envio:** O site gera um PDF limpo com os fundamentos da denúncia e fornece os links diretos para a Ouvidoria do Ministério Público daquele estado para protocolo online.

## 🏃‍♂️ Próximos Passos (MVP)
- [ ] Redigir um modelo padrão de representação simples e genérica para irregularidades em licitações municipais (validado por texto jurídico básico).
- [ ] Criar uma página HTML interativa simples com um formulário de inputs (Município, Fatos, Provas/Links).
- [ ] Implementar a lógica em JavaScript para injetar os dados do usuário no template e disparar o download do PDF preenchido.
