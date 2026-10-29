import { Link } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      mood="sad"
      title="Esta página voló del nido"
      description="La ruta que buscas no existe."
      action={
        <Link to="/" className={buttonVariants()}>
          Volver al panel
        </Link>
      }
    />
  )
}
