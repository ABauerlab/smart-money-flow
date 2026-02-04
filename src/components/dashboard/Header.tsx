import { motion } from 'framer-motion';
import { Activity, RefreshCw, Wifi } from 'lucide-react';

export const Header = () => {
  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-6 py-4 border-b border-border/50"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 glow-primary">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="gradient-text">Smart Money</span>
              <span className="text-foreground/80 ml-2">Flow Tracker</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Análise de Fluxo Institucional
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wifi className="w-4 h-4 text-bullish animate-pulse" />
          <span className="font-mono">LIVE</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
          <span className="text-sm font-mono text-foreground/80">{currentTime}</span>
        </div>

        <button className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
          <RefreshCw className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </motion.header>
  );
};
