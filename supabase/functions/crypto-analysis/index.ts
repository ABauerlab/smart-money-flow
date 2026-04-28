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

function getWeekBounds(year: number, week: number): { start: string; end: string } {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = jan1.getUTCDay() || 7;
  const firstMonday = new Date(jan1);
  firstMonday.setUTCDate(jan1.getUTCDate() + (1 - dayOfWeek) + (week - 1) * 7);
  const sunday = new Date(firstMonday);
  sunday.setUTCDate(firstMonday.getUTCDate() + 6);
  return {
    start: firstMonday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

const SYSTEM_PROMPT = `Você é o consolidador oficial de relatórios do robô CriptoEx para a plataforma Fluxo Dos Mercados.

## SUA TAREFA
Ler relatórios enviados, separar RA (Relatório de Alta) e RB (Relatório de Baixa), extrair criptomoedas, contar repetições e ordenar.

## REGRAS DE CLASSIFICAÇÃO
- Arquivos com "RA" no nome = Relatório de Alta -> alimentam a Lista de Alta (LA)
- Arquivos com "RB" no nome = Relatório de Baixa -> alimentam a Lista de Baixa (LB)
- NUNCA misture RA com RB. São listas completamente independentes.

## COLUNAS DOS RELATÓRIOS
Cada relatório contém as colunas: Cripto, Repetição, Data, Hora, Rank.

## PROCESSAMENTO
1. Ler todos os relatórios enviados
2. Separar quais são RA e quais são RB
3. Para cada grupo (RA e RB separadamente):
   a. Extrair os nomes/símbolos das criptomoedas
   b. Somar as repetições de cada cripto
   c. Ordenar por número total de repetições (descendente)
4. Em caso de empate, priorizar a cripto com presença mais recente
5. Persistindo empate, listar ambas na mesma posição

## FORMATO DE RESPOSTA
Use linguagem técnica, neutra, profissional. NÃO utilize emojis em nenhuma parte da resposta.

Sempre responda com:

CRYPTOS_DETECTED: BTC,ETH,SOL,...

### Resumo do Envio
- Tipo do relatório: RA ou RB
- Data e período identificados
- Quantidade de criptos encontradas

### Lista de Alta (LA) — se houver dados RA
| Pos | Cripto | Repetições | Rank |
|-----|--------|-----------|------|
| 1   | BTC    | 5         | #1   |
(preencha com os dados reais, ordenada por repetições descendente)

### Lista de Baixa (LB) — se houver dados RB
| Pos | Cripto | Repetições | Rank |
|-----|--------|-----------|------|
| 1   | ETH    | 3         | #1   |
(preencha com os dados reais, ordenada por repetições descendente)

### Destaques
- Criptos com maior crescimento em repetições
- Padrões identificados

### Inconsistências
- Dados faltantes ou irregulares encontrados

## RESTRIÇÕES
- Considerar apenas relatórios a partir de 06/04/2026
- Linguagem neutra, técnica e organizacional
- NÃO faça recomendação financeira
- NÃO use emojis
- Use formato Markdown`;

// ====== AI call abstraction ======
// Priority: Official Gemini API (GEMINI_API_KEY) -> Lovable AI Gateway fallback
async function callGeminiOfficial(messages: any[], wantsVision: boolean): Promise<{ ok: boolean; status: number; content: string; model: string; error?: string }> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return { ok: false, status: 0, content: '', model: 'none', error: 'no key' };

  const model = wantsVision ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

  // Convert OpenAI-style messages -> Gemini contents
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
  // Try official Gemini first if configured
  const official = await callGeminiOfficial(messages, wantsVision);
  if (official.ok) return official;
  // If official failed (and key existed) but with quota/rate, fall through to gateway
  if (official.error && official.error !== 'no key') {
    console.log('Falling back to Lovable Gateway after official Gemini error:', official.status);
  }
  return await callLovableGateway(messages, wantsVision);
}


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'analyze';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== DELETE ANALYSES ==========
    if (action === 'delete') {
      const body = await req.json();
      const { ids, accessCode } = body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhum ID fornecido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('crypto_analysis_images').delete().in('analysis_id', ids);
      const { data: subs } = await supabase.from('crypto_report_submissions').select('id').in('analysis_id', ids);
      if (subs && subs.length > 0) {
        const subIds = subs.map(s => s.id);
        await supabase.from('crypto_mentions').delete().in('submission_id', subIds);
        await supabase.from('crypto_report_submissions').delete().in('analysis_id', ids);
      }
      let q = supabase.from('crypto_analyses').delete().in('id', ids);
      if (accessCode) q = q.eq('access_code', accessCode);
      const { error } = await q;
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== HISTORY ==========
    if (action === 'history') {
      const body = await req.json().catch(() => ({}));
      let query = supabase
        .from('crypto_analyses')
        .select('*, crypto_analysis_images(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (body.accessCode) query = query.eq('access_code', body.accessCode);
      const { data: analyses, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ analyses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== REPETITION RANKINGS ==========
    if (action === 'rankings') {
      const body = await req.json();
      const { periodType, year, weekNumber, accessCode } = body;

      let query = supabase.from('crypto_mentions').select('symbol, report_type');
      if (accessCode) query = query.eq('access_code', accessCode);

      if (periodType === 'weekly' && weekNumber && year) {
        query = query.eq('week_number', weekNumber).eq('year', year);
      }

      const { data: mentions, error } = await query;
      if (error) throw error;

      // Separate into alta and baixa
      const altaCounts: Record<string, number> = {};
      const baixaCounts: Record<string, number> = {};

      for (const m of (mentions || [])) {
        if (m.report_type === 'alta') {
          altaCounts[m.symbol] = (altaCounts[m.symbol] || 0) + 1;
        } else if (m.report_type === 'baixa') {
          baixaCounts[m.symbol] = (baixaCounts[m.symbol] || 0) + 1;
        }
      }

      const altaRankings = Object.entries(altaCounts)
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count);

      const baixaRankings = Object.entries(baixaCounts)
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count);

      // Also compute combined for backward compat
      const allCounts: Record<string, { total: number; alta: number; baixa: number; volume: number }> = {};
      for (const m of (mentions || [])) {
        if (!allCounts[m.symbol]) allCounts[m.symbol] = { total: 0, alta: 0, baixa: 0, volume: 0 };
        allCounts[m.symbol].total++;
        if (m.report_type === 'alta') allCounts[m.symbol].alta++;
        if (m.report_type === 'baixa') allCounts[m.symbol].baixa++;
        if (m.report_type === 'volume') allCounts[m.symbol].volume++;
      }
      const rankings = Object.entries(allCounts)
        .map(([symbol, c]) => ({ symbol, ...c }))
        .sort((a, b) => b.total - a.total);

      return new Response(JSON.stringify({ rankings, altaRankings, baixaRankings }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== PERIODIC REPORTS ==========
    if (action === 'periodic-reports') {
      const body = await req.json().catch(() => ({}));
      let query = supabase
        .from('crypto_periodic_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (body.accessCode) query = query.eq('access_code', body.accessCode);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ reports: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== GENERATE PERIODIC REPORT ==========
    if (action === 'generate-periodic') {
      const body = await req.json();
      const { periodType, accessCode } = body;

      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = now.getFullYear();

      // Day-based windows for ALL periods (more accurate than ISO week buckets)
      const periodToDays: Record<string, number> = {
        three_days: 3,
        weekly: 7,
        biweekly: 15,
        triweekly: 21,
        monthly: 30,
        bimonthly: 60,
        quarterly: 90,
        semiannual: 180,
        annual: 365,
      };
      const days = periodToDays[periodType];
      if (!days) throw new Error('Tipo de período inválido');

      const endDate = new Date(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (days - 1));
      const periodStart = startDate.toISOString().split('T')[0];
      const periodEnd = endDate.toISOString().split('T')[0];

      let mentionsQuery = supabase
        .from('crypto_mentions')
        .select('symbol, report_type, report_date')
        .gte('report_date', periodStart)
        .lte('report_date', periodEnd);

      if (accessCode) mentionsQuery = mentionsQuery.eq('access_code', accessCode);

      const { data: mentions, error: mError } = await mentionsQuery;
      if (mError) throw mError;

      // Separate LA and LB
      const altaCounts: Record<string, number> = {};
      const baixaCounts: Record<string, number> = {};

      for (const m of (mentions || [])) {
        if (m.report_type === 'alta') {
          altaCounts[m.symbol] = (altaCounts[m.symbol] || 0) + 1;
        } else if (m.report_type === 'baixa') {
          baixaCounts[m.symbol] = (baixaCounts[m.symbol] || 0) + 1;
        }
      }

      const altaRankings = Object.entries(altaCounts)
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count);

      const baixaRankings = Object.entries(baixaCounts)
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count);

      // Combined rankings for storage
      const allCounts: Record<string, { total: number; alta: number; baixa: number; volume: number }> = {};
      for (const m of (mentions || [])) {
        if (!allCounts[m.symbol]) allCounts[m.symbol] = { total: 0, alta: 0, baixa: 0, volume: 0 };
        allCounts[m.symbol].total++;
        if (m.report_type === 'alta') allCounts[m.symbol].alta++;
        if (m.report_type === 'baixa') allCounts[m.symbol].baixa++;
        if (m.report_type === 'volume') allCounts[m.symbol].volume++;
      }
      const rankings = Object.entries(allCounts)
        .map(([symbol, c]) => ({ symbol, ...c }))
        .sort((a, b) => b.total - a.total);

      let aiAnalysis = '';
      let aiModelUsed = 'none';

      if (rankings.length > 0) {
        const periodLabels: Record<string, string> = {
          three_days: '3 dias', weekly: '7 dias', biweekly: '15 dias', triweekly: '21 dias',
          monthly: '30 dias', bimonthly: '60 dias', quarterly: '90 dias', semiannual: '180 dias', annual: '365 dias',
        };

        const laText = altaRankings.length > 0
          ? `### Lista de Alta (LA)\n${altaRankings.map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`
          : '### Lista de Alta (LA)\nNenhum dado de alta no período.';

        const lbText = baixaRankings.length > 0
          ? `### Lista de Baixa (LB)\n${baixaRankings.map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`
          : '### Lista de Baixa (LB)\nNenhum dado de baixa no período.';

        const aiResult = await callAI([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Relatório consolidado de ${periodLabels[periodType] || periodType} (${periodStart} a ${periodEnd}).\n\n${laText}\n\n${lbText}\n\nTotal de criptos rastreadas: ${rankings.length}\nTotal de menções no período: ${mentions?.length || 0}\n\nAnalise os padrões, identifique destaques e inconsistências. Separe claramente LA e LB na resposta. Não use emojis.` },
        ]);
        if (aiResult.ok) {
          aiAnalysis = aiResult.content;
          aiModelUsed = aiResult.model;
        }
      }

      const { data: report, error: insertErr } = await supabase
        .from('crypto_periodic_reports')
        .insert({
          period_type: periodType,
          period_start: periodStart!,
          period_end: periodEnd,
          year: currentYear,
          week_number: currentWeek,
          rankings: rankings as any,
          summary: `LA: ${altaRankings.length} criptos | LB: ${baixaRankings.length} criptos`,
          ai_analysis: aiAnalysis,
          access_code: accessCode || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ report }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== ANALYZE (main) ==========
    if (action === 'analyze') {
      const body = await req.json();
      const { images, cryptoSymbols, title, reportType, sessionTime, accessCode } = body;

      if (!images || images.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma imagem fornecida' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('Lovable AI Gateway não configurado');

      const uploadedImages: { url: string; name: string; base64: string }[] = [];
      for (const img of images) {
        const fileName = `${crypto.randomUUID()}-${img.name}`;
        const buffer = Uint8Array.from(atob(img.base64), c => c.charCodeAt(0));
        const { error: uploadError } = await supabase.storage
          .from('crypto-images')
          .upload(fileName, buffer, { contentType: img.type || 'image/png' });
        if (uploadError) { console.error('Upload error:', uploadError); continue; }
        const { data: urlData } = supabase.storage.from('crypto-images').getPublicUrl(fileName);
        uploadedImages.push({ url: urlData.publicUrl, name: img.name, base64: img.base64 });
      }

      const reportTypeLabel = reportType === 'alta' ? 'RA (Relatório de Alta)' : reportType === 'baixa' ? 'RB (Relatório de Baixa)' : 'GERAL';

      const userContent: any[] = [
        {
          type: 'text',
          text: `Analise os seguintes relatórios do CriptoEx. Este envio é do tipo: ${reportTypeLabel}.

Os arquivos enviados são ${reportType === 'alta' ? 'Relatórios de Alta (RA)' : reportType === 'baixa' ? 'Relatórios de Baixa (RB)' : 'relatórios gerais'}.

Instruções:
1. Identifique TODAS as criptomoedas presentes nos relatórios
2. Conte as repetições de cada cripto
3. Ordene por número de repetições (descendente)
4. Gere a ${reportType === 'alta' ? 'Lista de Alta (LA)' : reportType === 'baixa' ? 'Lista de Baixa (LB)' : 'lista correspondente'}
5. Identifique destaques e inconsistências

No INÍCIO da resposta, inclua:
CRYPTOS_DETECTED: BTC,ETH,SOL,...

Formato Markdown. Não use emojis.`,
        },
      ];

      for (const img of uploadedImages) {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${img.base64}` },
        });
      }

      const aiResult = await callAI([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ], { wantsVision: true });

      if (!aiResult.ok) {
        console.error('AI error:', aiResult.status, aiResult.error);
        if (aiResult.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições atingido.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (aiResult.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI error: ${aiResult.status}`);
      }

      const summary = aiResult.content || 'Análise não disponível.';
      const aiModelUsed = aiResult.model;

      const cryptoMatch = summary.match(/CRYPTOS_DETECTED:\s*([^\n]+)/i);
      let detectedCryptos: string[] = [];
      if (cryptoMatch) {
        detectedCryptos = cryptoMatch[1]
          .split(',')
          .map((s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
          .filter((s: string) => s.length > 0 && s.length <= 10);
      }
      const allCryptos = [...new Set([...detectedCryptos, ...(cryptoSymbols || []).map((s: string) => s.toUpperCase())])];

      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const reportNames: Record<string, string> = { alta: 'Relatório de Alta (RA)', baixa: 'Relatório de Baixa (RB)', volume: 'Relatório de Alta de Volume' };
      const standardTitle = title || `${dateStr} - ${reportNames[reportType] || 'Análise Geral'}`;

      const { data: analysis, error: insertError } = await supabase
        .from('crypto_analyses')
        .insert({
          title: standardTitle,
          summary,
          period_type: 'daily',
          crypto_symbols: allCryptos,
          ai_model_used: aiModelUsed,
          access_code: accessCode || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      for (const img of uploadedImages) {
        await supabase.from('crypto_analysis_images').insert({
          analysis_id: analysis.id,
          image_url: img.url,
          image_name: img.name,
        });
      }

      if (reportType) {
        const weekNumber = getISOWeek(now);
        const year = now.getFullYear();
        const reportDate = now.toISOString().split('T')[0];

        const { data: submission } = await supabase
          .from('crypto_report_submissions')
          .insert({
            analysis_id: analysis.id,
            report_type: reportType,
            report_date: reportDate,
            session_time: sessionTime || (now.getHours() < 14 ? 'morning' : 'night'),
            access_code: accessCode || null,
          })
          .select()
          .single();

        if (submission && allCryptos.length > 0) {
          const mentionRows = allCryptos.map(symbol => ({
            submission_id: submission.id,
            symbol,
            report_type: reportType,
            report_date: reportDate,
            week_number: weekNumber,
            year,
            access_code: accessCode || null,
          }));
          await supabase.from('crypto_mentions').insert(mentionRows);
        }
      }

      return new Response(JSON.stringify({
        analysis: { ...analysis, images: uploadedImages, detectedCryptos: allCryptos },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
