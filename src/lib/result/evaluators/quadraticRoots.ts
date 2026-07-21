import type { Evaluator } from './types'
import { evaluateLatex } from './types'

export const quadraticRootsEvaluator: Evaluator = {
  id: 'quadraticRoots',
  canEvaluate: (tutorial) => tutorial.technique.toLowerCase().includes('roots') || tutorial.technique.toLowerCase().includes('zeroes'),
  evaluate: async (calculator) => {
    // If a user explicitly evaluates x_1 and x_2, we can capture them.
    const x1 = await evaluateLatex(calculator, 'x_1')
    const x2 = await evaluateLatex(calculator, 'x_2')
    
    if (!Number.isNaN(x1) && !Number.isNaN(x2)) {
      // Both roots found
      const roots = [x1, x2].sort((a, b) => a - b)
      return { computedAnswer: `x = ${roots[0]}, x = ${roots[1]}`, resultSource: 'desmos' }
    } else if (!Number.isNaN(x1)) {
      return { computedAnswer: `x = ${x1}`, resultSource: 'desmos' }
    }
    
    // Complex intersections without explicit variables are hard to extract
    // reliably without parsing graph state point properties via getExpressions()
    return null
  }
}
