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
    latestVersion,
    dismissedVersion,
  } = useAppSelector((state) => state.update);

  // Handle SSE update events
  const handleUpdateEvent = useCallback(
    (event: UpdateEvent) => {
      console.log('[useAutoUpdate] Received update event:', event);

      switch (event.stage) {
        case 'preparing':
        case 'pulling':
        case 'installing':
        case 'building':
        case 'restarting':
          console.log(
            `[useAutoUpdate] Setting stage to ${event.stage} with progress ${event.progress}`
          );
          dispatch(
            setUpdateStage({
              stage: event.stage,
              progress: event.progress ?? 0,
              message: event.message,
            })
          );
          break;
        case 'complete':
          console.log('[useAutoUpdate] Update complete, new version:', event.newVersion);
          dispatch(completeUpdate(event.newVersion ?? 'unknown'));
          break;
        case 'error':
          console.error('[useAutoUpdate] Update error:', event.message);
          dispatch(setUpdateError(event.message ?? 'Update failed'));
          break;
        case 'rolling_back':
          console.warn('[useAutoUpdate] Rolling back update:', event.message);
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
    console.log('[useAutoUpdate] Starting update process...');
    dispatch(startUpdate());

    // Use fetch for POST SSE (EventSource only supports GET)
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    console.log('[useAutoUpdate] Sending POST request to /api/update');

    fetch('/api/update', {
      method: 'POST',
      signal: abortController.signal,
    })
      .then(async (response) => {
        console.log(
          '[useAutoUpdate] Update response received:',
          response.status,
          response.statusText
        );

        if (!response.ok) {
          throw new Error(`Update request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        console.log('[useAutoUpdate] Starting to read SSE stream...');

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[useAutoUpdate] SSE stream ended');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.slice(6);
                console.log('[useAutoUpdate] Raw SSE data:', dataStr);
                const data = JSON.parse(dataStr) as UpdateEvent;
                handleUpdateEvent(data);
              } catch (error) {
                console.error('[useAutoUpdate] Failed to parse SSE data:', error, 'Line:', line);
              }
            }
          }
        }
      })
      .catch((error: Error) => {
        console.error('[useAutoUpdate] Update fetch error:', error);
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

  useEffect(() => {
    if (
      autoUpdateEnabled &&
      updateAvailable &&
      !showConfirmDialogState &&
      !isUpdating &&
      latestVersion &&
      latestVersion !== dismissedVersion
    ) {
      dispatch(showConfirmDialog(true));
    }
  }, [
    autoUpdateEnabled,
    updateAvailable,
    showConfirmDialogState,
    isUpdating,
    latestVersion,
    dismissedVersion,
    dispatch,
  ]);

  return {
    triggerUpdate,
    cancelUpdate,
    isUpdating,
    updateProgress,
    updateStage,
    updateError,
  };
}
