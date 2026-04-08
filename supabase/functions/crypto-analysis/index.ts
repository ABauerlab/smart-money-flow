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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'analyze';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== HISTORY ==========
    if (action === 'history') {
      const { data: analyses, error } = await supabase
        .from('crypto_analyses')
        .select('*, crypto_analysis_images(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return new Response(JSON.stringify({ analyses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== REPETITION RANKINGS ==========
    if (action === 'rankings') {
      const body = await req.json();
      const { periodType, year, weekNumber } = body;

      let query = supabase.from('crypto_mentions').select('symbol, report_type');

      if (periodType === 'weekly' && weekNumber && year) {
        query = query.eq('week_number', weekNumber).eq('year', year);
      } else if (periodType && year) {
        // For longer periods, fetch periodic report
        const { data } = await supabase
          .from('crypto_periodic_reports')
          .select('*')
          .eq('period_type', periodType)
          .eq('year', year)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          return new Response(JSON.stringify({ report: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data: mentions, error } = await query;
      if (error) throw error;

      // Aggregate by symbol
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
      const { data, error } = await supabase
        .from('crypto_periodic_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return new Response(JSON.stringify({ reports: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== GENERATE PERIODIC REPORT ==========
    if (action === 'generate-periodic') {
      const body = await req.json();
      const { periodType } = body;

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

      // Get mentions for the period
      const { data: mentions, error: mError } = await supabase
        .from('crypto_mentions')
        .select('symbol, report_type')
        .eq('year', currentYear)
        .in('week_number', weeksToInclude);

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

      // Generate AI analysis of the periodic data
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
              { role: 'system', content: 'Você é um analista de criptomoedas especialista. Analise os dados de repetição e forneça insights sobre tendências dominantes, criptos em destaque e recomendações. Responda em PT-BR, formato Markdown.' },
              { role: 'user', content: `Relatório ${periodLabels[periodType] || periodType} (${periodStart} a ${periodEnd}).\n\nRanking de criptomoedas por repetição nos relatórios:\n${rankings.map((r, i) => `${i + 1}. ${r.symbol}: ${r.total} aparições (Alta: ${r.alta}, Baixa: ${r.baixa}, Volume: ${r.volume})`).join('\n')}\n\nAnalise quais criptos dominam cada categoria, identifique padrões e dê recomendações baseadas nessas repetições.` },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiAnalysis = aiData.choices?.[0]?.message?.content || '';
        }
      }

      // Save periodic report
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
      const { images, cryptoSymbols, title, reportType, sessionTime } = body;

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

      // Determine report type label
      const reportTypeLabel = reportType === 'alta' ? 'ALTA' : reportType === 'baixa' ? 'BAIXA' : reportType === 'volume' ? 'VOLUME' : 'GERAL';

      // Build prompt
      const userContent: any[] = [
        {
          type: 'text',
          text: `Analise os seguintes gráficos de criptomoedas. Este é um relatório de ${reportTypeLabel}.
Criptos em foco: ${(cryptoSymbols || []).join(', ') || 'Não especificadas'}.

IMPORTANTE: Identifique TODAS as criptomoedas visíveis nos gráficos. Liste cada uma pelo símbolo (ex: BTC, ETH, SOL).

Forneça:
1. **Lista de Criptomoedas Identificadas** — Liste TODAS as criptos que aparecem nos gráficos
2. **Resumo do Relatório de ${reportTypeLabel}** — tendência dominante
3. **Análise Individual** de cada gráfico — padrões técnicos, suportes, resistências
4. **Destaques** — quais criptos merecem mais atenção neste relatório
5. **Recomendações** — pontos de entrada/saída, gestão de risco

No INÍCIO da resposta, inclua uma linha especial com formato:
CRYPTOS_DETECTED: BTC,ETH,SOL,...
(lista separada por vírgulas dos símbolos identificados)

Use linguagem técnica mas acessível. Formato Markdown.`,
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
            {
              role: 'system',
              content: `Você é um analista técnico especialista em criptomoedas com mais de 15 anos de experiência.
Analisa gráficos com precisão, identifica padrões de candlestick, suportes, resistências, divergências em indicadores.
SEMPRE inicie sua resposta com a linha CRYPTOS_DETECTED: seguida dos símbolos das criptos identificadas nos gráficos.
Foca em fluxo institucional e Smart Money concepts. Responde sempre em português brasileiro.`,
            },
            { role: 'user', content: userContent },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }), {
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

      // Extract detected cryptos from AI response
      const cryptoMatch = summary.match(/CRYPTOS_DETECTED:\s*([^\n]+)/i);
      let detectedCryptos: string[] = [];
      if (cryptoMatch) {
        detectedCryptos = cryptoMatch[1]
          .split(',')
          .map((s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
          .filter((s: string) => s.length > 0 && s.length <= 10);
      }
      // Merge with user-provided symbols
      const allCryptos = [...new Set([...detectedCryptos, ...(cryptoSymbols || []).map((s: string) => s.toUpperCase())])];

      // Generate standardized title: DATE - REPORT_NAME
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const reportNames: Record<string, string> = { alta: 'Relatório de Alta', baixa: 'Relatório de Baixa', volume: 'Relatório de Alta de Volume' };
      const standardTitle = title || `${dateStr} - ${reportNames[reportType] || 'Análise Geral'}`;

      // Save analysis
      const { data: analysis, error: insertError } = await supabase
        .from('crypto_analyses')
        .insert({
          title: standardTitle,
          summary,
          period_type: 'daily',
          crypto_symbols: allCryptos,
          ai_model_used: 'google/gemini-2.5-pro',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Save image records
      for (const img of uploadedImages) {
        await supabase.from('crypto_analysis_images').insert({
          analysis_id: analysis.id,
          image_url: img.url,
          image_name: img.name,
        });
      }

      // Save report submission and track mentions
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
