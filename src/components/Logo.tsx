import { Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export const Logo = () => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative p-2 rounded-lg bg-primary/10 glow-primary overflow-hidden"
    >
      {/* Background flow effect */}
      <div className="absolute inset-0 opacity-20" style={{ 
        background: 'radial-gradient(circle at 70% 30%, hsl(var(--primary)) 0%, transparent 70%)'
      }} />
      
      {/* Main Icon: Target for tracking, TrendingUp for flow */}
      <Target className="w-6 h-6 text-primary relative z-10" />
      <TrendingUp className="w-3 h-3 text-bullish absolute top-1 right-1 z-10" />
    </motion.div>
  );
};