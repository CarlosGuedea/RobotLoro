import { BrainCircuit, Camera, Cpu, Mic, Thermometer, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format'
import type { ComponentHealth, DeviceComponent } from '@/types/domain'
import { useDeviceStatus } from '../hooks/useDeviceStatus'

const ICONS: Record<DeviceComponent['key'], LucideIcon> = {
  camera: Camera,
  temperature: Thermometer,
  microphone: Mic,
  model: BrainCircuit,
}

const HEALTH: Record<
  ComponentHealth,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  ok: { label: 'OK', variant: 'success' },
  degradado: { label: 'Revisar', variant: 'warning' },
  error: { label: 'Error', variant: 'destructive' },
}

export function DeviceCard() {
  const { data, isPending, isError } = useDeviceStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" /> Dispositivo
        </CardTitle>
        <CardDescription>
          {isError
            ? 'El backend no responde. ¿Está iniciado server.py?'
            : data
              ? `${data.name} · ${data.lastSeen ? `sensores ${formatRelative(data.lastSeen)}` : 'sin lecturas de sensores'}`
              : 'Consultando estado…'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)
          : data?.components.map(({ key, label, health, detail }) => {
              const Icon = ICONS[key]
              const badge = HEALTH[health]
              return (
                <div key={key} className="flex items-start justify-between gap-2 text-sm">
                  <span className="flex min-w-0 gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground" title={detail}>
                        {detail}
                      </span>
                    </span>
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              )
            })}
      </CardContent>
    </Card>
  )
}
