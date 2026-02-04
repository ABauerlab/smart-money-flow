import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { MarketData } from '@/types/market';
import { formatVolume } from '@/lib/mockData';

interface VolumeChartsProps {
  markets: MarketData[];
}

export const VolumeCharts = ({ markets }: VolumeChartsProps) => {
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