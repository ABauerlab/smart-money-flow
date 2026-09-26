import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ---- CORS allowlist ----
// Only browsers on these origins may read the response. CORS doesn't stop a
// direct script/curl call carrying the anon key — that's what the rate limiters
// and payload caps below are for — but it stops other sites' JS from riding a
// visitor's session. Override via ALLOWED_ORIGINS (comma-separated) as a secret.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ||
  'https://fluxodosmercados.com.br,https://www.fluxodosmercados.com.br')
  .split(',').map(s => s.trim()).filter(Boolean);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Hard cap on request body size, checked before JSON parsing, so an oversized
// payload (e.g. someone trying to force a huge AI prompt) is rejected cheaply.
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB — comfortably above a 5000-row CSV as JSON

// Cap how many ranking rows are ever interpolated into the AI prompt. The DB
// query itself is unbounded by symbol count, but the LLM call cost should not be.
const MAX_AI_RANKING_ROWS = 200;

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

// The VPS names each export with its own generation timestamp, e.g.
// "relatorio_2026-09-25_18-39-54.csv". That's the authoritative moment the
// report was produced — Google Drive's own modifiedTime can lag behind it
// (sync delay, or a file re-touched without re-exporting), which is what made
// the dashboard's "last update" freeze at a stale timestamp even after a
// newer file had already landed in Drive. Extracted first; Drive's
// modifiedTime is only a fallback for files that don't carry a timestamp.
function extractTimestampFromFilename(name: string | null): string | null {
  if (!name) return null;
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})[_ ](\d{2})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  return isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
}

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

