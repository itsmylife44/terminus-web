'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[toast.type || 'info'];

  return (
    <div
      className={`${bgColor} text-white px-4 py-2 rounded-md shadow-lg animate-slide-in-right cursor-pointer`}
      role="alert"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="w-full text-left"
        aria-label="Dismiss notification"
      >
        {toast.message}
      </button>
    </div>
  );
}

const toastListeners: Set<(toast: Toast) => void> = new Set();
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
    };

    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, removeToast };
}

export function showToast(message: string, type?: 'success' | 'error' | 'info') {
  const toast: Toast = {
    id: `toast-${++toastIdCounter}`,
    message,
    type,
  };

  toastListeners.forEach((listener) => {
    listener(toast);
  });
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
}
