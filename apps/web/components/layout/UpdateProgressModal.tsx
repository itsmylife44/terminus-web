'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning';
}

interface UpdateProgressModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onRetry?: () => void;
}

const UPDATE_STAGES = [
  { id: 'preparing', label: 'Preparing', progress: 10 },
  { id: 'pulling', label: 'Pulling', progress: 30 },
  { id: 'installing', label: 'Installing', progress: 50 },
  { id: 'building', label: 'Building', progress: 70 },
  { id: 'restarting', label: 'Restarting', progress: 90 },
  { id: 'complete', label: 'Complete', progress: 100 },
] as const;

type UpdateStage = (typeof UPDATE_STAGES)[number]['id'];

export function UpdateProgressModal({ isOpen, onClose, onRetry }: UpdateProgressModalProps) {
  const [currentStage, setCurrentStage] = useState<UpdateStage>('preparing');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'updating' | 'success' | 'error'>('updating');
  const [error, setError] = useState<string | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  useEffect(() => {
    const scrollToBottom = () => {
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }
    };
    scrollToBottom();
  });

  const addLog = useCallback((stage: string, message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const logEntry: LogEntry = {
      id: `log-${logIdCounter.current++}`,
      timestamp,
      stage: stage.toUpperCase(),
      message,
      type,
    };

    console.log(`[UpdateProgressModal] [${timestamp}] [${stage}] ${message}`);
    setLogs((prev) => [...prev, logEntry]);
  }, []);

  const handleProgressEvent = useCallback((data: any) => {
    console.log('[UpdateProgressModal] Progress update:', data);
    setProgress(data.progress || 0);
  }, []);

  const handleLogEvent = useCallback(
    (data: any) => {
      console.log('[UpdateProgressModal] Log event:', data);
      addLog(data.stage || 'info', data.message, data.level || 'info');
    },
    [addLog]
  );

  const handleStageEvent = useCallback(
    (data: any) => {
      console.log('[UpdateProgressModal] Stage change:', data);
      const stage = data.stage as UpdateStage;
      setCurrentStage(stage);

      const stageInfo = UPDATE_STAGES.find((s) => s.id === stage);
      if (stageInfo) {
        setProgress(stageInfo.progress);
        addLog(stage, `Starting ${stageInfo.label.toLowerCase()}...`, 'info');
      }
    },
    [addLog]
  );

  const handleCompleteEvent = useCallback(
    (data: any) => {
      console.log('[UpdateProgressModal] Update complete:', data);
      setStatus('success');
      setProgress(100);
      setCurrentStage('complete');
      addLog('complete', 'Update completed successfully!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    [addLog]
  );

  const handleErrorEvent = useCallback(
    (data: any) => {
      console.error('[UpdateProgressModal] Update error:', data);
      setStatus('error');
      setError(data.message || 'Update failed');
      addLog('error', data.message || 'Update failed', 'error');
    },
    [addLog]
  );

  useEffect(() => {
    if (!isOpen) return;

    console.log('[UpdateProgressModal] Connecting to SSE for update progress...');

    const eventSource = new EventSource('/api/auto-update/progress');

    eventSource.onopen = () => {
      console.log('[UpdateProgressModal] SSE connection opened');
      addLog('preparing', 'Connected to update server', 'info');
    };

    eventSource.onmessage = (event) => {
      try {
        console.log('[UpdateProgressModal] SSE message received:', event.data);
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          handleProgressEvent(data);
        } else if (data.type === 'log') {
          handleLogEvent(data);
        } else if (data.type === 'stage') {
          handleStageEvent(data);
        } else if (data.type === 'complete') {
          handleCompleteEvent(data);
        } else if (data.type === 'error') {
          handleErrorEvent(data);
        }
      } catch (err) {
        console.error('[UpdateProgressModal] Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[UpdateProgressModal] SSE error:', error);
      addLog('error', 'Connection lost. Retrying...', 'warning');

      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[UpdateProgressModal] Attempting to reconnect...');
        }
      }, 1000);
    };

    return () => {
      console.log('[UpdateProgressModal] Closing SSE connection');
      eventSource.close();
    };
  }, [
    isOpen,
    addLog,
    handleProgressEvent,
    handleLogEvent,
    handleStageEvent,
    handleCompleteEvent,
    handleErrorEvent,
  ]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-white/70';
    }
  };

  const getStageIcon = (stageId: UpdateStage) => {
    const stageIndex = UPDATE_STAGES.findIndex((s) => s.id === stageId);
    const currentIndex = UPDATE_STAGES.findIndex((s) => s.id === currentStage);

    if (status === 'error' && stageId === currentStage) {
      return <XCircle className="h-5 w-5 text-red-400" />;
    }

    if (stageIndex < currentIndex || (status === 'success' && stageId === 'complete')) {
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    }

    if (stageIndex === currentIndex && status === 'updating') {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-400" />;
    }

    return <div className="h-5 w-5 rounded-full border-2 border-white/20" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background-deep/95 backdrop-blur-2xl"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative mx-4 w-full max-w-3xl"
          >
            <div className="overflow-hidden rounded-2xl border border-white/6 bg-background-elevated/80 backdrop-blur-xl">
              <div className="border-b border-white/6 p-6">
                <h2 className="text-2xl font-semibold text-white">System Update in Progress</h2>
                <p className="mt-2 text-sm text-white/60">
                  Please wait while we update your system. This may take a few minutes.
                </p>
              </div>

              <div className="border-b border-white/6 p-6">
                <div className="flex items-center justify-between">
                  {UPDATE_STAGES.filter((s) => s.id !== 'complete').map((stage, index) => (
                    <div key={stage.id} className="flex items-center">
                      <div className="flex items-center">
                        {getStageIcon(stage.id)}
                        <span
                          className={`ml-2 text-sm font-medium ${
                            UPDATE_STAGES.findIndex((s) => s.id === currentStage) >= index
                              ? 'text-white'
                              : 'text-white/40'
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                      {index < UPDATE_STAGES.length - 2 && (
                        <div
                          className={`mx-4 h-px w-12 ${
                            UPDATE_STAGES.findIndex((s) => s.id === currentStage) > index
                              ? 'bg-green-400'
                              : 'bg-white/20'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                  </div>
                  <p className="mt-2 text-center text-sm text-white/60">{progress}% complete</p>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/80">Live Logs</h3>
                  <span className="text-xs text-white/40">{logs.length} entries</span>
                </div>
                <div
                  ref={logsContainerRef}
                  className="h-64 overflow-y-auto rounded-lg border border-white/6 bg-black/30 p-3 font-mono text-xs"
                >
                  {logs.length === 0 ? (
                    <div className="text-white/40">Waiting for logs...</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className={`mb-1 ${getLogColor(log.type)}`}>
                        <span className="text-white/40">[{log.timestamp}]</span>
                        <span className="mx-1 text-white/60">[{log.stage}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-white/6 p-6">
                {status === 'updating' && (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/60" />
                    <span className="text-sm text-white/60">
                      Update in progress. Please do not close this window.
                    </span>
                  </div>
                )}

                {status === 'success' && (
                  <div className="flex items-center justify-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">
                      Update completed successfully! Reloading...
                    </span>
                  </div>
                )}

                {status === 'error' && (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex items-center">
                      <XCircle className="mr-2 h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">{error}</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onRetry}
                        className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry Update
                      </button>
                      {onClose && (
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
