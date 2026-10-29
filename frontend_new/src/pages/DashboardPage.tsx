import { Camera, CheckCircle2, MapPin, Thermometer, Volume2 } from 'lucide-react'
import { Link } from 'react-router'
import { ParrotBot } from '@/components/brand/ParrotBot'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { buttonVariants } from '@/components/ui/button'
import { CRITERIA_BY_KEY } from '@/config/criteria'
import { DeviceCard } from '@/features/device/components/DeviceCard'
import { RecentEvaluations } from '@/features/evaluations/components/RecentEvaluations'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { LiveReadingCard } from '@/features/sensors/components/LiveReadingCard'
import { SensorChart } from '@/features/sensors/components/SensorChart'
import { useLatestReading } from '@/features/sensors/hooks/useSensorReadings'
import { formatPercent } from '@/lib/format'

export function DashboardPage() {
  const places = usePlaces()
  const reading = useLatestReading()

  const evaluated = places.data ?? []
  const aptos = evaluated.filter((p) => p.lastEvaluation.verdict === 'apto').length

  return (
    <>
      <PageHeader
        title="Panel general"
        description="Estado del StudyBot y resumen de los lugares evaluados."
      />

      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-loro-800 via-loro-700 to-loro-600 p-6 text-white md:p-8">
        <div className="absolute -top-16 -right-10 size-64 rounded-full bg-pico-400/20 blur-2xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
          <ParrotBot mood="idle" animated className="size-28 shrink-0 drop-shadow-lg md:size-32" />
          <div className="flex-1">
            <p className="text-sm font-semibold tracking-wide text-pico-300 uppercase">
              StudyBot Loro
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              ¿Este lugar es bueno para trabajar?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-loro-100">
              Lleva al loro a cualquier lugar, escribe cómo se llama y toma la foto desde aquí. El
              modelo analiza temperatura, ruido, iluminación, ocupación y mobiliario.
            </p>
          </div>
          <Link to="/evaluar" className={buttonVariants({ variant: 'accent', size: 'lg' })}>
            <Camera /> Evaluar un lugar
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lugares probados"
          icon={MapPin}
          loading={places.isPending}
          value={evaluated.length}
          hint="Distintos lugares donde se usó el loro"
        />
        <StatCard
          label="Lugares aptos"
          icon={CheckCircle2}
          tone="pico"
          loading={places.isPending}
          value={evaluated.length ? formatPercent(aptos / evaluated.length) : '—'}
          hint={`${aptos} de ${evaluated.length} según su última evaluación`}
        />
        <LiveReadingCard
          criterion={CRITERIA_BY_KEY.temperatura}
          value={reading.data?.temperatureC}
          icon={Thermometer}
        />
        <LiveReadingCard
          criterion={CRITERIA_BY_KEY.ruido}
          value={reading.data?.noiseDb}
          icon={Volume2}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SensorChart />
        </div>
        <DeviceCard />
      </div>

      <div className="mt-6">
        <RecentEvaluations />
      </div>
    </>
  )
}
