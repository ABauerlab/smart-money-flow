import { motion } from 'framer-motion';
import { Newspaper, ExternalLink } from 'lucide-react';
import { NewsArticle } from '@/types/market';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsPanelProps {
  news: NewsArticle[];
}

export const NewsPanel = ({ news }: NewsPanelProps) => {
  if (news.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card p-6 text-center text-muted-foreground"
      >
        <Newspaper className="w-6 h-6 mx-auto mb-3" />
        <p>Nenhuma notícia recente encontrada para os mercados rastreados.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Newspaper className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Notícias de Mercado (Fluxo dos Mercados)
        </h2>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {news.map((article, index) => (
          <motion.a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + index * 0.05 }}
            className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-foreground leading-snug pr-4">
                {article.title}
              </p>
              <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span className="font-mono px-2 py-0.5 rounded bg-primary/10 text-primary/80">
                {article.market}
              </span>
              <span className="flex items-center gap-1">
                {article.source} • {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
};