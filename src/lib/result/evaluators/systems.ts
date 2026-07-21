import type { Evaluator } from './types'

export const systemsEvaluator: Evaluator = {
  id: 'systems',
  canEvaluate: (tutorial) => tutorial.technique.toLowerCase().includes('system of equation'),
  evaluate: async () => {
    // Systems are visually solved by clicking intersections, which don't map
    // directly to variable evaluation using HelperExpression unless the user typed an intersection function.
    // We fall back for now.
    return null
  }
}
