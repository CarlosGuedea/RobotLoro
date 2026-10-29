const LOCALE = 'es-MX'

const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatTime = (iso: string) => time.format(new Date(iso))
export const formatPercent = (value: number) => percent.format(value)
export const formatNumber = (value: number) => decimal.format(value)

export function formatRelative(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86400), 'day')
}
