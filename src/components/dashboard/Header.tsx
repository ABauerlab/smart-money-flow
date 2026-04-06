import { motion } from 'framer-motion';
import { RefreshCw, Wifi, BookOpenText, Home, BrainCircuit, HelpCircle, LogOut, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { NotificationControls } from './NotificationControls';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Logo } from '@/components/Logo';

interface HeaderProps {
  lastUpdated?: Date;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  notificationPermission?: NotificationPermission;
  onToggleSound?: () => void;
  onToggleNotifications?: () => void;
}

const REFRESH_INTERVAL = 60; // seconds

export const Header = ({ 
  lastUpdated,
  soundEnabled = true,
  notificationsEnabled = true,
  notificationPermission = 'default',
  onToggleSound,
  onToggleNotifications,
}: HeaderProps) => {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return REFRESH_INTERVAL;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset countdown when data updates
  useEffect(() => {
    setCountdown(REFRESH_INTERVAL);
  }, [lastUpdated]);

  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setCountdown(REFRESH_INTERVAL);
    await queryClient.invalidateQueries({ queryKey: ['market-data'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const navButton = (to: string, icon: React.ReactNode, label: string) => (
    <Link to={to} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
      <Tooltip>
        <TooltipTrigger asChild>{icon}</TooltipTrigger>
        <TooltipContent><p>{label}</p></TooltipContent>
      </Tooltip>
    </Link>
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between px-4 md:px-6 py-4 border-b border-border/50 gap-4 bg-background/80 backdrop-blur-md sticky top-0 z-50"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              <span className="gradient-text">Smart Nelson Money</span>
              <span className="text-foreground/80 ml-2 hidden sm:inline">Flow Tracker</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Análise de Fluxo Institucional • Atualizado: {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {navButton('/', <Home className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />, 'Início')}
        {navButton('/glossario', <BookOpenText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />, 'Glossário')}
        {navButton('/analise-ia', <BrainCircuit className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />, 'Análise IA')}
        {navButton('/guia', <HelpCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />, 'Guia do Sistema')}

        {onToggleSound && onToggleNotifications && (
          <NotificationControls
            soundEnabled={soundEnabled}
            notificationsEnabled={notificationsEnabled}
            permission={notificationPermission}
            onToggleSound={onToggleSound}
            onToggleNotifications={onToggleNotifications}
          />
        )}

        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Wifi className="w-4 h-4 text-bullish animate-pulse" />
          <span className="font-mono">LIVE</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
          <span className="text-sm font-mono text-foreground/80">{currentTime}</span>
        </div>

        {/* Refresh with countdown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="relative p-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors group disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="absolute -bottom-1 -right-1 text-[9px] font-mono font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                {countdown}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Próxima atualização em {countdown}s</p>
              <p className="text-xs text-muted-foreground">Para atualização manual, clique aqui</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className="p-2 rounded-lg bg-secondary/50 hover:bg-destructive/20 transition-colors group"
            >
              <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Sair</p></TooltipContent>
        </Tooltip>
      </div>
    </motion.header>
  );
};
