import {
  Camera,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPin,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/evaluar', label: 'Evaluar lugar', icon: Camera },
  { to: '/lugares', label: 'Lugares', icon: MapPin },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/criterios', label: 'Criterios', icon: ClipboardList },
]
