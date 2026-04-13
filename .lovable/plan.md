

## Plano: Refatorar IA do CriptoEx + Renomear Sistema para "Fluxo Dos Mercados"

### Contexto
A IA precisa ser reeducada com um prompt mais claro e direto. A tarefa dela e simples: ler relatórios RA e RB, extrair criptos, contar repetições e ordenar. Alem disso, o sistema inteiro precisa ser renomeado de "Smart Nelson Money" para "Fluxo Dos Mercados".

---

### 1. Reescrever o SYSTEM_PROMPT da Edge Function

Substituir o prompt atual por um focado e preciso:

- A IA recebe relatórios RA (Alta) e RB (Baixa)
- Cada relatório tem colunas: Cripto, Repetição, Data, Hora, Rank
- Deve separar RA dos RB rigorosamente (nunca misturar)
- Gerar Lista de Alta (LA) a partir dos RA e Lista de Baixa (LB) a partir dos RB
- Ordenar ambas as listas por repetição (descendente)
- Entregar resultados nos seguintes periodos: Diario, Tres dias, Semanal, Mensal, Bimestral, Trimestral, Anual
- A resposta deve incluir: contagem total de relatorios do dia, da semana e do mes
- Considerar apenas dados a partir de 06/04/2026
- Linguagem neutra, tecnica, sem recomendacao financeira

### 2. Atualizar Edge Function `crypto-analysis/index.ts`

- Atualizar o `SYSTEM_PROMPT` conforme acima
- Na action `analyze`: melhorar o user prompt para instruir a IA a entregar LA e LB separados com contagem
- Na action `rankings`: separar rankings em `alta` e `baixa` ao invés de misturar tudo num unico ranking
- Na action `generate-periodic`: gerar relatórios com LA e LB separados por período
- Adicionar suporte a periodos `three_days` e `annual`

### 3. Atualizar Frontend — RepetitionDashboard

- Dividir a visualização em duas abas/seções: "Lista de Alta (LA)" e "Lista de Baixa (LB)"
- Mostrar contadores: total hoje, total semana, total mês
- Cada lista ordena por repetição descendente

### 4. Atualizar PeriodicReportsView

- Adicionar períodos "3 Dias" e "Anual" nos botões de geração
- Nos relatórios expandidos, mostrar LA e LB separadamente

### 5. Renomear o Sistema para "Fluxo Dos Mercados"

Arquivos afetados (todos as ocorrências de "Smart Nelson Money", "Smart Nelson", "SMART NELSON"):

| Arquivo | O que muda |
|---|---|
| `index.html` | title, meta description, og tags, twitter tags, apple-web-app-title |
| `public/manifest.json` | name, short_name, description |
| `vite.config.ts` | PWA manifest name/short_name/description |
| `src/pages/Landing.tsx` | Header, footer, textos |
| `src/pages/Index.tsx` | Footer version text |
| `src/pages/Glossary.tsx` | Título |
| `src/components/dashboard/Header.tsx` | Nome no header |
| `src/lib/exportPeriodicReportPdf.ts` | Header e footer do PDF |
| `src/lib/glossaryData.ts` | Referência ao nome |

### 6. Atualizar SEO

- Title: "Fluxo Dos Mercados | Análise de Fluxo Institucional em Tempo Real"
- Description: atualizar para mencionar "Fluxo Dos Mercados"
- OG/Twitter: atualizar todos

---

### Arquivos Modificados
- `supabase/functions/crypto-analysis/index.ts` — Novo prompt + lógica LA/LB
- `src/components/analysis/RepetitionDashboard.tsx` — Separar LA/LB + contadores
- `src/components/analysis/PeriodicReportsView.tsx` — Adicionar 3 dias e anual
- `src/hooks/useCryptoAnalysis.ts` — Suporte a novos períodos
- `index.html` — Renomear SEO
- `public/manifest.json` — Renomear
- `vite.config.ts` — Renomear PWA
- `src/pages/Landing.tsx` — Renomear
- `src/pages/Index.tsx` — Renomear
- `src/pages/Glossary.tsx` — Renomear
- `src/components/dashboard/Header.tsx` — Renomear
- `src/lib/exportPeriodicReportPdf.ts` — Renomear
- `src/lib/glossaryData.ts` — Renomear

