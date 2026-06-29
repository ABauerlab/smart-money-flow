import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Returns Monday->Friday window for the ISO week containing `ref`.
function getMonFriWeek(ref: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = d.getUTCDay() || 7; // 1=Mon..7=Sun
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - (dow - 1));
  const friday = new Date(monday); friday.setUTCDate(monday.getUTCDate() + 4);
  return { start: monday, end: friday };
}

// Week-of-month index (1..4), based on calendar day, capping a 5th week into 4.
function weekOfMonth(d: Date): number {
  return Math.min(4, Math.ceil(d.getUTCDate() / 7));
}

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

// Parse a date string in DD/MM/YYYY, YYYY-MM-DD or DD-MM-YYYY -> 'YYYY-MM-DD' (or null).
function parseDate(input: any): string | null {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function normalizeRegion(r: any): 'asia' | 'west' {
  return r === 'asia' ? 'asia' : 'west';
}

const REGION_LABEL: Record<string,string> = { asia: 'Mercado Asiático', west: 'Mercado Ocidental (Europa + Américas)' };

const MONTHS_PT = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

// Sum the REPETIÇÃO column per symbol; tie-break by most recent date/time.
function sumMentions(mentions: any[]): { symbol: string; count: number }[] {
  const agg: Record<string, { count: number; last: string }> = {};
  for (const m of mentions) {
    const sym = String(m.symbol || '').toUpperCase();
    if (!sym) continue;
    const rep = Number(m.repetition);
    const value = Number.isFinite(rep) && rep > 0 ? rep : 1;
    const stamp = `${m.report_date || ''} ${m.report_time || ''}`.trim();
    if (!agg[sym]) agg[sym] = { count: 0, last: '' };
    agg[sym].count += value;
    if (stamp > agg[sym].last) agg[sym].last = stamp;
  }
  return Object.entries(agg)
    .map(([symbol, v]) => ({ symbol, count: v.count, last: v.last }))
    .sort((a, b) => (b.count - a.count) || (b.last > a.last ? 1 : -1))
    .map(({ symbol, count }) => ({ symbol, count }));
}

const SYSTEM_PROMPT = `Você é o Consolidador CriptoEx Pro, responsável pela consolidação de relatórios de criptoativos da plataforma Fluxo Dos Mercados.

## ESCOPO
- Mercado único e geral de cripto. NÃO existe separação por região.
- Trate apenas listas de Alta. Não há Lista de Baixa.
- NUNCA misture dados entre semanas distintas. NUNCA misture dados entre meses distintos.

## PROCESSAMENTO
- Os relatórios chegam em arquivos .CSV com as colunas: CRIPTO (coluna 1), REPETIÇÃO (coluna 2), DATA (coluna 3), HORA (coluna 4), RANK (coluna 5).
- Leia 100% das linhas de cada arquivo. É PROIBIDO ignorar ativos.

## ARITMÉTICA (regra principal)
- Ordene os ativos listados em todas as listas anexas em uma lista única e geral, conforme o número total de repetições de cada ativo e conforme a SOMA das suas repetições dispostas na coluna 2 (REPETIÇÃO) das planilhas.
- Realize a SOMA MATEMÁTICA REAL dos valores da coluna REPETIÇÃO por ativo, somando as ocorrências em todos os arquivos do MESMO recorte (dia/semana/mês). NÃO altere nenhum valor.
- NUNCA conte apenas o número de linhas — some os valores numéricos da coluna 2.

## RANKING
- Ordene a lista geral pela soma total de repetições (descendente).
- Em caso de empate, use a data/hora mais recente como desempate.

## JANELAS DE TEMPO
- A semana vai de segunda a sexta-feira. Ao final da sexta a semana fecha; na segunda começa um novo somatório do zero.
- Ao completar um mês de somatórios, consolida-se um relatório mensal das semanas daquele mês (cada semana permanece visível separadamente).

## FORMATO DE SAÍDA (obrigatório)
Use linguagem técnica e neutra. NÃO use emojis. Use Markdown.

Sempre comece com:
CRYPTOS_DETECTED: BTC,ETH,SOL,...

### Período
- Janela: <data inicial> → <data final>
- Tipo de janela: Dia | Semana N do mês | Mês

### Quantidade de Arquivos
- Total de arquivos/relatórios processados neste recorte.

### Lista Geral (somatório)
| Pos | Ativo | Soma Repetições | Última Ocorrência |
|-----|-------|-----------------|-------------------|
| 1   | BTC   | 12              | 2026-04-29 14:30  |

### Destaques
- Ativos com maior soma absoluta no recorte.
- Novos ativos que apareceram.

### Log de Inconsistências
- Linhas ilegíveis, colunas ausentes, valores não numéricos.
- Se nada foi encontrado: "Nenhuma inconsistência detectada."

## RESTRIÇÕES
- NÃO faça recomendações financeiras.
- NÃO use emojis.
- Linguagem técnica, neutra e organizacional.`;

// ====== AI call abstraction ======
async function callGeminiOfficial(messages: any[], wantsVision: boolean): Promise<{ ok: boolean; status: number; content: string; model: string; error?: string }> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return { ok: false, status: 0, content: '', model: 'none', error: 'no key' };

  const model = wantsVision ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

  let systemInstruction: string | undefined;
  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      continue;
    }
    const parts: any[] = [];
    if (typeof m.content === 'string') {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p.type === 'text') parts.push({ text: p.text });
        else if (p.type === 'image_url') {
          const url: string = p.image_url?.url || '';
          const match = url.match(/^data:(.+?);base64,(.+)$/);
          if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }

  const body: any = { contents };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (resp.ok) {
    const data = await resp.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    return { ok: true, status: 200, content, model: `google/${model} (official)` };
  }
  const errText = await resp.text();
  console.error('Gemini official error:', resp.status, errText);
  return { ok: false, status: resp.status, content: '', model: `google/${model} (official)`, error: errText };
}

