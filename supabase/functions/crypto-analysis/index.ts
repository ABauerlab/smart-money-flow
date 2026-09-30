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

// Deno's Date is UTC-based server-side; the VPS, Make.com and the audience are
// all Brazil-based, so anything derived from "now" (titles, session bucketing)
// must read as Brasília time, not the server's UTC clock.
function nowInBrasilia(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`);
}

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
  // The VPS macro stamps the filename with Format(Now, ...) using its own local
  // (Brasília) clock, not UTC — so this must be read back as -03:00, not "Z", or
  // every timestamp derived from it ends up 3h off (and Brazil has no DST to worry about).
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}-03:00`;
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

// Two-stage pipeline: sumMentions() below already does the CSV consolidation
// (sum REPETIÇÃO per symbol, rank descending) in plain code, not via the AI —
// that part is deterministic and doesn't need a model. This system prompt is
// the second stage: it takes that already-ranked recurrence list (injected in
// the user message right after this prompt) and asks the model to run a full
// technical/fundamental screening pass on it, exactly as specified by the
// project owner, to shortlist up to five assets for trend/trade monitoring.
const SYSTEM_PROMPT = `Realize uma triagem técnica, comparativa e atualizada das criptomoedas relacionadas abaixo (a lista, já ordenada pela recorrência com que cada ativo apareceu nos relatórios monitorados, é enviada logo em seguida nesta mesma conversa):

AVISO SOBRE FONTES DE DADOS:
Você não tem acesso à internet nem a busca ao vivo nesta análise. Os únicos dados reais disponíveis são os fornecidos explicitamente na mensagem do usuário (a lista de recorrência e, quando presente, o bloco de preço/volume/variação de 24h obtido da Binance). Para qualquer campo pedido abaixo que não conste nesses dados fornecidos (RSI, MACD, VWAP, ATR, book de ofertas, funding, open interest, notícias/catalisadores, estrutura multi-timeframe etc.), não estime nem presuma um valor plausível: classifique explicitamente esse campo como "Dados insuficientes", conforme a regra de "não inventar dados ausentes" já definida mais abaixo.

DATA E HORA DE REFERÊNCIA:
Utilize dados disponíveis e verificados no momento da pesquisa.
Informe no início:
- Data da análise.
- Horário da última atualização dos dados.
- Fuso horário utilizado.
- Fontes consultadas.
- Mercado analisado: spot, futuros ou ambos.
- Par utilizado preferencialmente: USDT ou USD.
- Exchanges utilizadas como referência.
- Timeframes efetivamente examinados.

CONTEXTO:
A lista foi produzida pela recorrência com que os ativos apareceram em listas diárias de um robô de monitoramento.
Essa recorrência é somente um sinal inicial de atenção do mercado. Ela não representa qualidade, oportunidade, fundamento, tendência confirmada ou recomendação de investimento.

OBJETIVO:
Comparar as criptomoedas da lista e identificar, exclusivamente para fins de monitoramento de tendencia de alta e condições melhores para abertura de trades em futuros, até cinco ativos que apresentem naquele momento a melhor combinação de:
- Liquidez executável.
- Volume relativo.
- Força relativa.
- Estrutura técnica.
- Tendência.
- Volatilidade adequada.
- Mercado de derivativos saudável.
- Catalisador atual.
- Proximidade de um possível gatilho técnico.
- Relação técnica entre risco e movimento potencial.

A seleção deve refletir as condições verificadas no momento da análise e não a reputação histórica do projeto.

Não selecionar um ativo apenas porque:
- É conhecido.
- Tem market cap elevado.
- Subiu muito recentemente.
- Está recebendo muitas menções em redes sociais.
- Possui uma narrativa popular.
- Apresentou somente um indicador favorável.

PRINCÍPIO CENTRAL:
Não existe indicador isolado capaz de determinar o melhor ativo para trade.
A classificação deverá resultar da confluência de indicadores independentes, distribuídos entre:
- Regime de mercado.
- Liquidez e execução.
- Força relativa.
- Estrutura de preço.
- Tendência.
- Momentum.
- Volume.
- Volatilidade.
- Derivativos.
- Catalisadores.
- Risco técnico.

Não conte indicadores redundantes como confirmações independentes.
Exemplos:
- RSI e MACD pertencem à família de momentum.
- EMA de 9 e EMA de 21 pertencem à família de tendência.
- Volume absoluto e volume relativo pertencem à família de participação.
- Funding e razão long/short pertencem à família de posicionamento.
Uma cripto somente poderá receber classificação elevada quando houver confluência entre categorias diferentes.

ETAPA 1: NORMALIZAÇÃO E IDENTIFICAÇÃO
Antes de analisar preços, identifique corretamente cada ticker.
Para cada item, informe:
- Ticker recebido.
- Nome completo do ativo.
- Rede principal.
- Exchange e par analisados.
- Se a sigla da criptomoeda é inequívoca ou não identificado.
- Se é criptomoeda, token, ação tokenizada, ETF tokenizado, derivativo ou outro instrumento.
Regras:
- Não presuma a identidade de tickers ambíguos.
- Não misture ativos diferentes que utilizam a mesma sigla.
- Não analise ações tokenizadas ou derivativos de ações como se fossem criptomoedas.
- Descarte ativos que não possam ser identificados com segurança.
- Registre os ativos descartados e o motivo.
- Se existirem duas ocorrências do mesmo ticker, elimine a duplicidade depois de confirmar que representam o mesmo ativo.

ETAPA 2: REGIME GERAL DO MERCADO
Antes de classificar as altcoins, determine o regime dominante de:
- Bitcoin.
- Capitalização total do mercado.
- Capitalização das altcoins, quando disponível.
- Dominância do Bitcoin.
- Mercado spot.
- Mercado de futuros.
Analise:
- Tendência de BTC nos gráficos de 15 minutos, 1 hora, 4 horas, diário, semanal e mensal.
- Direção das médias móveis relevantes.
- Estrutura de máximas e mínimas.
- Variação do volume agregado.
- Volatilidade geral.
- Funding agregado.
- Open interest agregado.
- Liquidações recentes.
- Existência de movimento de aversão ao risco.
- Existência de rotação para altcoins.
- Existência de evento macroeconômico ou notícia capaz de alterar o cenário.
Classifique o regime como:
- Tendência de alta.
- Tendência de baixa.
- Lateralização.
- Expansão de volatilidade.
- Compressão de volatilidade.
- Mercado favorável a altcoins.
- Mercado defensivo.
- Mercado instável.
- Regime indefinido.
Explique como esse regime afeta a confiabilidade dos sinais encontrados nas criptomoedas.
Não classifique uma altcoin como forte sem verificar se o movimento resiste ao comportamento de BTC.

ETAPA 3: FILTROS ELIMINATÓRIOS
Exclua da seleção final, ou aplique penalização severa, aos ativos que apresentarem:
- Identificação incerta.
- Volume insuficiente.
- Spread incompatível com a operação.
- Book superficial.
- Slippage elevado.
- Volume concentrado em uma única exchange.
- Market cap extremamente baixo associado a volume suspeito.
- Ausência de par confiável.
- Dados indisponíveis ou contraditórios.
- Pump vertical sem consolidação.
- Movimento sem confirmação de volume.
- Alta possibilidade de manipulação.
- Notícia de hack, exploração ou suspensão de negociação.
- Evento iminente com risco extraordinário.
- Relação risco-retorno técnica inferior ao mínimo definido.
- Distância excessiva entre o preço e o ponto racional de invalidação.
Informe separadamente:
- Ativos aprovados.
- Ativos reprovados.
- Motivo objetivo de cada reprovação.

ETAPA 4: LIQUIDEZ E QUALIDADE DE EXECUÇÃO
Para cada ativo aprovado, analise:
- Volume spot nas últimas 24 horas.
- Volume de futuros nas últimas 24 horas.
- Volume relativo em comparação com a média de 7 dias.
- Volume relativo em comparação com a média de 30 dias.
- Relação volume/market cap.
- Spread médio.
- Profundidade do book a 0,5% e 1%, se disponível.
- Slippage estimado.
- Número de exchanges relevantes.
- Distribuição do volume entre exchanges.
- Liquidez do par efetivamente analisado.
- Facilidade de entrada, stop e saída.
Diferencie:
- Volume alto com liquidez profunda.
- Volume alto concentrado.
- Volume artificial ou suspeito.
- Volume gerado principalmente por derivativos.
- Volume real no mercado spot.
Classifique a execução em:
- Excelente.
- Boa.
- Aceitável.
- Fraca.
- Perigosa.
- Não executável.
Regra: um ativo de alta volatilidade não deve ser bem classificado se a liquidez não permitir execução adequada.

ETAPA 5: FORÇA RELATIVA
Compare cada ativo com:
- Mercado total.
- Média da própria lista analisada.
Calcule ou estime:
- Desempenho relativo em 24 horas.
- Desempenho relativo em 3 dias.
- Desempenho relativo em 7 dias.
- Desempenho relativo em 30 dias.
- Persistência da força relativa.
- Comportamento durante correções de BTC.
- Recuperação depois de quedas intradiárias.
Classifique:
- Liderança clara.
- Força relativa crescente.
- Força relativa moderada.
- Neutro.
- Fraqueza relativa.
- Movimento dependente de BTC.
- Força aparente causada por pump isolado.
Pergunta decisiva: o ativo está apenas subindo, ou está demonstrando força superior ao restante do mercado?

ETAPA 6: ESTRUTURA DE PREÇO
Analise nos gráficos de 15 minutos, 1 hora, 4 horas, diário, semanal e mensal.
Identifique:
- Mínimas inferiores à anterior no gráfico mensal e semanal.
- Máximas e mínimas ascendentes.
- Máximas e mínimas descendentes.
- Rompimento de estrutura.
- Mudança de caráter.
- Consolidação.
- Range.
- Compressão.
- Expansão.
- Suportes.
- Resistências.
- Máxima e mínima do dia anterior.
- Máxima e mínima semanal.
- Máxima e mínima mensal.
- Regiões de oferta e demanda.
- Retestes.
- Falsos rompimentos.
- Liquidez acima e abaixo do preço.
- Distância do ponto de invalidação.
Classifique a estrutura como:
- Tendência limpa.
- Rompimento confirmado.
- Rompimento aguardando reteste.
- Consolidação próxima de rompimento.
- Reversão em formação.
- Range sem vantagem clara.
- Estrutura deteriorada.
- Movimento vertical já estendido.
Não considere como oportunidade prioritária um ativo que já esteja excessivamente distante do suporte, da VWAP ou do ponto técnico de invalidação.

ETAPA 7: TENDÊNCIA
Utilize, no mínimo: EMA 9, EMA 21, EMA 52, EMA 200.
Avalie:
- Ordem das médias.
- Inclinação das médias.
- Distância do preço para as médias.
- Cruzamentos recentes.
- Reteste das médias.
- Alinhamento entre 1 hora, 4 horas e diário.
- Alinhamento semanal e mensal.
- Tendência principal, intermediária e intradiária.
Classifique:
- Tendência de alta alinhada.
- Tendência de baixa alinhada.
- Tendência inicial.
- Tendência madura.
- Tendência estendida.
- Transição.
- Lateralização.
- Sinais conflitantes entre timeframes.
Regra: dê maior peso ao alinhamento dos timeframes do que a um cruzamento isolado de médias.

ETAPA 8: VWAP E PREÇO MÉDIO
Analise: VWAP do dia, VWAP semanal (se disponível), VWAP ancorada no último fundo relevante, VWAP ancorada no último topo relevante, VWAP ancorada no início do movimento de volume.
Verifique:
- Preço acima ou abaixo da VWAP.
- Inclinação da VWAP.
- Recuperação da VWAP.
- Rejeição na VWAP.
- Reteste com volume.
- Distância percentual da VWAP.
- Possibilidade de retorno à média.
- Confluência entre VWAP e suporte/resistência.
Classifique: sustentação saudável acima da VWAP, recuperação confirmada, reteste favorável, distância excessiva, perda da VWAP, sem sinal claro.

ETAPA 9: VOLUME E PARTICIPAÇÃO
Analise: volume absoluto, volume relativo, média de volume de 20 períodos, média de volume de 30 dias, volume no rompimento, volume no reteste, volume em candles de alta, volume em candles de baixa, OBV (quando confiável), perfil de volume, regiões de alto e baixo volume, divergência entre preço e volume.
Perguntas decisivas:
- Há verificação de alta durante um longo período do dia? O rompimento foi acompanhado por volume superior à média?
- O reteste ocorreu com redução de volume vendedor?
- A alta apresenta participação crescente?
- Existe alta de preço com volume decrescente?
- Existe absorção em suporte ou resistência?
- O volume spot confirma o movimento dos futuros?
Classifique: confirmação forte, confirmação moderada, neutro, divergência, volume insuficiente, volume suspeito.

ETAPA 10: VOLATILIDADE E ATR
Analise: ATR de 14 períodos, ATR percentual, amplitude média diária, expansão ou contração do ATR, Bandas de Bollinger, largura das Bandas de Bollinger, compressão anterior, expansão atual, posição do preço dentro das bandas, frequência de pavios, risco de stop atingido por ruído normal.
Compare o ATR percentual de todos os ativos.
Classifique a volatilidade como: insuficiente, adequada, elevada mas controlável, excessiva, errática, propensa a liquidações.
Regra: a melhor cripto para trade não é necessariamente a mais volátil. Deve existir volatilidade suficiente para produzir movimento, mas com liquidez e estrutura que permitam controlar o risco.

ETAPA 11: MOMENTUM
Utilize RSI e MACD apenas como confirmações.
RSI: RSI de 15 minutos, 1 hora e 4 horas, direção do RSI, divergências, recuperação da região central, perda da região central, sobrecompra acompanhada de tendência, sobrecompra sem sustentação, sobrevenda acompanhada de estrutura.
MACD: posição em relação à linha zero, cruzamento das linhas, inclinação, expansão ou contração do histograma, divergências, alinhamento entre timeframes.
Regras:
- Não trate RSI sobrecomprado como venda automática.
- Não trate RSI sobrevendido como compra automática.
- Não trate cruzamento do MACD como gatilho suficiente.
- Não duplique a pontuação de RSI e MACD.
- Considere momentum favorável somente quando estiver alinhado com estrutura, tendência e volume.

ETAPA 12: DERIVATIVOS E POSICIONAMENTO
Para ativos com futuros, analise: open interest atual, variação do open interest em 1 hora, 4 horas e 24 horas, funding rate atual, média do funding entre exchanges, razão long/short, volume de futuros, relação entre volume spot e futuros, basis, liquidações de longs e shorts, mapa de liquidações (se disponível), concentração de alavancagem, distância das principais zonas de liquidação.
Interprete preço e open interest conjuntamente: preço subindo e OI subindo; preço subindo e OI caindo; preço caindo e OI subindo; preço caindo e OI caindo.
Identifique: entrada provável de novas posições, fechamento de shorts, fechamento de longs, possível acumulação de posições, mercado excessivamente comprado, mercado excessivamente vendido, risco de long squeeze, risco de short squeeze.
Classifique os derivativos como: saudáveis, confirmatórios, neutros, excessivamente alavancados, contraditórios, propensos a squeeze, perigosos.
Não considere funding extremo como sinal direcional isolado.

ETAPA 13: CATALISADORES DO DIA
Pesquise acontecimentos que possam afetar o ativo naquele dia: anúncios oficiais, atualizações de rede, listagens, desbloqueios de tokens, votações, parcerias, airdrops, migrações, incidentes, hacks, eventos regulatórios, eventos macroeconômicos, movimentações relevantes de baleias, alterações incomuns de fluxo para exchanges.
Para cada catalisador, informe: data e horário, fonte, fato confirmado ou rumor, impacto potencial, se o mercado já reagiu, se o evento ainda pode gerar volatilidade, risco de movimento do tipo "sobe no rumor e cai no fato".
Classifique: catalisador positivo confirmado, catalisador negativo confirmado, catalisador incerto, rumor, evento já precificado, ausência de catalisador relevante.

ETAPA 14: RELAÇÃO TÉCNICA ENTRE RISCO E MOVIMENTO POTENCIAL
Para cada ativo que continuar elegível, identifique: região racional de observação para possível entrada, confirmação técnica necessária, ponto técnico de invalidação, próxima resistência, próximo suporte, distância até a invalidação, distância até o primeiro objetivo técnico, distância até o segundo objetivo técnico, relação risco-retorno teórica, slippage e custos estimados, probabilidade de o stop ficar dentro do ruído normal medido pelo ATR.
Não recomende a execução. Apenas avalie se a configuração técnica oferece: assimetria favorável, assimetria aceitável, assimetria fraca, assimetria desfavorável.
Regras: exigir relação risco-retorno teórica mínima de 2 para 1; penalizar ativos cujo primeiro obstáculo técnico esteja muito próximo; penalizar stops excessivamente largos; penalizar entradas distantes da região de invalidação; considerar custos, spread e slippage.

ETAPA 15: CONFLUÊNCIA E QUALIDADE DO SINAL
Considere sinal forte somente quando houver alinhamento de pelo menos quatro categorias independentes, entre elas: estrutura, tendência, volume, força relativa, VWAP, volatilidade, derivativos, catalisador.
Classifique a confluência: muito forte, forte, moderada, fraca, contraditória.
Informe obrigatoriamente: quais categorias estão alinhadas, quais estão divergentes, qual sinal depende de confirmação, qual evento invalidaria a configuração.

ETAPA 16: PONTUAÇÃO COMPARATIVA
Atribua uma nota final de 0 a 100 utilizando os seguintes pesos:
- Liquidez e execução: 15 pontos.
- Força relativa: 15 pontos.
- Estrutura de preço: 15 pontos.
- Tendência multitemporal: 10 pontos.
- Volume relativo e confirmação: 10 pontos.
- VWAP e localização do preço: 8 pontos.
- Volatilidade e ATR: 8 pontos.
- Derivativos e posicionamento: 8 pontos.
- Relação técnica risco-retorno: 6 pontos.
- Catalisadores atuais: 5 pontos.
Total: 100 pontos.
Aplique penalizações adicionais: ticker ou contrato ambíguo (exclusão); liquidez insuficiente (menos 20 pontos ou exclusão); volume suspeito (menos 15 pontos); movimento já excessivamente estendido (menos 10 pontos); funding extremo e OI excessivo (menos 10 pontos); forte divergência entre spot e futuros (menos 10 pontos); evento de alto risco iminente (menos 15 pontos); dados incompletos (menos 5 a 20 pontos); risco elevado de manipulação (exclusão).
Não permita que narrativa, redes sociais ou notícias representem mais de 5% da nota, salvo quando existir catalisador confirmado com impacto imediato.

ETAPA 17: APLICAÇÃO DO 80/20 AO CUBO
Primeiro nível: identifique os 20% dos ativos que concentram melhor liquidez, maior força relativa, melhor estrutura, volume relativo mais favorável e volatilidade mais adequada.
Segundo nível: dentro desse grupo, identifique os ativos com alinhamento entre timeframes, confirmação por volume, localização favorável em relação à VWAP, derivativos não excessivamente saturados e relação risco-retorno mínima de 2 para 1.
Terceiro nível: dentro do núcleo final, selecione os ativos que apresentem gatilho técnico mais próximo, invalidação mais objetiva, menor risco de manipulação, melhor execução, menor número de sinais contraditórios e maior qualidade e atualidade dos dados.

ETAPA 18: RESULTADO FINAL
Apresente primeiro uma tabela com: Posição, Cripto, Nome completo, Exchange e par, Preço de referência, Força relativa, Estrutura, Tendência, Volume relativo, Liquidez, VWAP, ATR percentual, RSI, MACD, Open interest, Funding, Principal catalisador, Relação risco-retorno teórica, Penalizações aplicadas, Nota final, Qualidade dos dados, Status.
Utilize os seguintes status: Finalista, Aguardando confirmação, Apenas monitorar, Reprovada por liquidez, Reprovada por risco, Reprovada por ambiguidade, Reprovada por movimento estendido, Dados insuficientes.
Depois da tabela, apresente apenas os cinco ativos mais bem classificados. Para cada finalista, informe: 1. Por que superou os demais. 2. Regime técnico atual. 3. Principal confluência. 4. Principal fator favorável. 5. Principal risco. 6. Gatilho técnico que ainda precisa ocorrer. 7. Condição objetiva de invalidação. 8. Situação do volume. 9. Situação dos derivativos. 10. Relação risco-retorno teórica. 11. Prazo de validade da análise. 12. Dado que deve ser monitorado em tempo real. 13. Nota final de 0 a 100. 14. Grau de confiança da classificação: alto, médio ou baixo.

REGRA DE SEGURANÇA DA SELEÇÃO:
Não é obrigatório selecionar cinco ativos. Selecione: cinco, se cinco ultrapassarem 75 pontos; três, se somente três ultrapassarem 75 pontos; um, se somente um ultrapassar 75 pontos; nenhum, se nenhum atingir 75 pontos.
Nunca complete o ranking com ativos fracos apenas para chegar a cinco nomes.
Se nenhum ativo preencher os requisitos, escreva: "Não foram identificadas, neste momento, três configurações com confluência, liquidez e relação técnica de risco suficientes."

REGRAS FINAIS:
- Não recomendar compra, venda, manutenção ou alavancagem.
- Não prometer ganhos.
- Não apresentar certeza sobre movimentos futuros.
- Não confundir volatilidade alta com qualidade.
- Não confundir volume alto com liquidez profunda.
- Não confundir sobrecompra com sinal automático de queda.
- Não confundir sobrevenda com sinal automático de alta.
- Não usar market cap como critério principal de trade intradiário.
- Não selecionar ativos somente por hype ou recorrência.
- Não inventar dados ausentes.
- Não cruzar dados capturados em horários muito diferentes sem advertência.
- Indicar divergências entre fontes.
- Citar as fontes e os horários dos dados.
- Informar que a classificação pode perder validade rapidamente.
- Tratar a conclusão como ranking de configurações técnicas observadas, e não como recomendação financeira.

Sempre comece a resposta com:
CRYPTOS_DETECTED: BTC,ETH,SOL,...`;

// Free, no-key public market data (Binance 24hr ticker) for the symbols being
// screened. This is what lets the AI prompt reason over real price/volume
// numbers without needing paid Google Search grounding.
async function fetchLivePriceData(symbols: string[]): Promise<Record<string, { price: string; changePct: string; quoteVolume: string }>> {
  try {
    const resp = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (!resp.ok) return {};
    const all = await resp.json();
    if (!Array.isArray(all)) return {};
    const wanted = new Set(symbols.map(s => `${s}USDT`));
    const out: Record<string, { price: string; changePct: string; quoteVolume: string }> = {};
    for (const t of all) {
      if (wanted.has(t.symbol)) {
        out[t.symbol.slice(0, -4)] = {
          price: t.lastPrice,
          changePct: t.priceChangePercent,
          quoteVolume: t.quoteVolume,
        };
      }
    }
    return out;
  } catch (e) {
    console.error('fetchLivePriceData error:', e);
    return {};
  }
}

function formatLivePriceBlock(priceData: Record<string, { price: string; changePct: string; quoteVolume: string }>): string {
  const entries = Object.entries(priceData);
  if (entries.length === 0) {
    return `### Dados de mercado ao vivo\nNenhum dado de preço/volume disponível (ativos sem par USDT na Binance, ou consulta indisponível no momento).`;
  }
  return [
    `### Dados de mercado ao vivo (Binance, par USDT, janela de 24h)`,
    ...entries.map(([sym, d]) => `${sym}: preço ${d.price} USDT, variação 24h ${d.changePct}%, volume 24h ${d.quoteVolume} USDT`),
  ].join('\n');
}

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

  // No Google Search grounding tool here: it requires a billed Google Cloud
  // project (RESOURCE_EXHAUSTED/402 otherwise), while plain generateContent
  // calls work on Gemini's free tier. Real price/volume data is instead fetched
  // for free from Binance's public API and injected into the prompt directly
  // (see fetchLivePriceData / the analyze-csv and refresh-lists callers) — the
  // system prompt tells the model to mark anything else as "Dados insuficientes"
  // instead of guessing.
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
function resolveWindow(periodType: string, windowIndex: number, now = nowInBrasilia()): { start: string; end: string; label: string } {
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

// Shared by the manual "generate-periodic" action and by the automatic call
// fired after every CSV ingestion (analyze-csv), so a report produced by the
// Make.com/VPS pipeline goes through the exact same 18-step AI screening as
// one a person triggers by hand from the "Listas" tab — not just a raw count.
async function generateAIPeriodicReport(
  supabase: any, accessCode: string, periodType: string, windowIndex: number,
): Promise<{ report: any; aiModelUsed: string }> {
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
    const topSymbols = altaRankings.slice(0, MAX_AI_RANKING_ROWS).map(r => r.symbol);
    const laText = `### Lista Geral (somatório)\n${altaRankings.slice(0, MAX_AI_RANKING_ROWS).map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`;
    const priceText = formatLivePriceBlock(await fetchLivePriceData(topSymbols));
    const aiResult = await callAI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Relatório consolidado.\nTipo: ${periodType} (${win.label}).\nJanela: ${win.start} a ${win.end}.\n\n${laText}\n\n${priceText}\n\nTotal de criptos rastreadas: ${rankings.length}\nTotal de repetições no recorte: ${(mentions || []).reduce((s: number, m: any) => s + (Number(m.repetition) || 0), 0)}\n\nAnalise os padrões deste recorte ISOLADO. Não some nem compare com outros recortes. Não use emojis.` },
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
      summary: `${win.label}: ${altaRankings.length} criptos`,
      ai_analysis: aiAnalysis,
      access_code: accessCode || null,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;

  return { report, aiModelUsed };
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
      const { report, aiModelUsed } = await generateAIPeriodicReport(supabase, accessCode, periodType, windowIndex);

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

      const nowBR = nowInBrasilia();
      const dateStr = nowBR.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
          session_time: nowBR.getHours() < 14 ? 'morning' : 'night',
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

      // Run the same 18-step AI screening that "Listas" triggers by hand, but for
      // EVERY ingestion — manual upload or Make.com/VPS automation alike — so the
      // dashboard's AI report always reflects the latest data, not just when a
      // person happens to click. Backgrounded via waitUntil: it can take several
      // seconds (AI call), and must not delay the response back to the VPS macro's
      // synchronous HTTP request or Make's module timeout.
      if (submission) {
        const bgReport = generateAIPeriodicReport(supabase, accessCode, 'daily', 0)
          .catch((e) => console.error('Background daily AI report failed:', e));
        // @ts-ignore EdgeRuntime is a Deno Deploy/Supabase global, not in the TS lib defs.
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(bgReport);
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
        const topSymbols = altaRankings.slice(0, MAX_AI_RANKING_ROWS).map(r => r.symbol);
        const laText = `### Lista Geral (somatório)\n${altaRankings.slice(0, MAX_AI_RANKING_ROWS).map((r, i) => `${i + 1}. ${r.symbol}: ${r.count} repetições`).join('\n')}`;
        const priceText = formatLivePriceBlock(await fetchLivePriceData(topSymbols));
        const aiResult = await callAI([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Atualização de listas.\nTipo: ${periodType} (${win.label}).\nJanela: ${win.start} a ${win.end}.\n\n${laText}\n\n${priceText}\n\nTotal de criptos: ${rankings.length}\nTotal de repetições: ${(mentions || []).reduce((s: number, m: any) => s + (Number(m.repetition) || 0), 0)}\n\nReanalise os padrões atuais deste recorte isolado. Não use emojis.` },
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
          summary: `[ATUALIZAÇÃO] ${win.label}: ${altaRankings.length} criptos`,
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
