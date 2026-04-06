import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, BarChart3, BrainCircuit, Bell, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: <Globe className="w-8 h-8 text-primary" />,
    title: 'Dashboard Global',
    desc: 'Monitore 10+ mercados em tempo real: ações, cripto, forex e opções. Cada card mostra volume, Z-Score e fluxo institucional.',
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-primary" />,
    title: 'Gráficos de Volume',
    desc: 'Compare volume diário e mensal. Identifique quando o dinheiro institucional está acima ou abaixo da média.',
  },
  {
    icon: <BrainCircuit className="w-8 h-8 text-primary" />,
    title: 'Análise IA',
    desc: 'Envie imagens de relatórios de cripto. A IA detecta padrões, rastreia repetições e gera relatórios semanais a semestrais.',
  },
  {
    icon: <Bell className="w-8 h-8 text-primary" />,
    title: 'Alertas Inteligentes',
    desc: 'Receba notificações push e alertas sonoros quando houver movimentação institucional significativa.',
  },
];

export const OnboardingTour = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('onboarding-seen');
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('onboarding-seen', 'true');
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-xl max-w-md w-full p-8 relative"
        >
          <button onClick={dismiss} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              {steps[step].icon}
            </div>
            <h3 className="text-xl font-bold text-foreground">{steps[step].title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{steps[step].desc}</p>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-6">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            {step < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={dismiss}>
                Começar! 🚀
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
