

## Plano de Implementação Completo

### 1. Corrigir Build Error em mockData.ts
- Tipar `style` como `'currency' as const` no `formatPrice`

### 2. Adicionar DAX40 e Nikkei225

**Edge Function `market-data/index.ts`:**
- Adicionar `fetchAlphaVantage('DAX', 'DAX 40', '🇩🇪', 'indices', 'EUR', apiKey)` 
- Adicionar `fetchAlphaVantage('EWJ', 'Nikkei 225 (ETF)', '🇯🇵', 'indices', 'USD', apiKey)`
- Usar cache de 15min para respeitar rate limit (já existente)
- Corrigir `error.message` → `(error as Error).message`

**Mock Data:**
- Adicionar entradas para DAX40 e Nikkei225 como fallback

### 3. Módulo "Análise IA" de Criptomoedas

**Migração SQL:**
- Tabela `crypto_analyses` (id, title, summary, period_type, crypto_symbols, ai_model_used, created_at)
- Tabela `crypto_analysis_images` (id, analysis_id FK, image_url, image_name, ai_interpretation, created_at)
- Storage bucket `crypto-images` (público)
- RLS: leitura e escrita públicas (sem auth por enquanto)

**Edge Function `crypto-analysis/index.ts`:**
- Recebe imagens base64 + contexto
- Usa Lovable AI Gateway (google/gemini-2.5-pro) para análise multimodal
- Prompt especializado em análise técnica de criptomoedas
- Salva análise + imagens no banco e storage
- Retorna relatório estruturado
- Endpoint para listar histórico de análises

**Frontend:**
- `src/pages/CryptoAnalysis.tsx` — página principal com upload, geração e histórico
- `src/components/analysis/ImageUploader.tsx` — drag-and-drop de múltiplas imagens
- `src/components/analysis/AnalysisReport.tsx` — renderização do relatório markdown
- `src/components/analysis/AnalysisHistory.tsx` — lista de análises anteriores
- `src/hooks/useCryptoAnalysis.ts` — hook para submeter e buscar análises
- Rota `/analise-ia` em `App.tsx`
- Link "Análise IA" no Header do dashboard

### Arquivos Modificados
| Arquivo | Ação |
|---|---|
| `src/lib/mockData.ts` | Fix type + add DAX/Nikkei mock |
| `supabase/functions/market-data/index.ts` | Add DAX/Nikkei + fix error type |
| `supabase/functions/crypto-analysis/index.ts` | Novo — edge function IA |
| `src/pages/CryptoAnalysis.tsx` | Novo — página análise |
| `src/components/analysis/*` | Novos — 3 componentes |
| `src/hooks/useCryptoAnalysis.ts` | Novo — hook |
| `src/App.tsx` | Add rota `/analise-ia` |
| `src/components/dashboard/Header.tsx` | Add link Análise IA |
| Migração SQL | Tabelas + bucket |

