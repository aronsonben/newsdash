import { useState, useEffect, useRef } from 'react';
import { getUsageInfo, isDevelopment } from '../lib/usageTracker';
import { cacheManager } from '../lib/cacheManager';

export default function UsageIndicator() {
  const [usageInfo, setUsageInfo] = useState(() => getUsageInfo());
  const [showDevTools, setShowDevTools] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update usage info periodically and on storage changes
  useEffect(() => {
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

  // Close dev tools menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDevTools(false);
      }
    };

    if (showDevTools) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDevTools]);

  const handleShowCacheInfo = () => {
    const info = cacheManager.getCacheInfo();
    console.log('=== Cache Information ===');
    console.log(`Total entries: ${info.totalEntries}`);
    console.log(`Oldest entry: ${info.oldestEntry ? info.oldestEntry.toLocaleString() : 'N/A'}`);
    console.log(`Newest entry: ${info.newestEntry ? info.newestEntry.toLocaleString() : 'N/A'}`);
    console.log('========================');
    setShowDevTools(false);
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached responses?')) {
      cacheManager.clearAll();
      console.log('✓ Cache cleared successfully');
    }
    setShowDevTools(false);
  };

  const handleShowAllCacheEntries = () => {
    const entries = cacheManager.getAllCacheEntries();
    console.log('=== All Cache Entries ===');
    console.log(`Total: ${entries.length} entries`);
    entries.forEach((entry, index) => {
      console.log(`\n[${index + 1}] Hash: ${entry.promptHash}`);
      console.log(`    Timestamp: ${entry.timestamp.toLocaleString()}`);
      console.log(`    Data:`, entry.data);
    });
    console.log('\n========================');
    setShowDevTools(false);
  };

  // Development mode with dev tools
  if (isDevelopment) {
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowDevTools(!showDevTools)}
          className="text-[10px] opacity-75 text-[rgb(var(--text-muted))] hover:opacity-100 transition-opacity cursor-pointer"
        >
          Development Mode {showDevTools ? '▼' : '▲'}
        </button>
        
        {showDevTools && (
          <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 min-w-40 z-50">
            <button
              onClick={handleShowCacheInfo}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Show Cache Info
            </button>
            <button
              onClick={handleShowAllCacheEntries}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Show All Cache Entries
            </button>
            <button
              onClick={handleClearCache}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              Clear Cache
            </button>
          </div>
        )}
      </div>
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