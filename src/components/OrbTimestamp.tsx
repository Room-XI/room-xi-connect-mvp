import { useState, useEffect } from 'react';

interface OrbTimestampProps {
  lastUpdated?: Date | string | null;
  className?: string;
}

export function OrbTimestamp({ lastUpdated, className = '' }: OrbTimestampProps) {
  const [relativeTime, setRelativeTime] = useState('');
  
  useEffect(() => {
    if (!lastUpdated) {
      setRelativeTime('Never updated');
      return;
    }
    
    const updateRelativeTime = () => {
      const now = Date.now();
      const updatedAt = new Date(lastUpdated).getTime();
      const diffMs = now - updatedAt;
      
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMinutes < 1) {
        setRelativeTime('Updated just now');
      } else if (diffMinutes < 60) {
        setRelativeTime(`Updated ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`);
      } else if (diffHours < 24) {
        setRelativeTime(`Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`);
      } else {
        setRelativeTime(`Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`);
      }
    };
    
    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 30000);
    
    return () => clearInterval(interval);
  }, [lastUpdated]);
  
  return (
    <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      {relativeTime}
    </div>
  );
}
