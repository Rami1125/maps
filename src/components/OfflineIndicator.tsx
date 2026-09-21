import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-400/50 animate-pulse">
      <WifiOff className="w-4 h-4 text-white" />
      <span>מצב אופליין — נתונים מוצגים מזיכרון המטמון (Cache)</span>
      <button
        onClick={() => window.location.reload()}
        title="טען מחדש"
        className="mr-2 p-1 hover:bg-white/20 rounded-md transition"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
