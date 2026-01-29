import type { ButtonHTMLAttributes, RefObject } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-white shadow-button-primary hover:bg-accent-bright hover:shadow-button-primary-hover active:scale-[0.98]',
        destructive:
          'bg-destructive text-white shadow-button-primary hover:bg-destructive/90 hover:shadow-button-primary-hover active:scale-[0.98]',
        outline: 'border border-white/10 bg-background hover:bg-white/5 hover:border-white/20',
        secondary: 'bg-white/5 text-foreground hover:bg-white/8 active:scale-[0.98]',
        ghost: 'bg-transparent text-foreground hover:bg-white/5',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  ref?: RefObject<HTMLButtonElement | null>;
}

function Button({ className, variant, size, asChild = false, ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
}

export { Button, buttonVariants };
