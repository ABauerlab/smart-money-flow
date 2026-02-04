import { motion } from 'framer-motion';
import { BookOpen, Lightbulb } from 'lucide-react';
import { GlossaryEntry } from '@/types/glossary';

interface GlossaryItemProps {
  entry: GlossaryEntry;
}

export const GlossaryItem = ({ entry }: GlossaryItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-5 border-l-4 border-primary/50 space-y-3"
    >
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">{entry.term}</h3>
      </div>
      
      <p className="text-muted-foreground leading-relaxed">{entry.definition}</p>
      
      {entry.example && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
          <Lightbulb className="w-4 h-4 mt-1 text-warning flex-shrink-0" />
          <p className="text-sm text-warning font-mono">
            Exemplo: {entry.example}
          </p>
        </div>
      )}
    </motion.div>
  );
};