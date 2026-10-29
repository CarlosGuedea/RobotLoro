import { cn } from '@/lib/utils'

export type ParrotMood = 'idle' | 'happy' | 'sad' | 'thinking'

interface ParrotBotProps {
  mood?: ParrotMood
  animated?: boolean
  className?: string
  title?: string
}

const EYE_COLOR: Record<ParrotMood, string> = {
  idle: '#67e8f9',
  happy: '#67e8f9',
  sad: '#fda4af',
  thinking: '#ffd866',
}

/** Ilustración del StudyBot Loro. La pantalla cambia según el estado de la evaluación. */
export function ParrotBot({ mood = 'idle', animated = false, className, title }: ParrotBotProps) {
  const eye = EYE_COLOR[mood]

  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={title ?? 'StudyBot Loro'}
      className={cn(animated && 'animate-bob', className)}
    >
      {/* Copete */}
      <path d="M53 27 C48 15 55 7 62 5 C60 13 64 18 66 27 Z" fill="var(--color-loro-400)" />
      <path d="M60 26 C62 14 70 10 77 12 C71 16 70 22 68 29 Z" fill="var(--color-loro-500)" />

      {/* Patas */}
      <ellipse cx="47" cy="110" rx="8" ry="3.5" fill="#f28c28" />
      <ellipse cx="73" cy="110" rx="8" ry="3.5" fill="#f28c28" />

      {/* Cuerpo */}
      <ellipse cx="60" cy="66" rx="42" ry="44" fill="var(--color-loro-500)" />
      <ellipse cx="60" cy="72" rx="34" ry="36" fill="var(--color-loro-400)" opacity="0.35" />

      {/* Alas con rejilla de audio */}
      {[20, 100].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="74" rx="11" ry="19" fill="var(--color-loro-600)" />
          {[-6, 0, 6].map((dy) =>
            [-3, 3].map((dx) => (
              <circle
                key={`${dx}${dy}`}
                cx={cx + dx}
                cy={74 + dy}
                r="1.3"
                fill="var(--color-loro-800)"
              />
            )),
          )}
        </g>
      ))}

      {/* Cara */}
      <rect x="28" y="33" width="64" height="54" rx="22" fill="var(--color-crema)" />
      <circle cx="60" cy="40.5" r="3.6" fill="#273029" />
      <circle cx="61" cy="39.5" r="1.1" fill="#7a8a80" />

      {/* Pantalla OLED */}
      <rect x="36" y="47" width="48" height="26" rx="7" fill="#15201a" />
      <g stroke={eye} fill={eye} strokeLinecap="round" strokeWidth="3.4">
        {mood === 'idle' && (
          <g
            className={animated ? 'animate-blink' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <rect x="46" y="54" width="7" height="12" rx="3.5" stroke="none" />
            <rect x="67" y="54" width="7" height="12" rx="3.5" stroke="none" />
          </g>
        )}
        {mood === 'happy' && (
          <g fill="none">
            <path d="M44 64 Q50 54 56 64" />
            <path d="M64 64 Q70 54 76 64" />
          </g>
        )}
        {mood === 'sad' && (
          <g>
            <path d="M44 57 L55 54" fill="none" strokeWidth="2.6" />
            <path d="M65 54 L76 57" fill="none" strokeWidth="2.6" />
            <circle cx="50" cy="63" r="3" stroke="none" />
            <circle cx="70" cy="63" r="3" stroke="none" />
          </g>
        )}
        {mood === 'thinking' && (
          <g stroke="none" className={animated ? 'animate-pulse' : undefined}>
            <circle cx="52" cy="57" r="3.4" />
            <circle cx="72" cy="57" r="3.4" />
            <circle cx="54" cy="67" r="1.6" />
            <circle cx="60" cy="67" r="1.6" />
            <circle cx="66" cy="67" r="1.6" />
          </g>
        )}
      </g>

      {/* Pico */}
      <path
        d="M50 75 Q60 70 70 75 Q67 87 60 93 Q53 87 50 75 Z"
        fill="var(--color-pico-400)"
        stroke="var(--color-pico-600)"
        strokeWidth="1.5"
      />
      <path d="M53 77 Q60 74 67 77" stroke="var(--color-pico-600)" strokeWidth="1.2" fill="none" />
    </svg>
  )
}
