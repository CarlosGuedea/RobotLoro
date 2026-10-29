import { NavLink } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { NAV_ITEMS } from '@/config/navigation'
import { cn } from '@/lib/utils'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-6">
        <Logo />
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active shadow-[inset_3px_0_0_var(--color-pico-400)]'
                  : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
              )
            }
          >
            <Icon className="size-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-lg bg-white/5 p-4 text-xs leading-relaxed">
        <p className="font-semibold text-sidebar-foreground">Universidad de Colima</p>
        <p className="text-sidebar-muted">Proyecto StudyBot · prototipo v1.0</p>
      </div>
    </div>
  )
}
