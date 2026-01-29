import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: ReactNode;
  variant?: 'primary' | 'accent';
  className?: string;
}

export function GradientText({ children, variant = 'primary', className }: GradientTextProps) {
  return (
    <span
      className={cn(
        variant === 'primary' && 'gradient-text-primary',
        variant === 'accent' && 'gradient-text-accent',
        className
      )}
    >
      {children}
    </span>
  );
}
