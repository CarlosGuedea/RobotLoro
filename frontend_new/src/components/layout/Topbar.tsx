import { Menu, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeviceStatusPill } from '@/features/device/components/DeviceStatusPill'
import { useTheme } from '@/hooks/useTheme'

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
      >
        <Menu />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <DeviceStatusPill />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  )
}
