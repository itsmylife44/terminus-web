'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  startUpdate,
  setUpdateStage,
  setUpdateError,
  completeUpdate,
  showConfirmDialog,
  resetUpdateState,
  type UpdateStage,
} from '@/lib/store/updateSlice';

interface UpdateEvent {
  stage: UpdateStage;
  progress?: number;
  message?: string;
  canRetry?: boolean;
  newVersion?: string;
}

export interface UseAutoUpdateReturn {
  triggerUpdate: () => void;
  cancelUpdate: () => void;
  isUpdating: boolean;
  updateProgress: number;
  updateStage: UpdateStage | null;
  updateError: string | null;
}

export function useAutoUpdate(): UseAutoUpdateReturn {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    autoUpdateEnabled,
    updateAvailable,
    showConfirmDialog: showConfirmDialogState,
    isUpdating,
    updateStage,
    updateProgress,
    updateError,
  } = useAppSelector((state) => state.update);

  // Handle SSE update events
  const handleUpdateEvent = useCallback(
    (event: UpdateEvent) => {
      switch (event.stage) {
        case 'preparing':
        case 'pulling':
        case 'installing':
        case 'building':
        case 'restarting':
          dispatch(
            setUpdateStage({
              stage: event.stage,
              progress: event.progress ?? 0,
              message: event.message,
            })
          );
          break;
        case 'complete':
          dispatch(completeUpdate(event.newVersion ?? 'unknown'));
          break;
        case 'error':
          dispatch(setUpdateError(event.message ?? 'Update failed'));
          break;
        case 'rolling_back':
          dispatch(
            setUpdateStage({
              stage: 'rolling_back',
              progress: 0,
              message: event.message,
            })
          );
          break;
      }
    },
    [dispatch]
  );

  // Trigger update process via SSE
  const triggerUpdate = useCallback(() => {
    dispatch(startUpdate());

    // Use fetch for POST SSE (EventSource only supports GET)
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    fetch('/api/update', {
      method: 'POST',
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Update request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          // Parse SSE format: "data: {...}\n\n"
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as UpdateEvent;
                handleUpdateEvent(data);
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          dispatch(setUpdateError(error.message));
        }
      });
  }, [dispatch, handleUpdateEvent]);

  // Cancel update and abort fetch
  const cancelUpdate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch(resetUpdateState());
  }, [dispatch]);

  // Auto-update trigger: show confirmation dialog when enabled + update available
  useEffect(() => {
    if (autoUpdateEnabled && updateAvailable && !showConfirmDialogState && !isUpdating) {
      dispatch(showConfirmDialog(true)); // true = isAutoUpdateTrigger
    }
  }, [autoUpdateEnabled, updateAvailable, showConfirmDialogState, isUpdating, dispatch]);

  return {
    triggerUpdate,
    cancelUpdate,
    isUpdating,
    updateProgress,
    updateStage,
    updateError,
  };
}
