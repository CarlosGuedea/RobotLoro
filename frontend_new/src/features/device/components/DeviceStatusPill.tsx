import { cn } from '@/lib/utils'
import { useDeviceStatus } from '../hooks/useDeviceStatus'

export function DeviceStatusPill() {
  const { data, isPending, isError } = useDeviceStatus()
  const online = !isError && data?.online

  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold">
      <span className="relative flex size-2.5">
        {online && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2.5 rounded-full',
            isPending ? 'bg-muted-foreground' : online ? 'bg-success' : 'bg-destructive',
          )}
        />
      </span>
      <span className="hidden sm:inline">
        {isPending ? 'Buscando StudyBot…' : online ? 'StudyBot conectado' : 'StudyBot desconectado'}
      </span>
    </div>
  )
}
