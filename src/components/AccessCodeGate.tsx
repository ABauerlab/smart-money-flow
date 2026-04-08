import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'smart-nelson-access-code';

export function getAccessCode(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setAccessCode(code: string) {
  localStorage.setItem(STORAGE_KEY, code);
}

export function clearAccessCode() {
  localStorage.removeItem(STORAGE_KEY);
}

interface AccessCodeGateProps {
  children: React.ReactNode;
}

export const AccessCodeGate = ({ children }: AccessCodeGateProps) => {
  const [code, setCode] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const stored = getAccessCode();
    if (stored && stored.length >= 4) {
      setHasAccess(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 4) {
      setAccessCode(code.trim());
      setHasAccess(true);
    }
  };

  if (hasAccess) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Código de Acesso</h2>
          <p className="text-sm text-muted-foreground">
            Digite seu código pessoal para acessar seus relatórios. Mínimo 4 caracteres.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Seu código de acesso..."
            className="bg-card border-border/50 text-center text-lg tracking-widest"
            autoFocus
          />
          <Button
            type="submit"
            disabled={code.trim().length < 4}
            className="w-full gap-2"
          >
            Acessar <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Cada código cria um espaço privado. Seus relatórios só serão visíveis com este código.
        </p>
      </motion.div>
    </div>
  );
};
