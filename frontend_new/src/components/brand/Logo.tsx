import { cn } from '@/lib/utils'
import { ParrotBot } from './ParrotBot'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="grid size-11 place-items-center rounded-xl bg-loro-800/60">
        <ParrotBot className="size-10" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold tracking-tight">StudyBot</p>
        <p className="text-xs font-medium text-sidebar-muted">Loro · UdeC</p>
      </div>
    </div>
  )
}
