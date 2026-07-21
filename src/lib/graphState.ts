/**
 * GraphStateManager
 *
 * A dedicated module responsible for translating coaching step data into
 * Desmos Calculator API calls. It maintains the last-rendered expression set
 * and diffs it against the incoming step so only changed expressions are
 * pushed to Desmos — keeping IDs stable and avoiding flicker.
 *
 * Architecture:
 *   App / Graph component
 *        ↓  syncToStep()
 *   GraphStateManager  ←─── maintains renderedIds (Set<string>)
 *        ↓  validated expressions
 *   calculator.setExpression / removeExpression / setMathBounds
 *        ↓
 *   Desmos Calculator DOM
 */

import type { CoachStep, Bounds, DesmosCalculator, DesmosExpression } from '../types'
import { normalizeLatex } from './techniques'

// Palette: active step colour first, then cumulative step colours
const COLOURS = ['#63ffb2', '#4d8dff', '#ff6363', '#ffd166', '#a78bfa', '#f97316']

export interface SyncResult {
  /** Stable Desmos IDs that were set (new or updated). */
  set: string[]
  /** Stable Desmos IDs that were removed (belonged to a now-hidden step). */
  removed: string[]
  /** Expressions that were skipped because they were empty or invalid. */
  skipped: string[]
  /** Whether bounds were applied. */
  boundsApplied: boolean
}

/**
 * Returns the complete, validated list of Desmos expressions that should be
 * visible at a given step index. Prefers step.expressions[] when present,
 * otherwise falls back to [step.expression].
 */
export function resolveExpressions(step: CoachStep): (string | DesmosExpression)[] {
  const raw = step.expressions && step.expressions.length > 0
    ? step.expressions
    : [step.expression]
  return raw
}

/**
 * Builds a stable, human-readable Desmos expression ID from a step id and
 * an expression index within that step.
 *
 * IDs are deterministic across renders so Desmos updates rather than
 * replaces existing curves.
 */
function exprId(stepId: string, index: number): string {
  return `${stepId}-expr-${index}`
}

export class GraphStateManager {
  /** IDs that are currently rendered in the calculator. */
  private rendered = new Set<string>()

  /**
   * Synchronises the calculator to the desired state for the given active
   * step index.
   *
   * Steps at indices 0..active are visible (cumulative build-up); steps
   * above active are removed. The active step's expressions are coloured
   * with the primary accent; prior steps use the secondary palette.
   *
   * @returns A SyncResult describing what changed.
   */
  syncToStep(
    calculator: DesmosCalculator,
    steps: CoachStep[],
    activeIndex: number,
  ): SyncResult {
    const result: SyncResult = { set: [], removed: [], skipped: [], boundsApplied: false }

    // Build the desired set of IDs → exprObj
    const desired = new Map<string, DesmosExpression>()
    const activeStep = steps[activeIndex]
    
    if (activeStep) {
      const exprs = resolveExpressions(activeStep)

      exprs.forEach((raw, exprIndex) => {
        const generatedId = `expr-${exprIndex}`
        let exprObj: DesmosExpression

        if (typeof raw === 'string') {
          const normalized = normalizeLatex(raw)
          if (!normalized) {
            result.skipped.push(raw)
            return
          }
          exprObj = { id: generatedId, latex: normalized }
        } else {
          // Object containing native Desmos API fields
          exprObj = { ...raw, id: raw.id ?? generatedId }
          
          if (exprObj.latex) {
            exprObj.latex = normalizeLatex(exprObj.latex) ?? exprObj.latex
          }
          if (exprObj.columns) {
            exprObj.columns = exprObj.columns.map(col => ({
              ...col,
              latex: col.latex ? normalizeLatex(col.latex) ?? col.latex : undefined
            }))
          }
        }

        // Colour selection:
        // Find when this expression was first introduced to assign its historical color
        let introducedInStep = activeIndex
        for (let i = 0; i <= activeIndex; i++) {
          if (exprIndex < resolveExpressions(steps[i]).length) {
            introducedInStep = i
            break
          }
        }

        const isActiveStepExpr = introducedInStep === activeIndex
        const colourOffset = isActiveStepExpr ? 0 : ((introducedInStep % (COLOURS.length - 1)) + 1)
        const color = COLOURS[colourOffset]
        
        if (!exprObj.color) {
          exprObj.color = color
        }

        desired.set(exprObj.id!, exprObj)
      })
    }

    // Push new / updated expressions
    desired.forEach((exprObj, id) => {
      calculator.setExpression(exprObj)
      result.set.push(id)
    })

    // Remove stale expressions (were rendered, are no longer desired)
    this.rendered.forEach(id => {
      if (!desired.has(id)) {
        calculator.removeExpression({ id })
        result.removed.push(id)
      }
    })

    // Update internal state
    this.rendered = new Set(desired.keys())

    // Apply viewport bounds from the active step
    const bounds: Bounds | undefined = steps[activeIndex]?.bounds
    if (bounds) {
      calculator.setMathBounds(bounds)
      result.boundsApplied = true
    }

    return result
  }

  /** Clears the tracked rendered state (call when the calculator is destroyed). */
  reset(): void {
    this.rendered.clear()
  }
}
