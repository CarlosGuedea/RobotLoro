import { ImageUp, Loader2, Mic, X } from 'lucide-react'
import { useId, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SensorReading } from '@/types/domain'
import { useMicrophoneLevel } from '../hooks/useMicrophoneLevel'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export interface Measurements {
  temperature: string
  noise: string
  noiseSource: 'manual' | 'microfono'
  photo: { name: string; dataUrl: string } | null
}

interface MeasurementFieldsProps {
  value: Measurements
  onChange: (value: Measurements) => void
  reading?: SensorReading
  disabled?: boolean
  inputClassName?: string
  onMeasuringChange?: (measuring: boolean) => void
}

/** Temperatura, ruido (dBFS) y foto opcional que se envían al modelo junto con la captura. */
export function MeasurementFields({
  value,
  onChange,
  reading,
  disabled,
  inputClassName,
  onMeasuringChange,
}: MeasurementFieldsProps) {
  const ids = { temperature: useId(), noise: useId() }
  const fileRef = useRef<HTMLInputElement>(null)
  const mic = useMicrophoneLevel()
  const set = (patch: Partial<Measurements>) => onChange({ ...value, ...patch })

  const sensorTemperature = reading?.temperatureC ?? null
  const sensorNoise = reading?.soundDbfs ?? null

  const measureNoise = async () => {
    onMeasuringChange?.(true)
    try {
      const dbfs = await mic.measure()
      set({ noise: String(dbfs), noiseSource: 'microfono' })
    } catch (error) {
      toast.error(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Permite el acceso al micrófono para medir el ruido.'
          : 'No se pudo usar el micrófono de este dispositivo.',
      )
    } finally {
      onMeasuringChange?.(false)
    }
  }

  const pickPhoto = (file?: File) => {
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('La foto supera 8 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set({ photo: { name: file.name, dataUrl: String(reader.result) } })
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={ids.temperature} className="text-loro-100">
          Temperatura (°C)
        </Label>
        <Input
          id={ids.temperature}
          inputMode="decimal"
          autoComplete="off"
          placeholder={
            sensorTemperature === null
              ? 'Sin DHT22: escríbela'
              : `Sensor: ${formatNumber(sensorTemperature)} °C`
          }
          value={value.temperature}
          onChange={(e) => set({ temperature: e.target.value })}
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.noise} className="text-loro-100">
          Ruido (dBFS)
        </Label>
        <div className="flex gap-2">
          <Input
            id={ids.noise}
            inputMode="decimal"
            autoComplete="off"
            placeholder={
              sensorNoise === null ? 'Ej. -28' : `Sensor: ${formatNumber(sensorNoise)} dBFS`
            }
            value={value.noise}
            onChange={(e) => set({ noise: e.target.value, noiseSource: 'manual' })}
            disabled={disabled || mic.measuring}
            className={inputClassName}
          />
          <button
            type="button"
            onClick={measureNoise}
            disabled={disabled || mic.measuring || !mic.supported}
            title={
              mic.supported
                ? 'Medir 3 segundos con el micrófono de este dispositivo'
                : 'El micrófono solo funciona en localhost o HTTPS'
            }
            aria-label="Medir ruido con el micrófono"
            className="grid size-10 shrink-0 place-items-center rounded-md bg-pico-400 text-loro-950 transition-colors hover:bg-pico-300 disabled:opacity-50"
          >
            {mic.measuring ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}
          </button>
        </div>
        <p className="text-[11px] leading-snug text-loro-200/70">
          {mic.measuring
            ? 'Escuchando 3 segundos… guarda silencio de tu lado.'
            : value.noise && value.noiseSource === 'microfono'
              ? 'Medido con el micrófono de este dispositivo.'
              : sensorNoise !== null
                ? 'Vacío = se usa el micrófono INMP441 del loro.'
                : reading?.soundSource === 'inmp441'
                  ? 'El INMP441 del loro no entrega audio: mide con este dispositivo o escríbelo.'
                  : 'El sensor del loro solo detecta sí/no: mide con el micrófono o escríbelo.'}
        </p>
      </div>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            pickPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {value.photo ? (
          <div className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1.5 text-xs text-loro-100">
            <ImageUp className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate" title={value.photo.name}>
              {value.photo.name}
            </span>
            <button
              type="button"
              onClick={() => set({ photo: null })}
              disabled={disabled}
              aria-label="Quitar foto y usar la cámara del loro"
              className="grid size-6 place-items-center rounded hover:bg-white/15"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium text-loro-200/80 underline-offset-2 hover:text-white hover:underline',
            )}
          >
            <ImageUp className="size-3.5" /> Subir una foto en lugar de usar la cámara
          </button>
        )}
      </div>
    </div>
  )
}
