import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
  { key: 'noiseDb', label: 'Ruido', unit: 'dB', color: 'var(--color-loro-500)', axis: 'noise' },
] as const

export function SensorChart() {
  const { data, isPending } = useReadingHistory(30)

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Sensores · últimos 30 minutos</CardTitle>
          <CardDescription>Lecturas que envía el StudyBot cada minuto</CardDescription>
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
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  yAxisId="temp"
                  domain={[15, 35]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  yAxisId="noise"
                  orientation="right"
                  domain={[20, 80]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
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
                  <Area
                    key={s.key}
                    yAxisId={s.axis}
                    type="monotone"
                    dataKey={s.key}
                    name={`${s.label} (${s.unit})`}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={`url(#fill-${s.key})`}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
