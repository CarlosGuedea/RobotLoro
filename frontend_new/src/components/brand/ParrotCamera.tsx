import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ParrotCameraProps {
  /** Contenido de la pantalla de los ojos (ojos, visor o foto). */
  screen: ReactNode
  /** Enciende el LED rojo de grabación. */
  recording?: boolean
  animated?: boolean
  className?: string
}

/*
 * Posición de la pantalla dentro del viewBox 200×200. La pantalla HTML se monta
 * encima del SVG con estos porcentajes para poder mostrar fotos e imágenes reales.
 */
const SCREEN = { x: 42, y: 66, w: 116, h: 66, r: 14 }
const pct = (n: number) => `${(n / 200) * 100}%`

/** StudyBot Loro en grande: la pantalla de los ojos es también la cámara. */
export function ParrotCamera({ screen, recording, animated, className }: ParrotCameraProps) {
  return (
    <div className={cn('relative aspect-square', animated && 'animate-bob', className)}>
      <svg viewBox="0 0 200 200" className="size-full" aria-hidden>
        {/* Copete */}
        <path d="M88 40 C78 18 90 4 104 0 C100 14 106 24 110 40 Z" fill="var(--color-loro-400)" />
        <path
          d="M100 38 C104 16 120 8 134 12 C122 18 120 28 116 42 Z"
          fill="var(--color-loro-500)"
        />
        <path d="M94 40 C86 26 76 22 66 24 C74 30 80 36 82 44 Z" fill="var(--color-loro-600)" />

        {/* Patas */}
        <ellipse cx="76" cy="194" rx="15" ry="5.5" fill="#f28c28" />
        <ellipse cx="124" cy="194" rx="15" ry="5.5" fill="#f28c28" />

        {/* Cuerpo */}
        <ellipse cx="100" cy="112" rx="86" ry="82" fill="var(--color-loro-500)" />
        <ellipse cx="100" cy="124" rx="68" ry="64" fill="var(--color-loro-400)" opacity="0.3" />

        {/* Alas con rejilla de audio */}
        {[16, 184].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="124" rx="17" ry="36" fill="var(--color-loro-600)" />
            {[-12, -4, 4, 12].map((dy) =>
              [-5, 5].map((dx) => (
                <circle
                  key={`${dx}${dy}`}
                  cx={cx + dx}
                  cy={124 + dy}
                  r="1.8"
                  fill="var(--color-loro-800)"
                />
              )),
            )}
          </g>
        ))}

        {/* Cara */}
        <rect x="26" y="46" width="148" height="122" rx="44" fill="var(--color-crema)" />
        <circle cx="50" cy="150" r="9" fill="#ff9e7a" opacity="0.35" />
        <circle cx="150" cy="150" r="9" fill="#ff9e7a" opacity="0.35" />

        {/* Bisel de la pantalla + LED */}
        <rect
          x={SCREEN.x - 5}
          y={SCREEN.y - 5}
          width={SCREEN.w + 10}
          height={SCREEN.h + 10}
          rx={SCREEN.r + 4}
          fill="#0c1510"
        />
        <circle
          cx="100"
          cy="54"
          r="3.2"
          fill={recording ? '#ef4444' : '#3b4a40'}
          className={recording ? 'animate-pulse' : undefined}
        />

        {/* Pico */}
        <path
          d="M83 140 Q100 131 117 140 Q112 163 100 173 Q88 163 83 140 Z"
          fill="var(--color-pico-400)"
          stroke="var(--color-pico-600)"
          strokeWidth="2"
        />
        <path
          d="M88 144 Q100 139 112 144"
          stroke="var(--color-pico-600)"
          strokeWidth="1.8"
          fill="none"
        />
      </svg>

      <div
        className="absolute overflow-hidden bg-[#111b15]"
        style={{
          left: pct(SCREEN.x),
          top: pct(SCREEN.y),
          width: pct(SCREEN.w),
          height: pct(SCREEN.h),
          borderRadius: `${(SCREEN.r / SCREEN.w) * 100}% / ${(SCREEN.r / SCREEN.h) * 100}%`,
        }}
      >
        {screen}
        {/* Reflejo del cristal */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      </div>
    </div>
  )
}
