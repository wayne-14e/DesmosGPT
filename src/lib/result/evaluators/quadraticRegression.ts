import type { Evaluator } from './types'
import { evaluateLatex } from './types'

export const quadraticRegressionEvaluator: Evaluator = {
  id: 'quadraticRegression',
  canEvaluate: (tutorial) => tutorial.technique.toLowerCase().includes('quadratic regression'),
  evaluate: async (calculator) => {
    const a = await evaluateLatex(calculator, 'a')
    const b = await evaluateLatex(calculator, 'b')
    const c = await evaluateLatex(calculator, 'c')
    
    if (!Number.isNaN(a) && !Number.isNaN(b) && !Number.isNaN(c)) {
      let ans = `y = ${a}x^2`
      if (b !== 0) ans += b > 0 ? ` + ${b}x` : ` - ${Math.abs(b)}x`
      if (c !== 0) ans += c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`
      
      // Basic aesthetic cleanups
      ans = ans.replace(/\+ 1x([^0-9])/g, '+ x$1')
               .replace(/- 1x([^0-9])/g, '- x$1')
               .replace(/= 1x\^2/g, '= x^2')
               .replace(/= -1x\^2/g, '= -x^2')

      return { computedAnswer: ans, resultSource: 'desmos' }
    }
    return null
  }
}
