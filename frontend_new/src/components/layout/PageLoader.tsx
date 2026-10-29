import { ParrotBot } from '@/components/brand/ParrotBot'

export function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <ParrotBot mood="thinking" animated className="size-20" title="Cargando" />
    </div>
  )
}
