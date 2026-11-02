# Project: CivisBR - Impact Tracker (Obras e Saúde)

## 📋 Visão Geral
Painel de monitoramento cívico focado exclusivamente em **bens tangíveis e de impacto imediato na vida do cidadão**: obras públicas paralisadas (escolas, creches, postos de saúde) e situação de repasses para insumos básicos.

## 🎯 Objetivo
Sair da abstração dos grandes orçamentos e fiscalizar o que é palpável: cruzar o dinheiro federal enviado com o status real de entrega da obra física na comunidade.

## 🛠️ Stack Tecnológica Sugerida
- **Processamento de Dados:** Python (Pandas, geopandas se houver coordenadas).
- **Visualização:** Mapas interativos leves (Leaflet.js ou Mapbox integrados ao GitHub Pages) e tabelas limpas.
- **Fontes de Dados Abertas:** Painéis abertos do FNDE (Siga Obras / SIMEC) e dados do Srag/SUS ou portais de saúde estaduais.

## 🚀 Arquitetura e Fluxo de Execução
1. **Extração de Dados Federais:** Baixar bases públicas de obras pactuadas com municípios (ex: dados do FNDE sobre creches e escolas da rede básica).
2. **Cruzamento Geográfico:** Filtrar apenas os registros referentes aos municípios do escopo de interesse (ex: microrregião do Nordeste escolhida).
3. **Classificação de Status:** Agrupar em: *Em Andamento*, *Atrasada*, *Paralisada* ou *Concluída com Atraso Crítico*.
4. **Exibição Pública:** Renderizar esses dados de forma amigável no site do CivisBR com indicador de "quanto dinheiro já foi pago vs. % de execução da obra".

## 🏃‍♂️ Próximos Passos (MVP)
- [ ] Baixar o dataset público de obras do FNDE/SIMEC em formato CSV.
- [ ] Filtrar via script Python as linhas correspondentes a um estado ou microrregião específica.
- [ ] Criar uma tabela estática em Markdown ou HTML simples para publicar no repositório do CivisBR mostrando as obras paralisadas daquela região.
