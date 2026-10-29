import { useQuery } from '@tanstack/react-query'
import { api } from '@/services'
import { queryKeys } from '@/services/query-keys'

export function useCriteria() {
  return useQuery({ queryKey: queryKeys.criteria, queryFn: api.getCriteria, staleTime: Infinity })
}
