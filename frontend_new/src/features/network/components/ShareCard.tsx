import { Copy, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNetwork } from '../hooks/useNetwork'

const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText

/** Enlace y código QR para abrir el dashboard desde celulares de la misma red Wi-Fi. */
export function ShareCard() {
  const network = useNetwork()
  const info = network.data

  const copy = (url: string) =>
    navigator.clipboard.writeText(url).then(
      () => toast.success('Dirección copiada'),
      () => toast.error('No se pudo copiar; escríbela a mano.'),
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4 text-primary" /> Abrir desde el celular
        </CardTitle>
        <CardDescription>
          Cualquier celular o computadora conectado a «linksys» puede usar este dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {network.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : network.isError || !info ? (
          <p className="text-sm text-muted-foreground">No se pudo consultar la red.</p>
        ) : !info.shared ? (
          <p className="text-sm text-muted-foreground">
            StudyBot se inició solo para esta computadora. Ábrelo sin la opción{' '}
            <code className="font-mono">--host 127.0.0.1</code> para compartirlo en la red.
          </p>
        ) : !info.url ? (
          <p className="text-sm text-muted-foreground">
            No se encontró la IP de esta computadora. Revisa que esté conectada a la red «linksys».
          </p>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="self-center rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5">
              <QRCodeSVG value={info.url} size={148} marginSize={0} title={info.url} />
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <code className="min-w-0 truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-base font-semibold">
                  {info.url}
                </code>
                {canCopy && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copy(info.url!)}
                    aria-label="Copiar dirección"
                  >
                    <Copy />
                  </Button>
                )}
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground marker:font-semibold">
                <li>Conecta el celular a la red Wi-Fi «linksys».</li>
                <li>Escanea el código con la cámara o escribe la dirección en el navegador.</li>
              </ol>
              <p className="text-xs leading-snug text-muted-foreground">
                Deja esta computadora encendida con StudyBot abierto. Si el celular no carga la
                página, permite StudyBot en el firewall de Windows y marca «linksys» como red
                privada. El botón de micrófono solo funciona aquí; en el celular el ruido lo mide el
                INMP441 del loro o se escribe a mano.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
