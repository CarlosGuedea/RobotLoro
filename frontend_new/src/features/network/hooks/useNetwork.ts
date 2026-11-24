import { useQuery } from '@tanstack/react-query'
import { api } from '@/services'
import { queryKeys } from '@/services/query-keys'

/** Dirección del dashboard para otros equipos de la red (no cambia mientras corre). */
export function useNetwork() {
  return useQuery({ queryKey: queryKeys.network, queryFn: api.getNetwork, staleTime: 60_000 })
}
