import { useQuery } from '@tanstack/react-query'
import { api } from '@/services'
import { queryKeys } from '@/services/query-keys'

export function useLatestReading() {
  return useQuery({
    queryKey: queryKeys.readings.latest,
    queryFn: api.getLatestReading,
    refetchInterval: 3_000,
  })
}

export function useReadingHistory(limit = 30) {
  return useQuery({
    queryKey: queryKeys.readings.history(limit),
    queryFn: () => api.getReadingHistory(limit),
    refetchInterval: 60_000,
  })
}
