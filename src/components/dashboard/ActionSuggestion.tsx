import { motion } from 'framer-motion';
import { Target, ArrowRight, Clock } from 'lucide-react';

interface ActionSuggestionProps {
  hotMarket: string;
}

export const ActionSuggestion = ({ hotMarket }: ActionSuggestionProps) => {
  const suggestions = [
    {
      action: `Focar em ${hotMarket} nas próximas 4-8h`,
      priority: 'high',
      reason: 'Maior convicção institucional detectada',
    },
    {
      action: 'Reduzir exposição à B3',
      priority: 'medium',
      reason: 'Baixa liquidez e fluxo de saída',
    },
    {
      action: 'Acompanhar rompimento no S&P500',
      priority: 'medium',
      reason: 'Volume crescente em zona de resistência',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-primary/20 border-primary/40 text-primary';
      case 'medium':
        return 'bg-warning/20 border-warning/40 text-warning';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
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
          <Target className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ação Sugerida
        </h2>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{suggestion.action}</p>
                <p className="text-xs mt-1 opacity-80">{suggestion.reason}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Análise atualizada em tempo real</span>
      </div>
    </motion.div>
  );
};
