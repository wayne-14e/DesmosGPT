import type { DesmosCalculator } from '../../types'

export type ExtractedResult = {
  type: 'number' | 'boolean' | 'point' | 'list' | 'string' | 'unknown'
  value: string
  expression: string
  source: 'desmos'
}

export type ExtractionDebugInfo = {
  expressionsScanned: number
  lastEvaluatedExpression: string
  detectedType: string
  computedValue: string
  source: string
}

/**
 * Generic Result Extractor
 * 
 * Inspects the entire Desmos state to find the best available computed result.
 * Works for every technique by extracting the last meaningful evaluated expression.
 */
export class GenericResultExtractor {
  private debug: boolean = import.meta.env.DEV

  /**
   * Extract the best available computed result from Desmos state
   */
  async extract(calculator: DesmosCalculator): Promise<ExtractedResult | null> {
    const state = calculator.getState()
    const expressions = state.expressions.list || []

    if (this.debug) {
      console.log('[GenericResultExtractor] Starting extraction')
      console.log(`[GenericResultExtractor] Total expressions in state: ${expressions.length}`)
      console.log('[GenericResultExtractor] Full state:', state)
      console.log('[GenericResultExtractor] Expressions:', expressions)
    }

    // Walk backward to find the last meaningful expression
    const lastMeaningful = this.findLastMeaningfulExpression(expressions)

    if (!lastMeaningful) {
      if (this.debug) {
        console.log('[GenericResultExtractor] No meaningful expression found')
      }
      return null
    }

    if (this.debug) {
      console.log(`[GenericResultExtractor] Last meaningful expression: ${lastMeaningful.latex || '(no latex)'}`)
    }

    // Extract the computed value
    const result = await this.extractValue(calculator, lastMeaningful)

    if (this.debug && result) {
      this.logDebugInfo(expressions.length, lastMeaningful, result)
    }

    return result
  }

  /**
   * Find the last visible expression that produces a value
   * Ignores: blank expressions, comments, folders, hidden metadata, helper expressions
   */
  private findLastMeaningfulExpression(expressions: any[]): any | null {
    for (let i = expressions.length - 1; i >= 0; i--) {
      const expr = expressions[i]

      // Skip hidden expressions
      if (expr.hidden) continue

      // Skip folders
      if (expr.type === 'folder') continue

      // Skip text notes
      if (expr.type === 'text') continue

      // Skip images
      if (expr.type === 'image') continue

      // Skip empty latex
      if (!expr.latex || expr.latex.trim() === '') continue

      // Skip comments (lines starting with #)
      if (expr.latex.trim().startsWith('#')) continue

      // Skip helper expressions (typically have specific patterns)
      if (this.isHelperExpression(expr)) continue

      // This is a meaningful expression
      return expr
    }

    return null
  }

  /**
   * Detect if an expression is a helper/metadata expression
   */
  private isHelperExpression(expr: any): boolean {
    // Helper expressions often have specific IDs or patterns
    if (expr.id && expr.id.includes('helper')) return true
    
    // Expressions that are purely for display
    if (expr.latex && expr.latex.includes('\\operatorname')) return true

    return false
  }

  /**
   * Extract the computed value from an expression
   */
  private async extractValue(calculator: DesmosCalculator, expr: any): Promise<ExtractedResult | null> {
    const latex = expr.latex

    if (this.debug) {
      console.log(`[GenericResultExtractor] Extracting value from: ${latex}`)
      console.log(`[GenericResultExtractor] Full expression object:`, expr)
    }

    // Try to evaluate as a numeric expression using observe pattern
    try {
      const numericValue = await this.evaluateLatex(calculator, latex)
      
      if (this.debug) {
        console.log(`[GenericResultExtractor] evaluateLatex returned:`, numericValue)
      }

      if (numericValue !== undefined && !Number.isNaN(numericValue)) {
        if (this.debug) {
          console.log(`[GenericResultExtractor] Found numeric value: ${numericValue}`)
        }
        return {
          type: 'number',
          value: String(numericValue),
          expression: latex,
          source: 'desmos'
        }
      }
    } catch (e) {
      if (this.debug) {
        console.warn(`[GenericResultExtractor] Failed to evaluate ${latex}:`, e)
      }
    }

    // If HelperExpression doesn't give us a value directly,
    // try to infer from the expression pattern
    const inferredType = this.inferType(latex)
    if (inferredType) {
      if (this.debug) {
        console.log(`[GenericResultExtractor] Inferred type:`, inferredType)
      }
      return {
        type: inferredType.type,
        value: inferredType.value,
        expression: latex,
        source: 'desmos'
      }
    }

    if (this.debug) {
      console.log(`[GenericResultExtractor] Could not extract value from ${latex}`)
    }

    return null
  }

