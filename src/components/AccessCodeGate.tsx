import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, KeyRound, Loader2 } from 'lucide-react';
import { useAccessCode } from '@/contexts/AccessCodeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const AccessCodeGate = ({ children }: { children: React.ReactNode }) => {
  const { accessCode, setAccessCode, isReady } = useAccessCode();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessCode) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('O código deve ter pelo menos 4 caracteres');
      return;
    }
    setAccessCode(code.trim());
  };

  return (
    <div className="min-h-screen bg-[#000] flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 mx-auto mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SMART NELSON</h1>
          <p className="text-xs text-[#888] mt-1 uppercase tracking-widest">
            Digite seu código de acesso
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <KeyRound className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm text-[#aaa]">
              Use um código pessoal para acessar seus relatórios de forma privada.
              Lembre-se dele — é a sua chave de acesso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Seu código de acesso (mín. 4 caracteres)"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-[#555] text-center text-lg font-mono tracking-widest"
                autoFocus
              />
              {error && <p className="text-xs text-destructive mt-1 text-center">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-widest"
            >
              Acessar
            </Button>
          </form>

          <p className="text-center text-[10px] text-[#555] leading-relaxed">
            Cada código cria um espaço privado de relatórios.
            Use sempre o mesmo código para ver seus dados.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
