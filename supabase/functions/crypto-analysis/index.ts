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

const SYSTEM_PROMPT = `Você é um consolidador de relatórios do robô CriptoEx.

Sua função é analisar arquivos de relatórios enviados pelo usuário.

Arquivos iniciados por RA são Relatórios de Alta.
Arquivos iniciados por RB são Relatórios de Baixa.

Cada arquivo terá data e período no nome, como manhã, tarde, noite ou madrugada.

Tarefa:
1. Ler os relatórios enviados.
2. Separar RA e RB.
3. Identificar os nomes das criptos presentes em cada relatório.
4. Contar quantas vezes cada cripto aparece nos relatórios de alta e nos relatórios de baixa.
5. Gerar duas listas ordenadas por número de repetições:
   - Lista de Alta, com os dados dos relatórios RA
   - Lista de Baixa, com os dados dos relatórios RB
6. Em caso de empate, priorizar presença mais recente; persistindo empate apontar ambas.
7. Manter consolidação por:
   - semana atual (segunda a domingo)
   - mês atual
   - acumulado do ano
8. Sempre que o usuário escrever "atualizar as listas", processe os arquivos enviados e devolva:
   - período analisado
   - quantidade de arquivos processados
   - lista de alta
   - lista de baixa
   - destaques do período
   - inconsistências encontradas
9. Desconsiderar as análises anteriores e passar a considerar apenas os relatórios enviados a partir da semana iniciada em 6/4/2026.

Use linguagem neutra, técnica e organizacional.
Não faça recomendação financeira.

IMPORTANTE: No INÍCIO da resposta, inclua uma linha especial com formato:
CRYPTOS_DETECTED: BTC,ETH,SOL,...
(lista separada por vírgulas dos símbolos identificados nos gráficos/relatórios)`;

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

      // Delete related images first
      await supabase.from('crypto_analysis_images').delete().in('analysis_id', ids);
      // Delete related submissions and mentions
      const { data: subs } = await supabase.from('crypto_report_submissions').select('id').in('analysis_id', ids);
      if (subs && subs.length > 0) {
        const subIds = subs.map(s => s.id);
        await supabase.from('crypto_mentions').delete().in('submission_id', subIds);
        await supabase.from('crypto_report_submissions').delete().in('analysis_id', ids);
      }
      // Delete analyses
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
      } else if (periodType && year) {
        let pQuery = supabase
          .from('crypto_periodic_reports')
          .select('*')
          .eq('period_type', periodType)
          .eq('year', year)
          .order('created_at', { ascending: false })
          .limit(1);
        if (accessCode) pQuery = pQuery.eq('access_code', accessCode);
        const { data } = await pQuery.maybeSingle();
        if (data) {
          return new Response(JSON.stringify({ report: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data: mentions, error } = await query;
      if (error) throw error;

      const counts: Record<string, { total: number; alta: number; baixa: number; volume: number }> = {};
      for (const m of (mentions || [])) {
        if (!counts[m.symbol]) counts[m.symbol] = { total: 0, alta: 0, baixa: 0, volume: 0 };
        counts[m.symbol].total++;
        if (m.report_type === 'alta') counts[m.symbol].alta++;
        if (m.report_type === 'baixa') counts[m.symbol].baixa++;
        if (m.report_type === 'volume') counts[m.symbol].volume++;
      }

      const rankings = Object.entries(counts)
        .map(([symbol, c]) => ({ symbol, ...c }))
        .sort((a, b) => b.total - a.total);

      return new Response(JSON.stringify({ rankings }), {
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

      let weeksToInclude: number[] = [];
      let periodStart: string;
      let periodEnd: string;

      const wb = getWeekBounds(currentYear, currentWeek);
      periodEnd = wb.end;

      switch (periodType) {
        case 'weekly':
          weeksToInclude = [currentWeek];
          periodStart = wb.start;
          break;
        case 'biweekly':
          weeksToInclude = [currentWeek - 1, currentWeek];
          periodStart = getWeekBounds(currentYear, currentWeek - 1).start;
          break;
        case 'triweekly':
          weeksToInclude = [currentWeek - 2, currentWeek - 1, currentWeek];
          periodStart = getWeekBounds(currentYear, currentWeek - 2).start;
          break;
        case 'monthly':
          weeksToInclude = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek];
          periodStart = getWeekBounds(currentYear, currentWeek - 3).start;
          break;
        case 'bimonthly':
          weeksToInclude = Array.from({ length: 8 }, (_, i) => currentWeek - 7 + i);
          periodStart = getWeekBounds(currentYear, currentWeek - 7).start;
          break;
        case 'quarterly':
          weeksToInclude = Array.from({ length: 13 }, (_, i) => currentWeek - 12 + i);
          periodStart = getWeekBounds(currentYear, currentWeek - 12).start;
          break;
        case 'semiannual':
          weeksToInclude = Array.from({ length: 26 }, (_, i) => currentWeek - 25 + i);
          periodStart = getWeekBounds(currentYear, currentWeek - 25).start;
          break;
        default:
          throw new Error('Tipo de período inválido');
      }

      let mentionsQuery = supabase
        .from('crypto_mentions')
        .select('symbol, report_type')
        .eq('year', currentYear)
        .in('week_number', weeksToInclude);
      if (accessCode) mentionsQuery = mentionsQuery.eq('access_code', accessCode);

      const { data: mentions, error: mError } = await mentionsQuery;
      if (mError) throw mError;

      const counts: Record<string, { total: number; alta: number; baixa: number; volume: number }> = {};
      for (const m of (mentions || [])) {
        if (!counts[m.symbol]) counts[m.symbol] = { total: 0, alta: 0, baixa: 0, volume: 0 };
        counts[m.symbol].total++;
        if (m.report_type === 'alta') counts[m.symbol].alta++;
        if (m.report_type === 'baixa') counts[m.symbol].baixa++;
        if (m.report_type === 'volume') counts[m.symbol].volume++;
      }

      const rankings = Object.entries(counts)
        .map(([symbol, c]) => ({ symbol, ...c }))
        .sort((a, b) => b.total - a.total);

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      let aiAnalysis = '';

      if (LOVABLE_API_KEY && rankings.length > 0) {
        const periodLabels: Record<string, string> = {
          weekly: 'semanal', biweekly: 'quinzenal', triweekly: 'trisemanal',
          monthly: 'mensal', bimonthly: 'bimestral', quarterly: 'trimestral', semiannual: 'semestral',
        };

        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: `Relatório ${periodLabels[periodType] || periodType} (${periodStart} a ${periodEnd}).\n\nRanking de criptomoedas por repetição nos relatórios:\n${rankings.map((r, i) => `${i + 1}. ${r.symbol}: ${r.total} aparições (Alta: ${r.alta}, Baixa: ${r.baixa}, Volume: ${r.volume})`).join('\n')}\n\nAnalise quais criptos dominam cada categoria, identifique padrões e forneça os destaques do período. Use linguagem neutra, técnica e organizacional. Não faça recomendação financeira.` },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiAnalysis = aiData.choices?.[0]?.message?.content || '';
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
          summary: `${rankings.length} criptomoedas rastreadas no período`,
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
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      // Upload images
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

      const reportTypeLabel = reportType === 'alta' ? 'ALTA' : reportType === 'baixa' ? 'BAIXA' : reportType === 'volume' ? 'VOLUME' : 'GERAL';

      // Build prompt with image analysis instructions
      const userContent: any[] = [
        {
          type: 'text',
          text: `Analise os seguintes gráficos/relatórios de criptomoedas. Este é um relatório de ${reportTypeLabel}.
Criptos em foco: ${(cryptoSymbols || []).join(', ') || 'Não especificadas'}.

Processe conforme suas instruções de consolidador CriptoEx:
1. Identifique TODAS as criptomoedas visíveis nos gráficos/relatórios
2. Classifique como RA (alta) ou RB (baixa) conforme o tipo: ${reportTypeLabel}
3. Gere as listas ordenadas por repetição
4. Forneça os destaques e inconsistências encontradas

No INÍCIO da resposta, inclua uma linha especial com formato:
CRYPTOS_DETECTED: BTC,ETH,SOL,...
(lista separada por vírgulas dos símbolos identificados)

Formato Markdown.`,
        },
      ];

      for (const img of uploadedImages) {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${img.base64}` },
        });
      }

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições atingido.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const summary = aiData.choices?.[0]?.message?.content || 'Análise não disponível.';

      // Extract detected cryptos
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
      const reportNames: Record<string, string> = { alta: 'Relatório de Alta', baixa: 'Relatório de Baixa', volume: 'Relatório de Alta de Volume' };
      const standardTitle = title || `${dateStr} - ${reportNames[reportType] || 'Análise Geral'}`;

      const { data: analysis, error: insertError } = await supabase
        .from('crypto_analyses')
        .insert({
          title: standardTitle,
          summary,
          period_type: 'daily',
          crypto_symbols: allCryptos,
          ai_model_used: 'google/gemini-2.5-pro',
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
