# Reformulação da Análise IA

Objetivo: um único mercado geral de cripto (sem escolher região), ingestão por arquivos **.CSV**, somatório real da coluna REPETIÇÃO, semanas seg→sex que zeram toda segunda, e relatório mensal automático.

## Formato do CSV enviado
Cada arquivo terá sempre estas colunas:

```text
A: CRIPTO   B: REPETIÇÃO   C: DATA   D: HORA   E: RANK
```

O sistema lê 100% das linhas e soma os valores da coluna B (REPETIÇÃO) por cripto, sem alterar nada — exatamente como o prompt pede: "Ordene os ativos... conforme o número total de repetições e a soma das repetições da coluna 2".

## 1. Remover região
- Tira a tela de escolha (RegionPicker) e o cabeçalho "Mercado Asiático/Ocidental".
- Hook e edge function param de enviar/filtrar `region` (coluna fica no banco, ignorada).
- Abre direto no painel único com as abas: **Listas** e **Enviar** e **Histórico**.

## 2. Aba Enviar (antes "ENVIAR RA" → agora "ENVIAR")
- Novo `CsvUploader` (substitui o uploader de imagens): aceita `.csv` (vários).
- Parse no cliente das colunas A–E.
- Campo de **data do relatório** (date picker, padrão hoje) para marcar a que dia aquele lote se refere; se a coluna C tiver data válida, ela é usada por linha, senão usa a data escolhida.
- Botão **ENVIAR**: manda as linhas parseadas para a edge function que grava as menções com `repetition` somável.
- Cadência informativa exibida: 05:00 Londres, 10:30 América, 13:30 América, 21:00 Ásia (4 relatórios/dia, consolidados ~22h).

## 3. Aba Listas (foco: semanal)
- Padrão: **Semanal**. Semana = segunda a sexta. Sexta encerra; segunda recomeça do zero.
- Seletor de semanas passadas rotuladas tipo **"SEMANA 1 - JUNHO"**, fáceis de acessar.
- Também há recorte **Diário** (somatório do dia) e **Mensal**.
- Cada recorte mostra o ranking somado pela coluna REPETIÇÃO (descendente; empate = data/hora mais recente).
- Opção de escolher intervalo de datas para o somatório.

## 4. Relatório mensal automático
- Ao completar um mês de somatórios, gera um relatório mensal consolidando os somatórios das semanas daquele mês (mantém cada semana visível separadamente).

## Detalhes técnicos
- **Migração DB**: adicionar `repetition integer not null default 1` em `crypto_mentions` e `rank integer`/`report_time text` (opcionais) para guardar coluna D/E.
- **Edge function** `crypto-analysis`:
  - Nova ação `analyze-csv` (ou `analyze` aceitando `rows`): grava menções com `repetition`.
  - `rankings`/`generate-periodic`/`refresh-lists`: somar `repetition` (em vez de contar linhas) e parar de exigir `region`.
  - Rótulo de janela semanal `SEMANA N - <MÊS>`.
  - SYSTEM_PROMPT atualizado: mercado único, ordenar por soma da coluna 2, sem região.
- **Frontend**: `CryptoAnalysis.tsx` simplificado; novo `CsvUploader.tsx`; `WindowAccordion`/`RegionWindowDashboard` sem `region`; hook sem `region`.

## Itens a confirmar
1. O envio dos 4 relatórios é **manual** (você sobe os CSVs), certo? Não há busca automática externa.
2. "SEMANA 1 - JUNHO" = contagem da semana dentro do mês corrente (1ª a 5ª semana), correto?
