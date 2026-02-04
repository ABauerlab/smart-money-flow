import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/types/market';

interface NotificationState {
  permission: NotificationPermission;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

const ALERT_SOUNDS = {
  high: '/sounds/alert-high.mp3',
  medium: '/sounds/alert-medium.mp3',
  low: '/sounds/alert-low.mp3',
};

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    soundEnabled: true,
    notificationsEnabled: true,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processedAlertsRef = useRef<Set<string>>(new Set());

  // Initialize permission state
  useEffect(() => {
    if ('Notification' in window) {
      setState(prev => ({ ...prev, permission: Notification.permission }));
    }
    
    // Load preferences from localStorage
    const savedSound = localStorage.getItem('smartmoney_sound');
    const savedNotifs = localStorage.getItem('smartmoney_notifications');
    
    setState(prev => ({
      ...prev,
      soundEnabled: savedSound !== 'false',
      notificationsEnabled: savedNotifs !== 'false',
    }));
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    setState(prev => ({ ...prev, permission }));
    return permission === 'granted';
  }, []);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const newValue = !prev.soundEnabled;
      localStorage.setItem('smartmoney_sound', String(newValue));
      return { ...prev, soundEnabled: newValue };
    });
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    
    setState(prev => {
      const newValue = !prev.notificationsEnabled;
      localStorage.setItem('smartmoney_notifications', String(newValue));
      return { ...prev, notificationsEnabled: newValue };
    });
  }, [state.permission, requestPermission]);

  const playSound = useCallback(async (severity: Alert['severity']) => {
    if (!state.soundEnabled) return;

    try {
      // Use Web Audio API for more reliable playback
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Generate a simple tone based on severity
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different severities
      const frequencies = {
        high: [880, 1100, 880], // Urgent - higher pitch
        medium: [660, 770, 660], // Warning - medium pitch
        low: [440, 550, 440], // Info - lower pitch
      };
      
      const freqs = frequencies[severity];
      const duration = severity === 'high' ? 0.15 : 0.2;
      
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      // Play sequence of tones
      for (let i = 0; i < freqs.length; i++) {
        const startTime = audioContext.currentTime + i * duration;
        oscillator.frequency.setValueAtTime(freqs[i], startTime);
      }
      
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + freqs.length * duration
      );
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + freqs.length * duration);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }, [state.soundEnabled]);

  const showNotification = useCallback((alert: Alert) => {
    if (!state.notificationsEnabled || state.permission !== 'granted') return;
    if (!('Notification' in window)) return;

    const severityEmoji = {
      high: '🚨',
      medium: '⚠️',
      low: '💡',
    };

    const typeLabel = {
      divergence: 'Divergência',
      attention: 'Atenção',
      opportunity: 'Oportunidade',
    };

    new Notification(`${severityEmoji[alert.severity]} ${typeLabel[alert.type]} - ${alert.market}`, {
      body: alert.message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: alert.id,
      requireInteraction: alert.severity === 'high',
      silent: true, // We handle sound separately
    });
  }, [state.notificationsEnabled, state.permission]);

  const processAlerts = useCallback((alerts: Alert[]) => {
    const newAlerts = alerts.filter(alert => {
      const alertKey = `${alert.id}-${alert.timestamp}`;
      if (processedAlertsRef.current.has(alertKey)) {
        return false;
      }
      processedAlertsRef.current.add(alertKey);
      return true;
    });

    // Keep only last 100 processed alerts to prevent memory leak
    if (processedAlertsRef.current.size > 100) {
      const entries = Array.from(processedAlertsRef.current);
      processedAlertsRef.current = new Set(entries.slice(-50));
    }

    // Process new alerts with sound and notifications
    newAlerts.forEach(alert => {
      playSound(alert.severity);
      showNotification(alert);
    });

    return newAlerts;
  }, [playSound, showNotification]);

  return {
    ...state,
    requestPermission,
    toggleSound,
    toggleNotifications,
    playSound,
    showNotification,
    processAlerts,
  };
};
