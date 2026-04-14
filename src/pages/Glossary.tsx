import { motion } from 'framer-motion';
import { BookOpenText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlossaryItem } from '@/components/GlossaryItem';
import { glossaryData } from '@/lib/glossaryData';

const Glossary = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpenText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Glossário Fluxo Dos Mercados</h1>
          </div>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
        </div>
      </header>

      <main className="container py-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-muted-foreground mb-8 max-w-3xl"
        >
          Entenda os termos técnicos e métricas utilizadas para rastrear o fluxo de dinheiro institucional (Smart Money) nos mercados globais.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {glossaryData.map((entry, index) => (
            <GlossaryItem key={index} entry={entry} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Glossary;