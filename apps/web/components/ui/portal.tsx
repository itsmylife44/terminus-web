'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

export function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure we only mount on client side (SSR safety)
    if (typeof document === 'undefined') return;

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
    ref.current = container;
    setMounted(true);

    // Cleanup: optionally remove container on unmount
    return () => {
      // Only remove if we created it (check if it's empty)
      if (container && container.childNodes.length === 0) {
        container.parentNode?.removeChild(container);
      }
    };
  }, [containerId]);

  // Return null on server and during hydration mismatch
  if (!mounted || !ref.current) return null;

  return createPortal(children, ref.current);
}
