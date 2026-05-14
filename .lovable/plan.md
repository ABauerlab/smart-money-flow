## Objetivo

Reestruturar a Análise IA em duas trilhas regionais independentes (Ásia e Ocidente), com visões Diária, Semanal e Mensal que mantêm somatórios separados por dia / semana 1-4 / mês 1-4 — sem nunca somar entre semanas ou entre meses. Remover todo o fluxo de Lista de Baixa (RB / LB) — passamos a tratar somente Alta.

## Modelo conceitual

Cada relatório enviado passa a ter dois atributos novos:

- **region**: `asia` | `west` (Ocidente = Europa + Américas)
- **report_type**: fixado em `alta` (sem mais `baixa` nem `volume` no fluxo)

Cadência de envio esperada (segunda a sexta):
- 2 relatórios Asiáticos (A) + 2 relatórios Ocidentais (O) por dia
- Sábado/domingo não contam para a janela semanal

## Fluxo de navegação

```text
/analise-ia
  └── Escolher Região  ──►  [ Mercado Asiático ]   [ Mercado Ocidental ]
                                     │                       │
                                     ▼                       ▼
                              Tabs por região:  Diária | Semanal | Mensal
```

### Visão Diária
- Mostra o dia atual + lista de dias anteriores (cada dia abre/fecha individualmente)
- Cada card de dia exibe a soma de menções daquele dia, isolada

### Visão Semanal
- Cabeçalho: "Semana atual" (segunda → sexta corrente) com soma própria
- Abaixo: cards "Semana 1", "Semana 2", "Semana 3", "Semana 4" do mês corrente
- Cada semana é um acordeão independente — nada é somado entre semanas
- "Semana 1" = primeira semana ISO do mês, e assim por diante

### Visão Mensal
- Cabeçalho: "Mês atual" com a soma das semanas 1–4 do mês corrente
- Abaixo: cards "Mês 1", "Mês 2", "Mês 3", "Mês 4" (últimos 4 meses, isolados)
- Cada mês abre e mostra o ranking consolidado **apenas daquele mês**

## Mudanças no schema (Lovable Cloud)

- `crypto_mentions`: adicionar `region text not null default 'west'` e índice em `(access_code, region, report_date)`
- `crypto_report_submissions`: adicionar `region text not null default 'west'`
- `crypto_analyses`: adicionar `region text` (nullable, para histórico)
- `crypto_periodic_reports`: adicionar `region text not null default 'west'`; índice em `(access_code, region, period_type, period_start)`
- Backfill: registros existentes recebem `region = 'west'` (podem ser revisados depois pelo usuário)
- Remover do fluxo: nenhum drop de coluna `report_type`, mas a aplicação passa a ignorar/recusar valores != 'alta'

## Mudanças na Edge Function `crypto-analysis`

- `analyze` e `refresh-lists`: passam a aceitar e exigir `region`
- `rankings`: novo parâmetro `region`; retorna apenas `altaRankings` (LB removido)
- `generate-periodic`: aceita `region` + `periodType` ∈ `daily | weekly | monthly`; salva relatório periódico isolado por janela (dia / semana N do mês / mês N)
- Novo endpoint conceitual (ou parâmetro): `windowIndex` para identificar Semana 1-4 e Mês 1-4
- System Prompt do Consolidador CriptoEx Pro: remover toda menção a RB/LB, manter apenas RA/LA; instrução adicional para respeitar `region` e nunca misturar Ásia ↔ Ocidente
- Saída do prompt: remove tabela LB, mantém só LA

## Mudanças no frontend

- `src/pages/CryptoAnalysis.tsx`
  - Nova tela inicial: seletor de região (2 cards grandes: Ásia / Ocidente)
  - Após escolher, abre painel da região com Tabs `Diária | Semanal | Mensal`
  - Aba "Enviar" passa a exigir seleção de região antes do envio
  - Remover botões de tipo "Baixa" e "Volume" (manter só Alta, ou remover o seletor inteiro já que é único)
- `src/hooks/useCryptoAnalysis.ts`
  - Adicionar `region` em todas as chamadas (`submitAnalysis`, `rankings`, `refreshLists`, `generatePeriodicReport`)
  - Remover `baixaRankings` do retorno
- Componentes:
  - `RepetitionDashboard.tsx`: remover Tab "Lista de Baixa", manter só LA; renomear para refletir período (diário/semanal/mensal)
  - Criar `DailyView`, `WeeklyView`, `MonthlyView` (acordeões por janela isolada)
  - `PeriodicReportsView.tsx`: simplificar — apenas 3 períodos (Diário/Semanal/Mensal) e remover renderização de LB
  - `AnalysisHistory.tsx`: exibir badge da região
- Remover constantes/labels de "Baixa" e "RB" em todos os componentes e tooltips

## Tooltips e textos

- Atualizar todos os textos explicativos para refletir: 2 envios A + 2 envios O por dia útil, somatórios isolados por dia/semana/mês, foco exclusivo em Alta
- Glossário (`src/lib/glossaryData.ts`): remover entradas de RB/LB se existirem; adicionar entradas para "Mercado Asiático", "Mercado Ocidental", "Semana isolada", "Mês isolado"

## Detalhes técnicos

- Cálculo de "Semana N do mês": usar `Math.ceil(dayOfMonth / 7)` limitado a 1–4 (5ª semana parcial agrega na 4)
- Cálculo de "Mês N": índice 1–4 dos últimos 4 meses calendário a partir do mês atual (Mês 1 = mais antigo, Mês 4 = mais recente — confirmar com o usuário se preferir invertido)
- Janela semanal: segunda 00:00 → sexta 23:59 do fuso `America/Sao_Paulo`
- Cache de rankings invalidado por `[region, periodType, windowIndex]`

## Pontos a confirmar antes de implementar

1. "Mês 1, Mês 2, Mês 3, Mês 4" é **dentro do ano corrente** (Jan/Fev/Mar/Abr) ou são os **últimos 4 meses corridos** (deslizante)?
2. O usuário quer que envios já existentes sejam tratados como `region = 'west'` por padrão, ou prefere uma tela única de revisão para reclassificar?
3. Devemos remover fisicamente do banco os registros antigos com `report_type = 'baixa'`, ou apenas escondê-los da UI?

## Entregável

Após aprovação: migrações + edge function atualizada + refatoração da página `CryptoAnalysis` + componentes de visão Diária/Semanal/Mensal por região, com todo o fluxo de Baixa removido da UI.
