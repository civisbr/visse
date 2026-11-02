# Project: CivisBR - AI Public Data Translator

## 📋 Visão Geral
Ferramenta para transformar relatórios burocráticos, balancetes de prefeituras, dados do Tribunal de Contas (TCE) e CGU em **resumos executivos em linguagem simples, direta e acessível**, focados no impacto local (saúde e educação).

## 🎯 Objetivo
Eliminar a barreira da "literacia de dados" (data literacy), permitindo que qualquer cidadão de um município do interior entenda instantaneamente como o dinheiro público de saúde e educação foi aplicado na sua cidade.

## 🛠️ Stack Tecnológica Sugerida
- **Backend / Linguagem:** Python (FastAPI ou script simples de automação).
- **Processamento de Texto / IA:** LangChain ou chamadas diretas a APIs de LLMs (OpenAI, Anthropic ou modelos open-source locais via Ollama/Llama 3).
- **Banco de Dados (Opcional):** SQLite ou PostgreSQL (para armazenar os resumos gerados por município/mês).
- **Frontend:** Markdown estático gerado automaticamente ou integração com o site principal do CivisBR (GitHub Pages).

## 📊 Fontes de Dados
- Portais de Transparência municipais (via scraping ou APIs do Siconfi / Tesouro Nacional).
- Dados abertos do FNDE (repasses para educação) e FNS (repasses para saúde).
- Relatórios públicos de auditoria de TCEs estaduais.

## 🚀 Arquitetura e Fluxo de Execução
1. **Coleta (Ingestão):** O script busca os dados financeiros mensais de um município-alvo.
2. **Normalização:** O script formata os dados brutos em um JSON estruturado (ex: "Receita Total: R$ X", "Gasto em Saúde: R$ Y", "Gastos com Pessoal: R$ Z").
3. **Geração (Prompt Engineering):** O sistema envia o JSON para a IA com um prompt estrito de neutralidade e clareza (ex: *"Aja como um auditor cívico imparcial. Explique em 3 parágrafos simples o que estes números significam para um morador comum, sem juízo de valor partidário"*).
4. **Publicação:** O resultado é salvo como um arquivo `.md` ou injetado em uma página web do CivisBR.

## 🏃‍♂️ Próximos Passos (MVP)
- [ ] Escolher **1 município piloto** (ex: sua cidade natal ou uma cidade com orçamento relevante).
- [ ] Escrever um script em Python para baixar um relatório financeiro em PDF ou CSV dessa prefeitura.
- [ ] Configurar a integração com uma API de IA para testar a qualidade do resumo gerado.
- [ ] Automatizar o fluxo para rodar mensalmente via GitHub Actions (CI/CD gratuito).
