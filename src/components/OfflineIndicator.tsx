import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 dark:bg-amber-500 text-zinc-950 px-3.5 py-2 text-xs font-bold shadow-lg border border-amber-400/40 animate-in slide-in-from-bottom-2"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="block leading-tight">Modo Offline Ativo</span>
        <span className="block text-[10px] font-medium opacity-85 truncate">
          Os dados do inventário continuam salvos localmente
        </span>
      </div>
      <span className="h-2 w-2 rounded-full bg-zinc-950 animate-ping flex-shrink-0" />
    </div>
  );
};