  /**
   * Robustly evaluates a LaTeX expression using Desmos HelperExpression with observe pattern
   */
  private evaluateLatex(calculator: DesmosCalculator, latex: string): Promise<number | typeof NaN> {
    return new Promise(resolve => {
      const helper = calculator.HelperExpression({ latex })
      
      if (this.debug) {
        console.log(`[GenericResultExtractor] HelperExpression created for: ${latex}`)
        console.log(`[GenericResultExtractor] Initial numericValue:`, helper.numericValue)
      }
      
      // Sometimes values are immediately available if already computed
      if (helper.numericValue !== undefined && !Number.isNaN(helper.numericValue)) {
        if (this.debug) {
          console.log(`[GenericResultExtractor] Value immediately available: ${helper.numericValue}`)
        }
        resolve(helper.numericValue)
        return
      }

      // Wait for the value to settle
      let timer: number
      const callback = () => {
        if (helper.numericValue !== undefined && !Number.isNaN(helper.numericValue)) {
          if (this.debug) {
            console.log(`[GenericResultExtractor] Value settled via observe: ${helper.numericValue}`)
          }
          clearTimeout(timer)
          helper.unobserve('value')
          resolve(helper.numericValue)
        }
      }
      
      helper.observe('value', callback)
      
      // Timeout if it never settles to a valid number
      timer = window.setTimeout(() => {
        if (this.debug) {
          console.log(`[GenericResultExtractor] Timeout waiting for value, using current: ${helper.numericValue}`)
        }
        helper.unobserve('value')
        resolve(helper.numericValue ?? NaN)
      }, 500)
    })
  }

  /**
   * Infer result type from expression pattern when HelperExpression doesn't provide a value
   */
  private inferType(latex: string): { type: ExtractedResult['type'], value: string } | null {
    // Point coordinates: (3, 5)
    const pointMatch = latex.match(/^\s*\(\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*\)\s*$/)
    if (pointMatch) {
      return { type: 'point', value: pointMatch[0] }
    }

    // Boolean expressions
    if (/^(true|false)$/i.test(latex.trim())) {
      return { type: 'boolean', value: latex.trim().toLowerCase() }
    }

    // Lists: [1, 2, 3]
    const listMatch = latex.match(/^\s*\[[\s\d.,\-]+\]\s*$/)
    if (listMatch) {
      return { type: 'list', value: listMatch[0] }
    }

    // If it looks like a number
    const numMatch = latex.match(/^[-+]?\d*\.?\d+$/)
    if (numMatch) {
      return { type: 'number', value: numMatch[0] }
    }

    return null
  }

  /**
   * Log debug information in development mode
   */
  private logDebugInfo(totalScanned: number, expr: any, result: ExtractedResult): void {
    const debugInfo: ExtractionDebugInfo = {
      expressionsScanned: totalScanned,
      lastEvaluatedExpression: expr.latex || '(no latex)',
      detectedType: result.type,
      computedValue: result.value,
      source: result.source
    }

    console.group('[GenericResultExtractor] Extraction Result')
    console.log(`Expressions scanned: ${debugInfo.expressionsScanned}`)
    console.log(`Last evaluated expression: ${debugInfo.lastEvaluatedExpression}`)
    console.log(`Detected type: ${debugInfo.detectedType}`)
    console.log(`Computed value: ${debugInfo.computedValue}`)
    console.log(`Source: ${debugInfo.source}`)
    console.groupEnd()
  }
}

export const genericResultExtractor = new GenericResultExtractor()
