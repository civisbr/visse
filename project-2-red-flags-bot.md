# Project: CivisBR - Municipal Red Flags Bot

## 📋 Visão Geral
Sistema automatizado de varredura em dados de licitações e contratos públicos para identificar **padrões suspeitos clássicos** (anomalias estatísticas e administrativas) em pequenos e médios municípios.

## 🎯 Objetivo
Atuar como um "radar automático" que aponta contratos atípicos (ex: licitações com concorrente único, empresas recém-criadas ganhando fortunas, aditivos abusivos) para alertar jornalistas locais e lideranças cívicas antes que o dano ao erário se consuma.

## 🛠️ Stack Tecnológica Sugerida
- **Linguagem:** Python (Pandas para análise de dados, Requests/BeautifulSoup para web scraping).
- **Notificações:** Integração com APIs de Telegram Bot, Webhooks do Discord ou envio de e-mails transacionais (Resend / SendGrid).
- **Banco de Dados:** SQLite (para histórico de licitações analisadas e evitar falsos positivos repetidos).

## 📊 Regras de Anomalia (O "Filtro de Riscos")
1. **Concorrente Único:** Licitações na modalidade "Tomada de Preços", "Concorrência" ou "Pregão" onde houve apenas 1 empresa habilitada/participante.
2. **Empresa Recém-Criada:** CNPJs com menos de 6 meses de abertura que vencem contratos de valores expressivos (ex: acima de R$ 100 mil).
3. **Súbita Explosão de Aditivos:** Contratos que sofreram aditivos de valor superiores a 25% do valor original em curto espaço de tempo.

## 🚀 Arquitetura e Fluxo de Execução
1. **Scraping Periódico:** O robô varre semanalmente o Diário Oficial ou o Portal de Transparência do município-alvo.
2. **Aplicação de Regras (Heurísticas):** O script cruza os dados do CNPJ na base da Receita Federal (via API pública/aberta de CNPJ) e avalia o histórico de lances.
3. **Geração de Alerta:** Se uma anomalia atinge o score de risco, o sistema dispara uma mensagem formatada para um canal de Telegram ou e-mail cadastrado.

## 🏃‍♂️ Próximos Passos (MVP)
- [ ] Mapear o formato do Portal de Transparência ou Diário Oficial de um município específico.
- [ ] Escrever a função em Python que consome a API de consulta de CNPJ (ex: BrasilAPI ou Minha Receita) para checar a data de abertura da empresa vencedora.
- [ ] Criar um script de alerta simples que envia uma mensagem para o seu próprio Telegram quando encontrar um CNPJ com menos de 1 ano ganhando licitação.
