import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40',
        className,
      )}
      {...props}
    />
  )
}
