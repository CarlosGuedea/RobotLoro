import { Camera, Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface ShutterButtonProps extends ComponentProps<'button'> {
  loading?: boolean
}

/** Botón obturador redondo, color pico. */
export function ShutterButton({ loading, className, ...props }: ShutterButtonProps) {
  return (
    <button
      className={cn(
        'group relative grid size-20 place-items-center rounded-full bg-pico-400 text-pico-700 shadow-[0_8px_24px_-6px_var(--color-pico-500)] ring-8 ring-white/15 transition-transform outline-none hover:scale-105 focus-visible:ring-pico-300/60 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute inset-1.5 rounded-full border-4 border-pico-600/30" />
      {loading ? <Loader2 className="size-8 animate-spin" /> : <Camera className="size-8" />}
    </button>
  )
}
