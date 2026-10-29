import { useQuery } from '@tanstack/react-query'
import { api } from '@/services'
import { queryKeys } from '@/services/query-keys'

export function usePlaces() {
  return useQuery({ queryKey: queryKeys.places, queryFn: api.getPlaces })
}