// Mirrors the client-side parser in src/components/analysis/CsvUploader.tsx exactly,
// so an automation (e.g. Make.com pulling a file from Google Drive) can POST the raw
// .CSV text directly instead of pre-parsing it into rows. Columns: CRIPTO, REPETIÇÃO,
// DATA, HORA, RANK.
function parseCsvText(text: string): Array<{ symbol: string; repetition: number; date?: string; time?: string; rank?: number }> {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows: Array<{ symbol: string; repetition: number; date?: string; time?: string; rank?: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const delim = lines[i].includes(';') ? ';' : ',';
    const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    const symbol = (cols[0] || '').toUpperCase();
    if (i === 0 && /cripto|symbol|ativo|moeda/i.test(cols[0] || '')) continue;
    if (!symbol || !/[A-Z0-9]/.test(symbol)) continue;
    const repetition = parseInt((cols[1] || '1').replace(/[^0-9-]/g, ''), 10);
    rows.push({
      symbol,
      repetition: Number.isFinite(repetition) && repetition > 0 ? repetition : 1,
      date: cols[2] || undefined,
      time: cols[3] || undefined,
      rank: cols[4] ? parseInt(cols[4].replace(/[^0-9-]/g, ''), 10) : undefined,
    });
    if (rows.length >= 5000) break; // matches the row cap enforced below
  }
  return rows;
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

// Rate limiter backed by the `rl_check` Postgres function (see migration) instead of
// an in-memory Map: Edge Functions run as ephemeral, possibly-multiple isolates, so an
// in-memory counter doesn't hold up across instances or restarts. Postgres row locking
// (via INSERT ... ON CONFLICT) makes this atomic and shared across every instance.
async function rateLimitBucket(supabase: any, key: string, max: number, windowSeconds = 60): Promise<{ ok: boolean; retryAfter: number }> {
  const { data, error } = await supabase.rpc('rl_check', { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  if (error) {
    console.error('rl_check error (failing open):', error.message);
    return { ok: true, retryAfter: 0 }; // never let a rate-limit outage take the endpoint down
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: !!row?.allowed, retryAfter: Number(row?.retry_after) || 0 };
}
// AI/DB-expensive actions: tight per accessCode+IP+action budget.
function rateLimit(supabase: any, key: string) { return rateLimitBucket(supabase, key, 8); }
// Blanket per-IP budget covering every action, including ones before the access
// code is known — stops brute-forcing access codes or hammering cheap endpoints.
function ipRateLimit(supabase: any, ip: string) { return rateLimitBucket(supabase, `ip:${ip}`, 30); }
// Tighter, longer-window budget specifically for WRONG access codes — makes
// guessing/brute-forcing a valid code impractical even if the blanket per-IP
// budget above is under an automation's normal traffic. 5 wrong codes per 5
// minutes per IP, independent of which code was tried.
function badCodeRateLimit(supabase: any, ip: string) { return rateLimitBucket(supabase, `badcode:${ip}`, 5, 300); }

// Fire-and-forget audit row. Never throws — an audit-log outage must not be
// able to take the endpoint down or block a legitimate request.
function auditLog(supabase: any, entry: { ip: string; code: string; action: string; success: boolean }) {
  supabase.from('access_audit_log').insert({
    ip: entry.ip,
    access_code_attempted: entry.code,
    action: entry.action,
    success: entry.success,
  }).then(({ error }: any) => { if (error) console.error('audit log insert failed:', error.message); });
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
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição excede o limite permitido.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'analyze';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const ipRl = await ipRateLimit(supabase, ip);
    if (!ipRl.ok) {
      return new Response(
        JSON.stringify({ error: `Limite de requisições atingido. Tente novamente em ${ipRl.retryAfter}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(ipRl.retryAfter) } },
      );
    }

    const reqBody = await req.json().catch(() => ({} as any));
    const accessCodeRaw = typeof reqBody.accessCode === 'string' ? reqBody.accessCode.trim() : '';
    if (!accessCodeRaw || accessCodeRaw.length < 4 || accessCodeRaw.length > 64) {
      return new Response(
        JSON.stringify({ error: 'Código de acesso obrigatório (mínimo 4 caracteres).' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const accessCode = accessCodeRaw;

    // Validate against the allow-list of active client codes. A wrong code counts
    // against a dedicated, tighter per-IP budget (see badCodeRateLimit) on top of
    // the blanket ipRateLimit above, so guessing codes is rate-limited twice over.
    const { data: codeRow } = await supabase
      .from('access_codes')
      .select('code, active')
      .eq('code', accessCode)
      .maybeSingle();

    if (!codeRow || !codeRow.active) {
      const badRl = await badCodeRateLimit(supabase, ip);
      auditLog(supabase, { ip, code: accessCode, action, success: false });
      if (!badRl.ok) {
        return new Response(
          JSON.stringify({ error: `Muitas tentativas com código inválido. Tente novamente em ${badRl.retryAfter}s.` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(badRl.retryAfter) } },
        );
      }
      return new Response(
        JSON.stringify({ error: 'Código de acesso inválido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const expensiveActions = new Set(['analyze', 'generate-periodic', 'refresh-lists']);
    // Audit only meaningful (mutating) successful actions, to keep log volume sane
    // against the dashboard's 60s polling of read-only actions like latest-round.
    if (expensiveActions.has(action) || action === 'analyze-csv' || action === 'delete') {
      auditLog(supabase, { ip, code: accessCode, action, success: true });
      supabase.from('access_codes').update({ last_used_at: new Date().toISOString() }).eq('code', accessCode)
        .then(({ error }: any) => { if (error) console.error('last_used_at update failed:', error.message); });
    }

    if (expensiveActions.has(action)) {
      const rl = await rateLimit(supabase, `${accessCode}:${ip}:${action}`);
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

    // ========== LATEST ROUND (operational dashboard) ==========
    // A "round" = one ingested CSV (one crypto_report_submissions row). Returns the
    // selected round's ranking with a trend vs. the immediately previous round, plus
    // the list of today's rounds for the quick switcher. Falls back to the most recent
    // round ever recorded when nothing has landed yet today, so the dashboard never
    // goes blank while waiting for the next Make.com run.
    if (action === 'latest-round') {
      const today = fmtDate(new Date());

      const roundCols = 'id, created_at, report_date, source_file_name, source_modified_time, crypto_analyses(title)';
      const { data: todayRounds, error: todayErr } = await supabase
        .from('crypto_report_submissions')
        .select(roundCols)
        .eq('access_code', accessCode)
        .eq('report_date', today)
        .order('created_at', { ascending: false });
      if (todayErr) throw todayErr;

      let rounds = todayRounds || [];
      let isFallbackFromPreviousDay = false;
      if (rounds.length === 0) {
        const { data: lastRound, error: lastErr } = await supabase
          .from('crypto_report_submissions')
          .select(roundCols)
          .eq('access_code', accessCode)
          .order('created_at', { ascending: false })
          .limit(1);
        if (lastErr) throw lastErr;
        rounds = lastRound || [];
        isFallbackFromPreviousDay = rounds.length > 0;
      }

      if (rounds.length === 0) {
        return new Response(JSON.stringify({ latest: null, rounds: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requestedId = typeof reqBody.submissionId === 'string' ? reqBody.submissionId : null;
      const selectedIdx = requestedId ? Math.max(0, rounds.findIndex(r => r.id === requestedId)) : 0;
      const selected = rounds[selectedIdx];
      const previousRound = rounds[selectedIdx + 1] || null;

      // Group by symbol in case a round's raw rows include repeats for the same symbol.
      async function groupedMentions(submissionId: string): Promise<Map<string, { count: number; rank: number | null }>> {
        const { data, error } = await supabase
          .from('crypto_mentions')
          .select('symbol, repetition, rank')
          .eq('submission_id', submissionId);
        if (error) throw error;
        const map = new Map<string, { count: number; rank: number | null }>();
        for (const m of data || []) {
          const cur = map.get(m.symbol);
          if (cur) { cur.count += Number(m.repetition) || 0; }
          else { map.set(m.symbol, { count: Number(m.repetition) || 0, rank: m.rank ?? null }); }
        }
        return map;
      }

      const [selectedMap, previousMap] = await Promise.all([
        groupedMentions(selected.id),
        previousRound ? groupedMentions(previousRound.id) : Promise.resolve(new Map()),
      ]);

      const rankings = [...selectedMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([symbol, cur], i) => {
          const prev = previousMap.get(symbol);
          const trend: 'up' | 'down' | 'flat' | 'new' =
            !prev ? 'new' : cur.count > prev.count ? 'up' : cur.count < prev.count ? 'down' : 'flat';
          return {
            symbol,
            count: cur.count,
            rank: cur.rank ?? i + 1,
            trend,
            previousCount: prev?.count ?? null,
          };
        });

      return new Response(JSON.stringify({
        selectedRoundId: selected.id,
        isLatest: selectedIdx === 0,
        isFallbackFromPreviousDay,
        timestamp: selected.source_modified_time || selected.created_at,
        sourceFileName: selected.source_file_name,
        title: (selected as any).crypto_analyses?.title || null,
        rankings,
        rounds: rounds.map(r => ({
          id: r.id,
          timestamp: r.source_modified_time || r.created_at,
          sourceFileName: r.source_file_name,
        })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        const laText = `### Lista Geral (somatório)\n${altaRankings.slice(0, MAX_AI_RANKING_ROWS).map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`;
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
      const { rows: rowsIn, csvText, title: titleRaw, reportDate: fallbackDate, fileCount } = reqBody;
      const title = typeof titleRaw === 'string' ? titleRaw.slice(0, 200) : titleRaw;
      const sourceFileId = typeof reqBody.sourceFileId === 'string' ? reqBody.sourceFileId.slice(0, 200) : null;
      const sourceFileName = typeof reqBody.sourceFileName === 'string' ? reqBody.sourceFileName.slice(0, 300) : null;
      const driveModifiedTime = typeof reqBody.sourceModifiedTime === 'string' && !isNaN(Date.parse(reqBody.sourceModifiedTime))
        ? new Date(reqBody.sourceModifiedTime).toISOString()
        : null;
      const sourceModifiedTime = extractTimestampFromFilename(sourceFileName) || driveModifiedTime;

      // Idempotency: an automation (Make.com) re-polling the same Drive file must not
      // create a second round. One unique index on source_file_id enforces this at the
      // DB level too — this check just returns the existing round instead of erroring.
      if (sourceFileId) {
        const { data: existing } = await supabase
          .from('crypto_report_submissions')
          .select('id, analysis_id, crypto_analyses(id, title, summary, crypto_symbols, created_at)')
          .eq('source_file_id', sourceFileId)
          .eq('access_code', accessCode)
          .maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({
            duplicate: true,
            analysis: existing.crypto_analyses,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Two ways in: pre-parsed `rows` (the web UI, after client-side CSV parsing) or
      // raw `csvText` (e.g. a Make.com/automation scenario posting the file's contents
      // directly — parsed here with the exact same rules as the client-side parser).
      let rows = Array.isArray(rowsIn) ? rowsIn : null;
      if (!rows && typeof csvText === 'string' && csvText.trim().length > 0) {
        if (csvText.length > 2_000_000) {
          return new Response(JSON.stringify({ error: 'csvText excede o limite de tamanho permitido.' }), {
            status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        rows = parseCsvText(csvText);
      }

      if (!rows || rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma linha de CSV fornecida (envie `rows` ou `csvText`).' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (rows.length > 5000) {
        return new Response(JSON.stringify({ error: 'Máximo de 5000 linhas por envio.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prefer the calendar date implied by the filename's own timestamp over the
      // caller-supplied reportDate (which Make derives from Drive's modifiedTime and
      // can drift a day off around midnight syncs).
      const defaultDate = (sourceModifiedTime && fmtDate(new Date(sourceModifiedTime)))
        || parseDate(fallbackDate)
        || fmtDate(new Date());

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

      const { data: submission, error: submissionError } = await supabase
        .from('crypto_report_submissions')
        .insert({
          analysis_id: analysis.id,
          report_type: 'alta',
          report_date: defaultDate,
          session_time: now.getHours() < 14 ? 'morning' : 'night',
          access_code: accessCode || null,
          source_file_id: sourceFileId,
          source_file_name: sourceFileName,
          source_modified_time: sourceModifiedTime,
        })
        .select()
        .single();

      if (submissionError) {
        // Unique violation on source_file_id: a concurrent request beat this one to the
        // same Drive file. Discard the orphaned analysis row just created and return the
        // winning round instead, so the caller still gets a normal (non-error) response.
        await supabase.from('crypto_analyses').delete().eq('id', analysis.id);
        if (sourceFileId && submissionError.code === '23505') {
          const { data: existing } = await supabase
            .from('crypto_report_submissions')
            .select('crypto_analyses(id, title, summary, crypto_symbols, created_at)')
            .eq('source_file_id', sourceFileId)
            .eq('access_code', accessCode)
            .maybeSingle();
          return new Response(JSON.stringify({ duplicate: true, analysis: existing?.crypto_analyses }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw submissionError;
      }

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
        const laText = `### Lista Geral (somatório)\n${altaRankings.slice(0, MAX_AI_RANKING_ROWS).map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`;
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
