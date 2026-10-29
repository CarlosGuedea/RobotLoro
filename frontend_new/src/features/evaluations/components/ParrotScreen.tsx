import type { ParrotMood } from '@/components/brand/ParrotBot'
import { cn } from '@/lib/utils'

const EYE_COLOR: Record<ParrotMood, string> = {
  idle: '#67e8f9',
  happy: '#67e8f9',
  sad: '#fda4af',
  thinking: '#ffd866',
}

/** Ojos del loro dibujados a tamaño de pantalla (viewBox 116×66). */
export function ScreenEyes({ mood }: { mood: ParrotMood }) {
  const color = EYE_COLOR[mood]

  return (
    <svg
      viewBox="0 0 116 66"
      className="size-full"
      style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      aria-hidden
    >
      <g stroke={color} fill={color} strokeLinecap="round" strokeWidth="7">
        {mood === 'idle' && (
          <g
            className="animate-blink"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <rect x="30" y="20" width="15" height="26" rx="7.5" stroke="none" />
            <rect x="71" y="20" width="15" height="26" rx="7.5" stroke="none" />
          </g>
        )}
        {mood === 'happy' && (
          <g fill="none">
            <path d="M26 42 Q38 20 50 42" />
            <path d="M66 42 Q78 20 90 42" />
          </g>
        )}
        {mood === 'sad' && (
          <g>
            <path d="M25 24 L47 17" fill="none" strokeWidth="5" />
            <path d="M69 17 L91 24" fill="none" strokeWidth="5" />
            <circle cx="37" cy="38" r="6.5" stroke="none" />
            <circle cx="79" cy="38" r="6.5" stroke="none" />
          </g>
        )}
        {mood === 'thinking' && (
          <g stroke="none" className="animate-pulse">
            <circle cx="42" cy="26" r="7" />
            <circle cx="82" cy="26" r="7" />
            <circle cx="46" cy="48" r="3" />
            <circle cx="58" cy="48" r="3" />
            <circle cx="70" cy="48" r="3" />
          </g>
        )}
      </g>
    </svg>
  )
}

const CORNERS = [
  'top-[10%] left-[6%] border-t-2 border-l-2',
  'top-[10%] right-[6%] border-t-2 border-r-2',
  'bottom-[10%] left-[6%] border-b-2 border-l-2',
  'right-[6%] bottom-[10%] border-r-2 border-b-2',
]

/** Modo cámara: visor con guías de encuadre mientras el ESP32-CAM captura. */
export function ScreenViewfinder() {
  return (
    <div className="relative size-full bg-[radial-gradient(ellipse_at_center,#1f3a2a,#0b140f)]">
      {CORNERS.map((pos) => (
        <span key={pos} className={cn('absolute size-[14%] border-pico-400', pos)} />
      ))}
      <span className="absolute top-1/2 left-1/2 size-[10%] -translate-1/2 rounded-full border border-white/40" />
      <span className="absolute inset-x-0 h-px animate-scan bg-loro-300 shadow-[0_0_8px_2px_var(--color-loro-400)]" />
      <span className="absolute top-[9%] left-[8%] flex items-center gap-1 text-[clamp(7px,1.6vw,11px)] font-bold tracking-wider text-white/90">
        <span className="size-[0.7em] animate-pulse rounded-full bg-red-500" /> REC
      </span>
    </div>
  )
}
