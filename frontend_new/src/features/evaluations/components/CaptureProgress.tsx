import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STEPS = [
  'Tomando la foto',
  'Leyendo temperatura y ruido',
  'Analizando con el modelo',
  'Preparando resultado',
]

/**
 * Progreso visual mientras el backend responde. El backend aún no reporta etapas,
 * así que avanza por tiempo; montar con un `key` nuevo en cada captura.
 */
export function CaptureProgress() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 850)
    return () => clearInterval(id)
  }, [])

  return (
    <ol className="space-y-3" aria-live="polite">
      {STEPS.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <li key={label} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                'grid size-7 place-items-center rounded-full border text-xs font-bold',
                done && 'border-transparent bg-success text-success-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="size-4" />
              ) : active ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(!done && !active && 'text-muted-foreground', active && 'font-semibold')}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
