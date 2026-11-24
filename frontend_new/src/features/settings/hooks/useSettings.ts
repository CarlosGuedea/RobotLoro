import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/services'
import { queryKeys } from '@/services/query-keys'

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: api.getSettings })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings)
      // Con direcciones nuevas, el estado y las lecturas anteriores ya no aplican.
      void queryClient.invalidateQueries({ queryKey: queryKeys.device })
      void queryClient.invalidateQueries({ queryKey: ['readings'] })
      toast.success('Direcciones guardadas')
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar.'),
  })
}
