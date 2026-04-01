import { motion } from 'framer-motion';
import { RefreshCw, Wifi, BookOpenText, Home, BrainCircuit } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { NotificationControls } from './NotificationControls';
import { Link } from 'react-router-dom';
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

export const Header = ({ 
  lastUpdated,
  soundEnabled = true,
  notificationsEnabled = true,
  notificationPermission = 'default',
  onToggleSound,
  onToggleNotifications,
}: HeaderProps) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['market-data'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

      <div className="flex items-center gap-3 sm:gap-6">
        <Link 
          to="/"
          className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Home className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar ao Início</p>
            </TooltipContent>
          </Tooltip>
        </Link>

        <Link 
          to="/glossario"
          className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <BookOpenText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Glossário de Termos</p>
            </TooltipContent>
          </Tooltip>
        </Link>

        <Link 
          to="/analise-ia"
          className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <BrainCircuit className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Análise IA de Criptomoedas</p>
            </TooltipContent>
          </Tooltip>
        </Link>

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

        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </motion.header>
  );
};