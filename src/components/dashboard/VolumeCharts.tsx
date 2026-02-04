import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { MarketData } from '@/types/market';
import { formatVolume } from '@/lib/mockData';

interface VolumeChartsProps {
  markets: MarketData[];
}

export const VolumeCharts = ({ markets }: VolumeChartsProps) => {
  // Determine the maximum length of historical data available
  const maxHistoryLength = markets.reduce((max, m) => Math.max(max, m.historicalVolumes?.length || 0), 0);

  // Prepare data for combined chart
  const chartData = Array.from({ length: maxHistoryLength }).map((_, index) => {
    const dataPoint: Record<string, number | string> = { day: `D-${maxHistoryLength - 1 - index}` };
    
    markets.forEach(market => {
      const historicalVolumes = market.historicalVolumes || [];
      // We iterate backwards from D-0 (most recent) to D-N
      const volumeIndex = maxHistoryLength - 1 - index; 
      
      if (historicalVolumes[volumeIndex] !== undefined) {
        // Normalize volumes to percentage of average for comparison
        const normalizedValue = (historicalVolumes[volumeIndex] / market.averageVolume) * 100;
        dataPoint[market.ticker] = Math.round(normalizedValue);
      } else {
        // Use null or undefined if data point is missing
        dataPoint[market.ticker] = null;
      }
    });
    
    return dataPoint;
  }).reverse(); // Reverse again to have D-0 on the right

  // Prepare individual market data
  const getMarketChartData = (market: MarketData) => {
    if (!market.historicalVolumes) return [];
    
    return market.historicalVolumes.map((vol, index) => ({
      day: `D-${market.historicalVolumes!.length - 1 - index}`,
      volume: vol,
      average: market.averageVolume,
      ratio: (vol / market.averageVolume) * 100,
    })).reverse();
  };

  const colors: Record<string, string> = {
    SPY: 'hsl(187, 85%, 53%)',     // Primary cyan
    TOTAL: 'hsl(152, 69%, 45%)',   // Bullish green
    IBOV: 'hsl(38, 92%, 50%)',     // Warning amber
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          {payload.filter(p => p.value !== null).map((entry, index) => (
            <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Volume Histórico (% da Média)
        </h2>
      </div>

      {/* Combined Comparison Chart */}
      {chartData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            Comparativo Normalizado
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                stackOffset="none" // Crucial to prevent stacking if data is constant
              >
                <defs>
                  {markets.map(market => (
                    <linearGradient key={market.ticker} id={`gradient-${market.ticker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors[market.ticker]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors[market.ticker]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(215, 15%, 55%)" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(215, 15%, 55%)" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '10px',
                    fontSize: '12px',
                  }}
                />
                {/* 100% reference line */}
                <Area
                  type="monotone"
                  dataKey={() => 100}
                  name="Média"
                  stroke="hsl(215, 15%, 35%)"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={1}
                />
                {markets.map(market => (
                  <Area
                    key={market.ticker}
                    type="monotone"
                    dataKey={market.ticker}
                    name={market.ticker}
                    stroke={colors[market.ticker]}
                    fill={`url(#gradient-${market.ticker})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Individual Market Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {markets.map((market, index) => {
          const data = getMarketChartData(market);
          if (data.length === 0) return null;

          return (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="p-4 rounded-lg bg-secondary/20 border border-border/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{market.flag}</span>
                <span className="text-sm font-semibold">{market.name}</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(215, 15%, 55%)" 
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(215, 15%, 55%)" 
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 8%)',
                        border: '1px solid hsl(215, 25%, 18%)',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(0)}%`, 'Volume Rel.']}
                    />
                    <Bar 
                      dataKey="ratio" 
                      fill={colors[market.ticker]}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Média: {formatVolume(market.averageVolume)}</span>
                <span className={market.volumeRatio > 1 ? 'text-bullish' : 'text-bearish'}>
                  Atual: {(market.volumeRatio * 100).toFixed(0)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};