async function callLovableGateway(messages: any[], wantsVision: boolean): Promise<{ ok: boolean; status: number; content: string; model: string; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return { ok: false, status: 500, content: '', model: 'none', error: 'Lovable AI Gateway não configurado' };
  const model = wantsVision ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  });
  if (resp.ok) {
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { ok: true, status: 200, content, model: `${model} (gateway)` };
  }
  const errText = await resp.text();
  console.error('Lovable AI error:', resp.status, errText);
  return { ok: false, status: resp.status, content: '', model, error: errText };
}

async function callAI(messages: any[], opts: { wantsVision?: boolean } = {}): Promise<{ ok: boolean; status: number; content: string; model: string; error?: string }> {
  const wantsVision = !!opts.wantsVision;
  const official = await callGeminiOfficial(messages, wantsVision);
  if (official.ok) return official;
  if (official.error && official.error !== 'no key') {
    console.log('Falling back to Lovable Gateway after official Gemini error:', official.status);
  }
  return await callLovableGateway(messages, wantsVision);
}

// In-memory rate limiter
const RL_WINDOW_MS = 60_000;
const RL_MAX = 8;
const rlBuckets = new Map<string, number[]>();
function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = (rlBuckets.get(key) || []).filter(t => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX) {
    const retryAfter = Math.ceil((RL_WINDOW_MS - (now - arr[0])) / 1000);
    return { ok: false, retryAfter };
  }
  arr.push(now);
  rlBuckets.set(key, arr);
  return { ok: true, retryAfter: 0 };
}

