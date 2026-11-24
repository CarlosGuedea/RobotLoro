import { Keyboard, Mic, Radio, type LucideIcon } from 'lucide-react'
import { RangeBar } from '@/components/shared/RangeBar'
import { VariableStatusBadge } from '@/components/shared/VariableStatusBadge'
import { CRITERIA_BY_KEY } from '@/config/criteria'
import { getVariableStatus } from '@/lib/criteria'
import { formatNumber } from '@/lib/format'
import type { MeasurementSource, VariableResult } from '@/types/domain'

const SOURCE: Record<MeasurementSource, { label: string; icon: LucideIcon }> = {
  sensor: { label: 'Sensor del loro', icon: Radio },
  microfono: { label: 'Micrófono del navegador', icon: Mic },
  manual: { label: 'Escrito a mano', icon: Keyboard },
}

export function VariableBreakdown({ variables }: { variables: VariableResult[] }) {
  return (
    <ul className="divide-y">
      {variables.map((v) => {
        const criterion = CRITERIA_BY_KEY[v.key]
        const status = getVariableStatus(criterion, v.value)
        const { label, icon: SourceIcon } = SOURCE[v.source]
        return (
          <li key={v.key} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium" title={label}>
                <SourceIcon className="size-3.5 text-muted-foreground" />
                {criterion.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
                  {formatNumber(v.value)} {criterion.unit}
                </span>
                <VariableStatusBadge status={status} />
              </span>
            </div>
            <RangeBar criterion={criterion} value={v.value} status={status} />
          </li>
        )
      })}
    </ul>
  )
}
