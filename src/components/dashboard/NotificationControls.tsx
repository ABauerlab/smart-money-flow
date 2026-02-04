import { motion } from 'framer-motion';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NotificationControlsProps {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  permission: NotificationPermission;
  onToggleSound: () => void;
  onToggleNotifications: () => void;
}

export const NotificationControls = ({
  soundEnabled,
  notificationsEnabled,
  permission,
  onToggleSound,
  onToggleNotifications,
}: NotificationControlsProps) => {
  const notificationIcon = notificationsEnabled && permission === 'granted' 
    ? <Bell className="w-4 h-4" />
    : <BellOff className="w-4 h-4" />;

  const soundIcon = soundEnabled 
    ? <Volume2 className="w-4 h-4" />
    : <VolumeX className="w-4 h-4" />;

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSound}
            className={`h-8 w-8 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              animate={soundEnabled ? { scale: [1, 1.1, 1] } : {}}
            >
              {soundIcon}
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{soundEnabled ? 'Som ativado' : 'Som desativado'}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleNotifications}
            className={`h-8 w-8 ${notificationsEnabled && permission === 'granted' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              animate={notificationsEnabled && permission === 'granted' ? { scale: [1, 1.1, 1] } : {}}
            >
              {notificationIcon}
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {permission === 'denied' 
              ? 'Notificações bloqueadas pelo navegador'
              : notificationsEnabled 
                ? 'Notificações ativadas' 
                : 'Clique para ativar notificações'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
