import { Camera, MapPin, Sparkles } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ParrotCamera } from '@/components/brand/ParrotCamera'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CapturedPhoto } from '@/features/evaluations/components/CapturedPhoto'
import { CaptureProgress } from '@/features/evaluations/components/CaptureProgress'
import { EvaluationResult } from '@/features/evaluations/components/EvaluationResult'
import { ScreenEyes, ScreenViewfinder } from '@/features/evaluations/components/ParrotScreen'
import { ShutterButton } from '@/features/evaluations/components/ShutterButton'
import { useCreateEvaluation } from '@/features/evaluations/hooks/useEvaluations'
import { usePlaces } from '@/features/places/hooks/usePlaces'

const STAGE_INPUT =
  'border-white/15 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-pico-400/40'

const HOW_IT_WORKS = [
  { icon: MapPin, text: 'Coloca al StudyBot en el lugar que quieres probar.' },
  { icon: Sparkles, text: 'Escribe cómo se llama el lugar (puede ser nuevo).' },
  { icon: Camera, text: 'Presiona el obturador: sus ojos se vuelven cámara y toman la foto.' },
]

export function EvaluatePage() {
  const [searchParams] = useSearchParams()
  const [placeName, setPlaceName] = useState(searchParams.get('lugar') ?? '')
  const [notes, setNotes] = useState('')
  const places = usePlaces()
  const evaluation = useCreateEvaluation()
  const ids = { name: useId(), notes: useId(), suggestions: useId() }

  const canSubmit = placeName.trim().length > 0 && !evaluation.isPending
  const result = evaluation.isPending ? undefined : evaluation.data

  const evaluate = (event?: FormEvent) => {
    event?.preventDefault()
    if (canSubmit) evaluation.mutate({ placeName, notes })
  }

  // Los ojos son la cámara: visor al capturar y, después, la reacción del loro.
  const screen = evaluation.isPending ? (
    <ScreenViewfinder />
  ) : (
    <ScreenEyes
      mood={evaluation.isError || result?.verdict === 'no_apto' ? 'sad' : result ? 'happy' : 'idle'}
    />
  )

  return (
    <>
      <PageHeader
        title="Evaluar lugar"
        description="Los ojos del loro son su cámara: apúntalo al lugar y toma la foto."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        {/* Escenario del loro */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-b from-loro-800 via-loro-900 to-loro-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-pico-400/15 blur-3xl" />

          <form onSubmit={evaluate} className="relative flex flex-col items-center gap-4 p-5">
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor={ids.name} className="text-loro-100">
                  Nombre del lugar
                </Label>
                <Input
                  id={ids.name}
                  required
                  autoComplete="off"
                  list={ids.suggestions}
                  placeholder="Ej. Biblioteca central, sala 2"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  disabled={evaluation.isPending}
                  className={STAGE_INPUT}
                />
                {/* Sugerencias solo para repetir lugares ya probados; se puede escribir cualquiera. */}
                <datalist id={ids.suggestions}>
                  {places.data?.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor={ids.notes} className="text-loro-100">
                  Referencia <span className="font-normal text-loro-200/60">(opcional)</span>
                </Label>
                <Input
                  id={ids.notes}
                  autoComplete="off"
                  placeholder="Ej. planta alta, junto a las ventanas"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={evaluation.isPending}
                  className={STAGE_INPUT}
                />
              </div>
            </div>

            <ParrotCamera
              screen={screen}
              recording={evaluation.isPending}
              animated={!evaluation.isPending}
              className="w-full max-w-[170px] drop-shadow-[0_16px_24px_rgb(0_0_0/0.35)]"
            />

            <div className="flex flex-col items-center gap-2">
              <ShutterButton
                type="submit"
                loading={evaluation.isPending}
                disabled={!canSubmit}
                aria-label="Tomar foto y evaluar"
                className="size-16"
              />
              <p className="text-center text-sm font-semibold text-loro-100">
                {evaluation.isPending
                  ? 'Capturando y evaluando…'
                  : !placeName.trim()
                    ? 'Escribe el nombre del lugar para empezar'
                    : result
                      ? 'Volver a tomar foto'
                      : 'Tomar foto y evaluar'}
              </p>
            </div>
          </form>
        </section>

        <CapturedPhoto evaluation={result} capturing={evaluation.isPending} />

        <div className="lg:col-span-2 xl:col-span-1">
          {evaluation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>Evaluando {placeName.trim()}</CardTitle>
                <CardDescription>El StudyBot está trabajando…</CardDescription>
              </CardHeader>
              <CardContent>
                <CaptureProgress key={evaluation.submittedAt} />
              </CardContent>
            </Card>
          ) : result ? (
            <EvaluationResult evaluation={result} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {evaluation.isError ? 'No hubo respuesta del StudyBot' : 'Cómo funciona'}
                </CardTitle>
                {evaluation.isError && (
                  <CardDescription>
                    Revisa que el dispositivo esté conectado y vuelve a intentarlo.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <ol className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                  {HOW_IT_WORKS.map(({ icon: Icon, text }, i) => (
                    <li key={text} className="flex gap-3 text-sm">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="pt-1.5">
                        <span className="font-semibold">{i + 1}.</span> {text}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
