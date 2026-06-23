import type { ApiResult } from '@prediction-league/shared'
import { apiFetch } from './client'

interface Prediction {
  id: string
  matchId: string
  predictedHome: number
  predictedAway: number
  predictedAdvancing: 'HOME' | 'AWAY' | null
  submittedAt: string
}

export async function submitPrediction(
  matchId: string,
  predictedHome: number,
  predictedAway: number,
  predictedAdvancing?: 'HOME' | 'AWAY' | null,
): Promise<ApiResult<{ prediction: Prediction }>> {
  return apiFetch<{ prediction: Prediction }>('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({ matchId, predictedHome, predictedAway, predictedAdvancing: predictedAdvancing ?? null }),
  })
}
