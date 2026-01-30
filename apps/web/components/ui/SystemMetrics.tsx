'use client';

import { useState } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import { ChevronDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Get color class based on percentage threshold
function getColorClass(percent: number): string {
  if (percent > 80) return 'bg-red-500';
  if (percent > 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

// Format uptime from seconds to readable format
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  
  return parts.join(' ') || '0m';
}

// Mini progress bar component
interface MetricBarProps {
  label: string;
  percent: number;
  className?: string;
}

function MetricBar({ label, percent, className }: MetricBarProps) {
  const colorClass = getColorClass(percent);
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-gray-400 w-10">{label}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden min-w-[40px]">
        <div 
          className={cn("h-full transition-all duration-300", colorClass)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{percent}%</span>
    </div>
  );
}

export default function SystemMetrics() {
  const [isOpen, setIsOpen] = useState(false);
  const metrics = useAppSelector((state) => state.metrics);
  
  // Format load average for display
  const loadDisplay = `${metrics.load.avg1.toFixed(2)}`;
  const uptimeDisplay = formatUptime(metrics.uptime);

  return (
    <div className="system-metrics flex items-center">
      {/* Desktop view - inline metrics */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <MetricBar label="CPU" percent={metrics.cpu} />
        <MetricBar label="RAM" percent={metrics.memory.percent} />
        <MetricBar label="Disk" percent={metrics.disk.percent} />
        <div className="flex items-center gap-2 text-gray-400">
          <span>Load: {loadDisplay}</span>
          <span className="text-gray-600">|</span>
          <span>Up: {uptimeDisplay}</span>
        </div>
      </div>

      {/* Mobile view - dropdown */}
      <div className="md:hidden relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="metrics-toggle flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-md border border-white/0 hover:border-white/10 transition-all duration-200"
        >
          <Activity className="w-4 h-4" />
          <span>Metrics</span>
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>

        {/* Mobile dropdown panel */}
        {isOpen && (
          <>
            {/* Click outside to close */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown content */}
            <div className="metrics-dropdown absolute top-full right-0 mt-2 z-20 bg-background-elevated/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl p-4 min-w-[250px]">
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">CPU</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-300", getColorClass(metrics.cpu))}
                        style={{ width: `${metrics.cpu}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{metrics.cpu}%</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">Memory</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-300", getColorClass(metrics.memory.percent))}
                        style={{ width: `${metrics.memory.percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{metrics.memory.percent}%</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">Disk</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-300", getColorClass(metrics.disk.percent))}
                        style={{ width: `${metrics.disk.percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{metrics.disk.percent}%</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Load Average</span>
                    <span className="text-gray-400">{loadDisplay}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Uptime</span>
                    <span className="text-gray-400">{uptimeDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
