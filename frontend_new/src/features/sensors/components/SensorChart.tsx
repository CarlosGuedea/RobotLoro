import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { useReadingHistory } from '../hooks/useSensorReadings'

const SERIES = [
  {
    key: 'temperatureC',
    label: 'Temperatura',
    unit: '°C',
    color: 'var(--color-pico-500)',
    axis: 'temp',
  },
  {
    key: 'humidityPct',
    label: 'Humedad',
    unit: '%',
    color: 'var(--color-loro-500)',
    axis: 'humidity',
  },
] as const

const TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }

export function SensorChart() {
  const { data, isPending, isError } = useReadingHistory(30)

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Sensores · últimos 30 minutos</CardTitle>
          <CardDescription>
            Promedio por minuto de las lecturas del ESP32 de sensores
          </CardDescription>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label} ({s.unit})
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : isError || !data?.length ? (
          <EmptyState
            title={isError ? 'Backend sin conexión' : 'Sin lecturas todavía'}
            description="Las lecturas aparecen aquí en cuanto el ESP32 de sensores responde."
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={TICK}
                />
                <YAxis
                  yAxisId="temp"
                  domain={[
                    (min: number) => Math.floor(min - 2),
                    (max: number) => Math.ceil(max + 2),
                  ]}
                  tickLine={false}
                  axisLine={false}
                  tick={TICK}
                />
                <YAxis
                  yAxisId="humidity"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={TICK}
                />
                <Tooltip
                  labelFormatter={(v) => formatTime(String(v))}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    yAxisId={s.axis}
                    type="monotone"
                    dataKey={s.key}
                    name={`${s.label} (${s.unit})`}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={data.length < 3}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
