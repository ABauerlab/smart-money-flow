## Plano

### 1. Reconfigurar mercados exibidos no dashboard

**Lista final (12 mercados):**
- Ibovespa (BR) — já existe (Brapi proxy)
- Petrobras PN (PETR4) — já existe (Brapi)
- Bitcoin (BTC) — já existe (CoinMarketCap)
- S&P 500 (SPY) — já existe (Alpha Vantage)
- Nasdaq 100 (QQQ) — já existe (Alpha Vantage)
- Nikkei 225 ETF (EWJ) — já existe (Alpha Vantage)
- Mercado Europeu (VGK) — já existe (Alpha Vantage)
- Petróleo Brent — já existe (Alpha Vantage commodity)
- **DAX 40 (EWG ETF)** — novo, via Alpha Vantage
- **NYSE Composite (NYA)** — novo, via Alpha Vantage (ETF VTI como proxy se NYA falhar)
- **KOSPI (EWY ETF)** — novo, via Alpha Vantage (ETF iShares MSCI South Korea, proxy do KOSPI)
- **BSE/Sensex (INDA ETF)** — novo, via Alpha Vantage (ETF iShares MSCI India, proxy do Sensex/BSE)

**Por que ETFs para os índices internacionais:** Alpha Vantage não retorna volume confiável para índices nativos como `^GDAXI`, `^KS11` ou `^BSESN` (mesmo motivo pelo qual hoje usamos EWJ para Nikkei e VGK para Europa). ETFs americanos do mesmo país têm volume real diário e são a melhor proxy de fluxo institucional disponível na cota gratuita.

**Remover:** Tudo que não está na lista — Forex (USD-BRL, EUR-BRL), Ouro Spot (XAU-USD), e as criptos extras (ETH, SOL, XRP, BNB, ADA, DOGE). Manter apenas BTC.

### 2. Renomear "Smart Money" → "Fluxo dos Mercados"

Substituir em:
- `src/index.css` (comentário do tema)
- `src/pages/Glossary.tsx` (subtítulo)
- `src/lib/glossaryData.ts` (definições "Volume Relativo", "Conviction Score", e o termo "Dinheiro Grosso (Smart Money)" → "Dinheiro Grosso (Fluxo dos Mercados)")
- `src/components/dashboard/NewsPanel.tsx` (corrigir também o typo "Smart Nelson")
- `src/hooks/useNotifications.ts` (chaves localStorage `smartmoney_sound` e `smartmoney_notifications` → `fluxomercados_sound` / `fluxomercados_notifications`, com migração: ler valor antigo na primeira execução e copiar para a nova chave para não perder a preferência do usuário)

### 3. Edge function `market-data`

- Adicionar 4 novos targets em `avTargets`: EWG (DAX), NYA (NYSE), EWY (KOSPI), INDA (BSE).
- Remover chamadas a `fetchForex` (USD-BRL, EUR-BRL, XAU-USD).
- Reduzir `CRYPTO_SPECS` para apenas BTC.
- Limpar entradas obsoletas do cache `market_data_cache` (USDBRL, EURBRL, XAUUSD, ETH, SOL, XRP, BNB, ADA, DOGE) via migração SQL.
- Atualizar `ASSET_KEYWORDS` (NewsAPI): remover Dólar/Real, Euro/Real, Ouro, ETH, SOL, XRP, BNB, ADA, DOGE; adicionar entradas para DAX, NYSE, KOSPI/Coréia, BSE/Sensex/Índia.
- Como vamos passar de 4 para 8 chamadas Alpha Vantage por refresh (limite 25/dia, 5/min) o cache TTL de 6h continua confortável (4 refreshes/dia × 8 = 32 — ajustar TTL para 8h para ficar dentro da cota com folga, ou manter 6h aceitando que ocasionalmente algum índice volta do cache via merge stale, que já é o comportamento atual).
- Manter delay de 1.5s entre chamadas AV (já implementado).

### 4. Mock data e notas

- Atualizar `src/lib/mockData.ts` para refletir a nova lista (fallback quando API falha) e remover entradas que não existem mais.

### Detalhes técnicos

- `BDR_FALLBACKS` continua cobrindo SPY/QQQ via IVVB11/NASD11. Não há BDRs diretos para DAX/NYSE/KOSPI/BSE no Brasil com liquidez relevante via Brapi free, então se Alpha Vantage falhar esses ficarão temporariamente do cache stale (comportamento atual já faz merge).
- Migração SQL: `DELETE FROM market_data_cache WHERE id IN ('usdbrl','eurbrl','xauusd','eth','sol','xrp','bnb','ada','doge');`
- A renomeação de chaves localStorage inclui código de migração one-shot em `useNotifications.ts` para preservar preferências.

### Arquivos a editar

- `supabase/functions/market-data/index.ts`
- `src/lib/mockData.ts`
- `src/index.css`
- `src/pages/Glossary.tsx`
- `src/lib/glossaryData.ts`
- `src/components/dashboard/NewsPanel.tsx`
- `src/hooks/useNotifications.ts`
- nova migração SQL para limpar cache
