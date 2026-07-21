import type { Evaluator } from './types'

export const genericEvaluator: Evaluator = {
  id: 'generic',
  canEvaluate: () => true, // Catch-all fallback
  evaluate: async () => {
    // We can evaluate A/B/C/D if answerChoices exist in a robust app.
    // For now, return null to trigger safe math or AI fallback correctly as specified.
    return null
  }
}
