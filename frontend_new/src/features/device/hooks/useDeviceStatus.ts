import { useQuery } from '@tanstack/react-query'
import { api } from '@/services'
import { queryKeys } from '@/services/query-keys'

export function useDeviceStatus() {
  return useQuery({
    queryKey: queryKeys.device,
    queryFn: api.getDeviceStatus,
    refetchInterval: 10_000,
  })
}
