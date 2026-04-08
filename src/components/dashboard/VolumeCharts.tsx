import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Filter } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Legend, CartesianGrid, Cell 
} from 'recharts';
import { MarketData } from '@/types/market';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VolumeChartsProps {
  markets: MarketData[];
}

export const VolumeCharts = ({ markets }: VolumeChartsProps) => {
  const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || 'usa');
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');

  const selectedMarket = markets.find(m => m.id === selectedMarketId) || markets[0];

  // Mock monthly data if not present
  const getMonthlyData = (market: MarketData) => {
    if (market.monthlyVolumes) return market.monthlyVolumes;
    
    // Generate mock monthly data for demonstration
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map(m => ({
      month: m,
      volume: market.averageVolume * (0.8 + Math.random() * 0.6),
      average: market.averageVolume
    }));
  };

  const getDailyData = (market: MarketData) => {
    if (!market.historicalVolumes) {
      // Mock daily data
      return Array.from({ length: 10 }).map((_, i) => ({
        day: `D-${9 - i}`,
        ratio: (0.7 + Math.random() * 0.8) * 100
      }));
    }
    
    return market.historicalVolumes.map((vol, index) => ({
      day: `D-${market.historicalVolumes!.length - 1 - index}`,
      ratio: (vol / market.averageVolume) * 100,
    })).reverse();
  };

  const chartData = viewType === 'daily' ? getDailyData(selectedMarket) : getMonthlyData(selectedMarket);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Análise de Volume Institucional
            </h2>
            <p className="text-xs text-muted-foreground">Compare o fluxo diário e mensal</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border/50">
            <Filter className="w-3.5 h-3.5 text-muted-foreground ml-2" />
            <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
              <SelectTrigger className="h-8 w-[180px] bg-transparent border-none focus:ring-0">
                <SelectValue placeholder="Selecionar Mercado" />
              </SelectTrigger>
              <SelectContent>
                {markets.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.flag} {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)} className="w-auto">
            <TabsList className="h-8 bg-secondary/30 border border-border/50">
              <TabsTrigger value="daily" className="text-xs h-6">Diário</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs h-6">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'daily' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.2} />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-card)',
                }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Volume Relativo']}
              />
              <Bar dataKey="ratio" radius={[4, 4, 0, 0]}>
                {chartData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.ratio > 120 ? 'hsl(var(--bullish))' : entry.ratio < 80 ? 'hsl(var(--bearish))' : 'hsl(var(--primary))'} 
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.2} />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Bar name="Volume Real" dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar name="Média Histórica" dataKey="average" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${selectedMarket.volumeRatio > 1.2 ? 'bg-bullish animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm font-semibold">
              {selectedMarket.volumeRatio > 1.2 ? 'Atividade Institucional Alta' : 'Atividade Normal'}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Z-Score (Desvio)</p>
          <span className={`text-sm font-mono font-bold ${Math.abs(selectedMarket.zScore) > 1.5 ? 'text-primary' : ''}`}>
            {selectedMarket.zScore > 0 ? '+' : ''}{selectedMarket.zScore.toFixed(2)}σ
          </span>
        </div>
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Convicção</p>
          <span className="text-sm font-bold">{selectedMarket.convictionScore.toFixed(1)}/10</span>
        </div>
      </div>
    </motion.div>
  );
};