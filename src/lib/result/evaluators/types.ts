import type { Tutorial, DesmosCalculator } from '../../../types'

export type EvaluatorResult = {
  computedAnswer: string
  resultSource: 'desmos' | 'evaluator'
}

export interface Evaluator {
  id: string
  canEvaluate: (tutorial: Tutorial) => boolean
  evaluate: (calculator: DesmosCalculator, tutorial: Tutorial) => Promise<EvaluatorResult | null>
}

/**
 * Robustly evaluates a LaTeX expression using Desmos HelperExpression.
 */
export function evaluateLatex(calculator: DesmosCalculator, latex: string): Promise<number | typeof NaN> {
  return new Promise(resolve => {
    const helper = calculator.HelperExpression({ latex })
    
    // Sometimes values are immediately available if already computed
    if (helper.numericValue !== undefined && !Number.isNaN(helper.numericValue)) {
      resolve(helper.numericValue)
      return
    }

    // Wait for the value to settle
    let timer: number
    const callback = () => {
      if (helper.numericValue !== undefined && !Number.isNaN(helper.numericValue)) {
        clearTimeout(timer)
        helper.unobserve('value')
        resolve(helper.numericValue)
      }
    }
    
    helper.observe('value', callback)
    
    // Timeout if it never settles to a valid number
    timer = window.setTimeout(() => {
      helper.unobserve('value')
      resolve(helper.numericValue ?? NaN)
    }, 250)
  })
}
