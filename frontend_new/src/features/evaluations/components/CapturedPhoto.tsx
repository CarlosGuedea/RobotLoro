import { Camera, CircleCheck, CircleX, ImageOff, Maximize2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Evaluation } from '@/types/domain'

interface CapturedPhotoProps {
  evaluation?: Evaluation
  capturing?: boolean
}

/** La foto que tomó el loro, en grande y con opción de verla a pantalla completa. */
export function CapturedPhoto({ evaluation, capturing }: CapturedPhotoProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const photoUrl = evaluation?.photoUrl
  const ready = !capturing && evaluation
  const cardRef = useRef<HTMLDivElement>(null)

  // En pantallas angostas la foto queda debajo del loro: la traemos a la vista al llegar.
  useEffect(() => {
    if (evaluation && window.matchMedia('(max-width: 1023px)').matches) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [evaluation])

  return (
    <Card ref={cardRef} className="scroll-mt-20 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Camera className="size-4 text-primary" /> Lo que vio el loro
          </CardTitle>
          <CardDescription>
            {capturing
              ? 'Revelando la foto…'
              : ready
                ? `${evaluation.placeName} · ${formatTime(evaluation.createdAt)}`
                : 'Aquí aparecerá la foto que tome la cámara de los ojos.'}
          </CardDescription>
        </div>
        {ready && photoUrl && (
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-primary hover:bg-muted"
          >
            <Maximize2 className="size-4" /> Ampliar
          </button>
        )}
      </CardHeader>

      <div className="px-5 pb-5">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[calc((100dvh-19rem)*4/3)] overflow-hidden rounded-lg bg-loro-950">
          {capturing ? (
            <div className="grid size-full place-items-center bg-[radial-gradient(ellipse_at_center,#1f3a2a,#0b140f)]">
              <div className="flex flex-col items-center gap-3 text-loro-200/80">
                <Camera className="size-10 animate-pulse" />
                <span className="text-sm font-medium">Capturando…</span>
              </div>
              <span className="absolute inset-x-0 h-px animate-scan bg-loro-300 shadow-[0_0_8px_2px_var(--color-loro-400)]" />
            </div>
          ) : ready ? (
            <>
              {photoUrl ? (
                <button
                  type="button"
                  onClick={() => dialogRef.current?.showModal()}
                  className="block size-full cursor-zoom-in"
                  aria-label="Ver foto a pantalla completa"
                >
                  <img
                    key={evaluation.id}
                    src={photoUrl}
                    alt={`Foto de ${evaluation.placeName}`}
                    className="size-full animate-develop object-cover"
                  />
                </button>
              ) : (
                <div className="grid size-full place-items-center text-loro-200/60">
                  <ImageOff className="size-10" />
                </div>
              )}
              <VerdictChip apto={evaluation.verdict === 'apto'} />
              <div
                key={`flash-${evaluation.id}`}
                className="pointer-events-none absolute inset-0 animate-flash bg-white"
              />
            </>
          ) : (
            <div className="grid size-full place-items-center border-2 border-dashed border-loro-700/60 bg-[radial-gradient(circle,rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:18px_18px]">
              <div className="flex flex-col items-center gap-2 text-loro-200/60">
                <ImageOff className="size-10" />
                <span className="text-sm">Sin foto todavía</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {ready && photoUrl && (
        <dialog
          ref={dialogRef}
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
          className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
        >
          <figure className="relative">
            <img
              src={photoUrl}
              alt={`Foto de ${evaluation.placeName}`}
              className="aspect-[4/3] w-[min(92vw,calc(82dvh*4/3))] rounded-lg bg-black object-contain shadow-2xl"
            />
            <VerdictChip apto={evaluation.verdict === 'apto'} />
            <figcaption className="mt-3 text-center text-sm text-white/80">
              {evaluation.placeName}
              {evaluation.notes && ` · ${evaluation.notes}`}
            </figcaption>
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white text-loro-900 shadow-lg hover:bg-loro-50"
            >
              <X className="size-5" />
            </button>
          </figure>
        </dialog>
      )}
    </Card>
  )
}

function VerdictChip({ apto }: { apto: boolean }) {
  return (
    <span
      className={cn(
        'absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white shadow-lg',
        apto ? 'bg-loro-600' : 'bg-destructive',
      )}
    >
      {apto ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
      {apto ? 'Apto' : 'No apto'}
    </span>
  )
}
