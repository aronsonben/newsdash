import React from 'react';
import { getUsageInfo, isDevelopment } from '../lib/usageTracker';

export default function UsageIndicator() {
  const [usageInfo, setUsageInfo] = React.useState(() => getUsageInfo());

  // Update usage info periodically and on storage changes
  React.useEffect(() => {
    const updateUsage = () => {
      setUsageInfo(getUsageInfo());
    };

    // Update every 1 second to catch changes
    const interval = setInterval(updateUsage, 1000);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'newsdash_api_usage') {
        updateUsage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Don't show in development
  if (isDevelopment) {
    return (
      <span 
        className="text-[10px] opacity-75"
        style={{ color: 'rgb(var(--text-muted))' }}
      >
        Development Mode
      </span>
    );
  }

  const { used, limit, remaining } = usageInfo;
  const isNearLimit = remaining <= 5;
  const isAtLimit = remaining === 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span style={{ color: 'rgb(var(--text-muted))' }}>
        API Usage:
      </span>
      <div className="flex items-center gap-1">
        <span 
          className={`font-medium ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : ''}`}
          style={!isAtLimit && !isNearLimit ? { color: 'rgb(var(--text-secondary))' } : {}}
        >
          {used}/{limit}
        </span>
        <div 
          className="w-16 h-1 bg-opacity-20 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--text-muted))' }}
        >
          <div
            className={`h-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${(used / limit) * 100}%` }}
          />
        </div>
        {remaining > 0 && (
          <span 
            className="text-xs opacity-75"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            ({remaining} left)
          </span>
        )}
        {isAtLimit && (
          <span className="text-xs text-red-500 font-medium">
            Limit reached
          </span>
        )}
      </div>
    </div>
  );
}