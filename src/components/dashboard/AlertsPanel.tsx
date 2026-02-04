import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Eye, Bell } from 'lucide-react';
import { Alert } from '@/types/market';

interface AlertsPanelProps {
  alerts: Alert[];
}

export const AlertsPanel = ({ alerts }: AlertsPanelProps) => {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'divergence':
        return <AlertTriangle className="w-4 h-4" />;
      case 'attention':
        return <Eye className="w-4 h-4" />;
      case 'opportunity':
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getAlertStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-bearish/40 bg-bearish/10 text-bearish';
      case 'medium':
        return 'border-warning/40 bg-warning/10 text-warning';
      case 'low':
        return 'border-bullish/40 bg-bullish/10 text-bullish';
    }
  };

  const getTypeLabel = (type: Alert['type']) => {
    switch (type) {
      case 'divergence':
        return 'Divergência';
      case 'attention':
        return 'Atenção';
      case 'opportunity':
        return 'Oportunidade';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-bearish/10">
          <Bell className="w-5 h-5 text-bearish" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Alertas de "Dinheiro Grosso"
        </h2>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className={`p-4 rounded-lg border ${getAlertStyles(alert.severity)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {getTypeLabel(alert.type)}
                  </span>
                  <span className="text-xs opacity-70">•</span>
                  <span className="text-xs opacity-70">{alert.market}</span>
                </div>
                <p className="text-sm text-foreground/90">{alert.message}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
