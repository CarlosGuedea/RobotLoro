import { Loader2, Save, Wifi } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DeviceCard } from '@/features/device/components/DeviceCard'
import { ShareCard } from '@/features/network/components/ShareCard'
import { useSettings, useUpdateSettings } from '@/features/settings/hooks/useSettings'
import type { DeviceSettings } from '@/types/domain'

const DEFAULTS: DeviceSettings = {
  cameraUrl: 'http://esp32cam.local',
  sensorsUrl: 'http://esp32sensores.local',
}

const STEPS = [
  'Conecta esta computadora a la red Wi-Fi «linksys» (la misma de los ESP32).',
  'Enciende la ESP32-CAM y el ESP32 de sensores; tardan unos segundos en conectarse.',
  'Si los nombres .local no responden, abre el monitor serie de Arduino a 115200 baudios: cada placa imprime su IP (por ejemplo http://192.168.1.50/).',
  'Escribe esas IPs aquí y guarda. El estado de la derecha se actualiza en segundos.',
]

export function SettingsPage() {
  const settings = useSettings()
  const update = useUpdateSettings()
  const [form, setForm] = useState<DeviceSettings | null>(null)
  const ids = { camera: useId(), sensors: useId() }

  // Lo guardado hasta que la persona empieza a escribir.
  const value = form ?? settings.data ?? null

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (value) update.mutate(value, { onSuccess: setForm })
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Dónde encuentra el backend a la cámara y a los sensores del loro."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="size-4 text-primary" /> Direcciones de los ESP32
              </CardTitle>
              <CardDescription>
                Acepta una IP (192.168.1.50), un nombre (esp32cam.local) o una URL con http://.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!value ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <form onSubmit={save} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={ids.camera}>Cámara (ESP32-CAM)</Label>
                    <Input
                      id={ids.camera}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={DEFAULTS.cameraUrl}
                      value={value.cameraUrl}
                      onChange={(e) => setForm({ ...value, cameraUrl: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={ids.sensors}>Sensores (ESP32 con DHT22 y sonido)</Label>
                    <Input
                      id={ids.sensors}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={DEFAULTS.sensorsUrl}
                      value={value.sensorsUrl}
                      onChange={(e) => setForm({ ...value, sensorsUrl: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="submit" disabled={update.isPending}>
                      {update.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForm(DEFAULTS)}
                      disabled={update.isPending}
                    >
                      Usar nombres .local
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <ShareCard />

          <Card>
            <CardHeader>
              <CardTitle>Cómo conectar el loro</CardTitle>
              <CardDescription>
                Los ESP32 no se conectan por USB: el backend les pide los datos por Wi-Fi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm marker:font-semibold marker:text-muted-foreground">
                {STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <DeviceCard />
      </div>
    </>
  )
}
