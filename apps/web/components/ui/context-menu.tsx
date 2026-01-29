import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ContextMenuProps extends HTMLAttributes<HTMLDivElement> {
  x: number;
  y: number;
  visible: boolean;
}

function ContextMenu({ x, y, visible, className, children, ...props }: ContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed z-50 min-w-[200px] rounded-md border border-gray-700 bg-gray-900 p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      style={{ left: `${x}px`, top: `${y}px` }}
      {...props}
    >
      {children}
    </div>
  );
}

interface ContextMenuItemProps extends HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  destructive?: boolean;
}

function ContextMenuItem({
  disabled = false,
  destructive = false,
  className,
  children,
  ...props
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-all duration-200 active:scale-[0.98]',
        disabled
          ? 'cursor-not-allowed text-gray-600 opacity-50'
          : destructive
            ? 'text-red-400 hover:bg-red-950 hover:text-red-300 focus:bg-red-950 focus:text-red-300'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { ContextMenu, ContextMenuItem };
