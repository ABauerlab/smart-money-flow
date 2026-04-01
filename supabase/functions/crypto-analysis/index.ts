import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'analyze';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // List history
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

    // Analyze images
    if (action === 'analyze') {
      const body = await req.json();
      const { images, cryptoSymbols, title } = body;

      if (!images || images.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma imagem fornecida' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      // Upload images to storage
      const uploadedImages: { url: string; name: string; base64: string }[] = [];
      for (const img of images) {
        const fileName = `${crypto.randomUUID()}-${img.name}`;
        const buffer = Uint8Array.from(atob(img.base64), c => c.charCodeAt(0));
        
        const { error: uploadError } = await supabase.storage
          .from('crypto-images')
          .upload(fileName, buffer, { contentType: img.type || 'image/png' });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage.from('crypto-images').getPublicUrl(fileName);
        uploadedImages.push({ url: urlData.publicUrl, name: img.name, base64: img.base64 });
      }

      // Build multimodal message for Gemini
      const userContent: any[] = [
        {
          type: 'text',
          text: `Analise os seguintes gráficos de criptomoedas. Criptos em foco: ${(cryptoSymbols || []).join(', ') || 'Não especificadas'}.

Forneça:
1. **Resumo Geral do Mercado Cripto** — tendência dominante, sentimento
2. **Análise Individual** de cada gráfico — padrões técnicos, suportes, resistências, indicadores
3. **Movimentos Dominantes da Semana** — onde está o maior fluxo
4. **Recomendações** — pontos de entrada/saída, gestão de risco
5. **Comparação com Tendências Anteriores** se aplicável

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
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `Você é um analista técnico especialista em criptomoedas com mais de 15 anos de experiência. 
Analisa gráficos com precisão, identifica padrões de candlestick, suportes, resistências, divergências em indicadores (RSI, MACD, Volume).
Foca em fluxo institucional e Smart Money concepts. Responde sempre em português brasileiro.
Quando analisa múltiplas imagens, compara os ativos entre si e identifica correlações.
Fornece análises progressivas — quanto mais dados históricos recebe, mais profunda é a análise de tendência.`,
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

      // Save to DB
      const { data: analysis, error: insertError } = await supabase
        .from('crypto_analyses')
        .insert({
          title: title || `Análise ${new Date().toLocaleDateString('pt-BR')}`,
          summary,
          period_type: 'daily',
          crypto_symbols: cryptoSymbols || [],
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

      return new Response(JSON.stringify({ analysis: { ...analysis, images: uploadedImages } }), {
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
