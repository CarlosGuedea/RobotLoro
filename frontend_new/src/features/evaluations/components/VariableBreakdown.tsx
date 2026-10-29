import { Camera, Radio } from 'lucide-react'
import { RangeBar } from '@/components/shared/RangeBar'
import { VariableStatusBadge } from '@/components/shared/VariableStatusBadge'
import { CRITERIA_BY_KEY } from '@/config/criteria'
import { formatNumber } from '@/lib/format'
import type { VariableResult } from '@/types/domain'

export function VariableBreakdown({ variables }: { variables: VariableResult[] }) {
  return (
    <ul className="divide-y">
      {variables.map((v) => {
        const criterion = CRITERIA_BY_KEY[v.key]
        const SourceIcon = criterion.source === 'sensor' ? Radio : Camera
        return (
          <li key={v.key} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <SourceIcon className="size-3.5 text-muted-foreground" />
                {criterion.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
                  {formatNumber(v.value)} {criterion.unit}
                </span>
                <VariableStatusBadge status={v.status} />
              </span>
            </div>
            <RangeBar criterion={criterion} value={v.value} status={v.status} />
          </li>
        )
      })}
    </ul>
  )
}
