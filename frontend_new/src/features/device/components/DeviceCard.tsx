import { Camera, Cpu, Mic, Monitor, Thermometer, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format'
import type { ComponentHealth, DeviceStatus } from '@/types/domain'
import { useDeviceStatus } from '../hooks/useDeviceStatus'

const COMPONENTS: { key: keyof DeviceStatus['components']; label: string; icon: LucideIcon }[] = [
  { key: 'camera', label: 'Cámara OV2640', icon: Camera },
  { key: 'temperature', label: 'Sensor de temperatura', icon: Thermometer },
  { key: 'microphone', label: 'Módulo de audio', icon: Mic },
  { key: 'display', label: 'Pantalla OLED', icon: Monitor },
]

const HEALTH: Record<
  ComponentHealth,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  ok: { label: 'OK', variant: 'success' },
  degradado: { label: 'Revisar', variant: 'warning' },
  error: { label: 'Error', variant: 'destructive' },
}

export function DeviceCard() {
  const { data, isPending } = useDeviceStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" /> Dispositivo
        </CardTitle>
        <CardDescription>
          {data ? `${data.name} · visto ${formatRelative(data.lastSeen)}` : 'Consultando estado…'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)
          : COMPONENTS.map(({ key, label, icon: Icon }) => {
              const health = HEALTH[data?.components[key] ?? 'error']
              return (
                <div key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" /> {label}
                  </span>
                  <Badge variant={health.variant}>{health.label}</Badge>
                </div>
              )
            })}
        {data && (
          <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-xs text-muted-foreground">
            <div>
              <dt>IP</dt>
              <dd className="font-mono text-foreground">{data.ip}</dd>
            </div>
            <div>
              <dt>Firmware</dt>
              <dd className="font-mono text-foreground">v{data.firmware}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
