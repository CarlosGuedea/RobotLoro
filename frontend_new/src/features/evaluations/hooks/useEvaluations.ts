import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/services'
import { queryKeys } from '@/services/query-keys'

export function useEvaluations(placeId?: string) {
  return useQuery({
    queryKey: queryKeys.evaluations(placeId),
    queryFn: () => api.getEvaluations({ placeId }),
  })
}

/** Le pide al StudyBot tomar la foto y evaluar el lugar seleccionado. */
export function useCreateEvaluation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createEvaluation,
    onSuccess: (evaluation) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.evaluationsRoot })
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
      if (evaluation.verdict === 'apto') {
        toast.success(`${evaluation.placeName} es apto para trabajar`)
      } else {
        toast.warning(`${evaluation.placeName} no es apto por ahora`)
      }
    },
    onError: () => toast.error('No se pudo comunicar con el StudyBot. Intenta de nuevo.'),
  })
}
