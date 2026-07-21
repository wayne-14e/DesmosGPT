import type { Evaluator } from './types'
import { evaluateLatex } from './types'

export const linearRegressionEvaluator: Evaluator = {
  id: 'linearRegression',
  canEvaluate: (tutorial) => tutorial.technique.toLowerCase().includes('linear regression'),
  evaluate: async (calculator) => {
    const m = await evaluateLatex(calculator, 'm')
    let c = await evaluateLatex(calculator, 'c')
    if (Number.isNaN(c)) c = await evaluateLatex(calculator, 'b') // some people use b for y-intercept
    
    if (!Number.isNaN(m) && !Number.isNaN(c)) {
      let ans = `y = ${m}x`
      if (c !== 0) ans += c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`
      
      ans = ans.replace(/\+ 1x([^0-9])/g, '+ x$1')
               .replace(/- 1x([^0-9])/g, '- x$1')
               .replace(/= 1x/g, '= x')
               .replace(/= -1x/g, '= -x')

      return { computedAnswer: ans, resultSource: 'desmos' }
    }
    return null
  }
}
