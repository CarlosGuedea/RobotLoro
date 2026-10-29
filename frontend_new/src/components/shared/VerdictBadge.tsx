import { CircleCheck, CircleX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Verdict } from '@/types/domain'

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return verdict === 'apto' ? (
    <Badge variant="success">
      <CircleCheck /> Apto
    </Badge>
  ) : (
    <Badge variant="destructive">
      <CircleX /> No apto
    </Badge>
  )
}