// Resolve a date window from periodType + windowIndex (relative to "now").
// periodType: 'daily' | 'weekly' | 'monthly'
// windowIndex semantics:
//   daily   : 0 = today, 1 = yesterday, ... up to ~30
//   weekly  : 0 = current week (Mon-Fri); 1..N = previous weeks (also Mon-Fri)
//   monthly : 0 = current month; 1..N = previous calendar months
function resolveWindow(periodType: string, windowIndex: number, now = new Date()): { start: string; end: string; label: string } {
  const idx = Math.max(0, Math.min(60, Number(windowIndex) || 0));
  if (periodType === 'daily') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - idx);
    const s = fmtDate(d);
    return { start: s, end: s, label: idx === 0 ? 'Hoje' : `D-${idx}` };
  }
  if (periodType === 'weekly') {
    const ref = new Date(now); ref.setUTCDate(ref.getUTCDate() - idx * 7);
    const { start, end } = getMonFriWeek(ref);
    const wom = weekOfMonth(start);
    const label = `SEMANA ${wom} - ${MONTHS_PT[start.getUTCMonth()]}`;
    return { start: fmtDate(start), end: fmtDate(end), label };
  }
  // monthly
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() - idx;
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  return { start: fmtDate(start), end: fmtDate(end), label: `${MONTHS_PT[start.getUTCMonth()]} ${start.getUTCFullYear()}` };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'analyze';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const reqBody = await req.json().catch(() => ({} as any));
    const accessCodeRaw = typeof reqBody.accessCode === 'string' ? reqBody.accessCode.trim() : '';
    if (!accessCodeRaw || accessCodeRaw.length < 4 || accessCodeRaw.length > 64) {
      return new Response(
        JSON.stringify({ error: 'Código de acesso obrigatório (mínimo 4 caracteres).' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const accessCode = accessCodeRaw;

    const expensiveActions = new Set(['analyze', 'generate-periodic', 'refresh-lists']);
    if (expensiveActions.has(action)) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const rl = rateLimit(`${accessCode}:${ip}:${action}`);
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: `Limite de requisições atingido. Tente novamente em ${rl.retryAfter}s.` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) } },
        );
      }
    }

    // ========== DELETE ANALYSES ==========
    if (action === 'delete') {
      const { ids } = reqBody;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhum ID fornecido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: ownedAnalyses } = await supabase
        .from('crypto_analyses')
        .select('id')
        .in('id', ids)
        .eq('access_code', accessCode);
      const ownedIds = (ownedAnalyses || []).map(a => a.id);
      if (ownedIds.length === 0) {
        return new Response(JSON.stringify({ success: true, deleted: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await supabase.from('crypto_analysis_images').delete().in('analysis_id', ownedIds);
      const { data: subs } = await supabase
        .from('crypto_report_submissions')
        .select('id')
        .in('analysis_id', ownedIds)
        .eq('access_code', accessCode);
      if (subs && subs.length > 0) {
        const subIds = subs.map(s => s.id);
        await supabase.from('crypto_mentions').delete().in('submission_id', subIds).eq('access_code', accessCode);
        await supabase.from('crypto_report_submissions').delete().in('analysis_id', ownedIds).eq('access_code', accessCode);
      }
      const { error } = await supabase
        .from('crypto_analyses')
        .delete()
        .in('id', ownedIds)
        .eq('access_code', accessCode);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, deleted: ownedIds.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== HISTORY ==========
    if (action === 'history') {
      const region = reqBody.region ? normalizeRegion(reqBody.region) : null;
      let q = supabase
        .from('crypto_analyses')
        .select('*, crypto_analysis_images(*)')
        .eq('access_code', accessCode)
        .order('created_at', { ascending: false })
        .limit(50);
      if (region) q = q.eq('region', region);
      const { data: analyses, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ analyses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== RANKINGS (single market, summed by repetition + window) ==========
    if (action === 'rankings') {
      const periodType = (reqBody.periodType || 'weekly') as string;
      const windowIndex = Number(reqBody.windowIndex || 0);
      const win = resolveWindow(periodType, windowIndex);

      const { data: mentions, error } = await supabase
        .from('crypto_mentions')
        .select('symbol, repetition, report_date, report_time')
        .eq('access_code', accessCode)
        .gte('report_date', win.start)
        .lte('report_date', win.end);
      if (error) throw error;

      const altaRankings = sumMentions(mentions || []);

      return new Response(JSON.stringify({
        altaRankings,
        window: { ...win, periodType, windowIndex },
        totalMentions: (mentions || []).reduce((s: number, m: any) => s + (Number(m.repetition) || 0), 0),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== PERIODIC REPORTS LIST ==========
    if (action === 'periodic-reports') {
      const region = reqBody.region ? normalizeRegion(reqBody.region) : null;
      let q = supabase
        .from('crypto_periodic_reports')
        .select('*')
        .eq('access_code', accessCode)
        .order('created_at', { ascending: false })
        .limit(40);
      if (region) q = q.eq('region', region);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ reports: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== GENERATE PERIODIC REPORT (alta only, by region + window) ==========
    if (action === 'generate-periodic') {
      const periodType = (reqBody.periodType || 'weekly') as string;
      if (!['daily','weekly','monthly'].includes(periodType)) {
        return new Response(JSON.stringify({ error: 'periodType deve ser daily, weekly ou monthly' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const windowIndex = Number(reqBody.windowIndex || 0);
      const win = resolveWindow(periodType, windowIndex);

      const { data: mentions, error: mError } = await supabase
        .from('crypto_mentions')
        .select('symbol, repetition, report_date, report_time')
        .eq('access_code', accessCode)
        .gte('report_date', win.start)
        .lte('report_date', win.end);
      if (mError) throw mError;

      const altaRankings = sumMentions(mentions || []);
      const rankings = altaRankings.map(r => ({ symbol: r.symbol, total: r.count, alta: r.count, baixa: 0, volume: 0 }));

      let aiAnalysis = '';
      let aiModelUsed = 'none';
      if (rankings.length > 0) {
        const laText = `### Lista Geral (somatório)\n${altaRankings.map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`;
        const aiResult = await callAI([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Relatório consolidado.\nTipo: ${periodType} (${win.label}).\nJanela: ${win.start} a ${win.end}.\n\n${laText}\n\nTotal de criptos rastreadas: ${rankings.length}\nTotal de repetições no recorte: ${(mentions || []).reduce((s: number, m: any) => s + (Number(m.repetition) || 0), 0)}\n\nAnalise os padrões deste recorte ISOLADO. Não some nem compare com outros recortes. Não use emojis.` },
        ]);
        if (aiResult.ok) { aiAnalysis = aiResult.content; aiModelUsed = aiResult.model; }
      }

      const { data: report, error: insertErr } = await supabase
        .from('crypto_periodic_reports')
        .insert({
          period_type: periodType,
          period_start: win.start,
          period_end: win.end,
          year: new Date().getFullYear(),
          week_number: getISOWeek(new Date(win.start)),
          rankings: rankings as any,
          summary: `${win.label} — ${altaRankings.length} criptos`,
          ai_analysis: aiAnalysis,
          access_code: accessCode || null,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ report, aiModelUsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== ANALYZE CSV (main upload — single market) ==========
    if (action === 'analyze' || action === 'analyze-csv') {
      const { rows, title, reportDate: fallbackDate, fileCount } = reqBody;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma linha de CSV fornecida.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (rows.length > 5000) {
        return new Response(JSON.stringify({ error: 'Máximo de 5000 linhas por envio.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const defaultDate = parseDate(fallbackDate) || fmtDate(new Date());

      const mentionRows: any[] = [];
      let skipped = 0;
      for (const r of rows) {
        const symbol = String(r.symbol ?? r.crypto ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!symbol || symbol.length > 12) { skipped++; continue; }
        const repRaw = Number(String(r.repetition ?? r.rep ?? '1').replace(',', '.'));
        const repetition = Number.isFinite(repRaw) && repRaw > 0 ? Math.round(repRaw) : 1;
        // The envio date chosen by the user is authoritative for the whole batch.
        // A single daily cycle (Londres 05h, América 10h30/13h30, Ásia 21h) must be
        // attributed to the same consolidation day even if the CSV's own DATA column
        // crosses midnight (the Ásia session). This keeps the Daily/Weekly windows
        // consistent with what the "Enviar" tab shows.
        const reportDate = defaultDate;
        const time = typeof r.time === 'string' ? r.time.trim().slice(0, 8) : null;
        const rankRaw = Number(r.rank);
        const rank = Number.isFinite(rankRaw) ? Math.round(rankRaw) : null;
        const d = new Date(reportDate + 'T00:00:00Z');
        mentionRows.push({
          symbol,
          repetition,
          report_type: 'alta',
          report_date: reportDate,
          report_time: time,
          rank,
          week_number: getISOWeek(d),
          year: d.getUTCFullYear(),
          access_code: accessCode || null,
        });
      }

      if (mentionRows.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma linha válida encontrada no CSV.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Summed view of this upload (single market).
      const ranking = sumMentions(mentionRows);
      const allCryptos = ranking.map(r => r.symbol);
      const datesInUpload = [...new Set(mentionRows.map(m => m.report_date))].sort();

      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const standardTitle = (title && String(title).trim()) || `${dateStr} - Envio (${mentionRows.length} linhas)`;

      const summary = [
        `### Envio consolidado`,
        `- Arquivos: ${Number(fileCount) || 1}`,
        `- Linhas válidas: ${mentionRows.length}${skipped ? ` (ignoradas: ${skipped})` : ''}`,
        `- Datas: ${datesInUpload.join(', ')}`,
        ``,
        `### Lista Geral (somatório por REPETIÇÃO)`,
        ...ranking.map((r, i) => `${i + 1}. ${r.symbol}: ${r.count}`),
      ].join('\n');

      const { data: analysis, error: insertError } = await supabase
        .from('crypto_analyses')
        .insert({
          title: standardTitle,
          summary,
          period_type: 'daily',
          crypto_symbols: allCryptos,
          ai_model_used: 'csv-import',
          access_code: accessCode || null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const { data: submission } = await supabase
        .from('crypto_report_submissions')
        .insert({
          analysis_id: analysis.id,
          report_type: 'alta',
          report_date: defaultDate,
          session_time: now.getHours() < 14 ? 'morning' : 'night',
          access_code: accessCode || null,
        })
        .select()
        .single();

      if (submission) {
        const toInsert = mentionRows.map(m => ({ ...m, submission_id: submission.id }));
        await supabase.from('crypto_mentions').insert(toInsert);
      }

      return new Response(JSON.stringify({
        analysis: { ...analysis, detectedCryptos: allCryptos, ranking, totalRows: mentionRows.length, skipped },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // ========== REFRESH LISTS (region + window aware) ==========
    if (action === 'refresh-lists') {
      const periodType = (reqBody.periodType || 'weekly') as string;
      if (!['daily','weekly','monthly'].includes(periodType)) {
        return new Response(JSON.stringify({ error: 'periodType deve ser daily, weekly ou monthly' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const windowIndex = Number(reqBody.windowIndex || 0);
      const win = resolveWindow(periodType, windowIndex);

      const { data: mentions, error: mErr } = await supabase
        .from('crypto_mentions')
        .select('symbol, repetition, report_date, report_time')
        .eq('access_code', accessCode)
        .gte('report_date', win.start)
        .lte('report_date', win.end);
      if (mErr) throw mErr;

      const altaRankings = sumMentions(mentions || []);
      const rankings = altaRankings.map(r => ({ symbol: r.symbol, total: r.count, alta: r.count, baixa: 0, volume: 0 }));

      let aiAnalysis = '';
      let aiModelUsed = 'none';
      if (rankings.length > 0) {
        const laText = `### Lista Geral (somatório)\n${altaRankings.map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`;
        const aiResult = await callAI([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Atualização de listas.\nTipo: ${periodType} (${win.label}).\nJanela: ${win.start} a ${win.end}.\n\n${laText}\n\nTotal de criptos: ${rankings.length}\nTotal de repetições: ${(mentions || []).reduce((s: number, m: any) => s + (Number(m.repetition) || 0), 0)}\n\nReanalise os padrões atuais deste recorte isolado. Não use emojis.` },
        ]);
        if (aiResult.ok) { aiAnalysis = aiResult.content; aiModelUsed = aiResult.model; }
      }

      const { data: report, error: insertErr } = await supabase
        .from('crypto_periodic_reports')
        .insert({
          period_type: periodType,
          period_start: win.start,
          period_end: win.end,
          year: new Date().getFullYear(),
          week_number: getISOWeek(new Date(win.start)),
          rankings: rankings as any,
          summary: `[ATUALIZAÇÃO] ${win.label} — ${altaRankings.length} criptos`,
          ai_analysis: aiAnalysis,
          access_code: accessCode || null,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({
        success: true, altaRankings, report, aiModelUsed,
        window: { ...win, periodType, windowIndex },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('crypto-analysis error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
