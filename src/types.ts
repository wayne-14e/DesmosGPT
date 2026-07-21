export type Bounds = { left: number; right: number; bottom: number; top: number }

export type DesmosExpression = {
  type?: 'expression' | 'table' | 'folder' | 'text' | 'image'
  id?: string
  latex?: string
  color?: string
  hidden?: boolean
  folderId?: string
  columns?: Array<{ latex?: string; values?: string[]; id?: string; color?: string; hidden?: boolean }>
  [key: string]: any
}

export type CoachStep = {
  id: string
  title: string
  /** Primary expression shown in the copy box and used as Desmos expression when expressions[] is absent. */
  expression: string
  /** All Desmos expressions for this step. When present, the graph renders every entry in this array.
   *  When absent, falls back to [expression]. Supports strings or fully typed Native Desmos API objects. */
  expressions?: (string | DesmosExpression)[]
  hint: string
  why: string
  bounds?: Bounds
}

export type Tutorial = {
  question: string
  technique: string
  summary: string
  expectedAnswer?: string
  computedAnswer?: string
  resultSource?: 'desmos' | 'evaluator' | 'ai'
  time: string
  steps: CoachStep[]
}

declare global {
  interface Window {
    Desmos?: { GraphingCalculator: (element: HTMLElement, options?: Record<string, unknown>) => DesmosCalculator }
  }
}

export interface DesmosCalculator {
  setExpression: (expression: DesmosExpression) => void
  removeExpression: (expression: { id: string }) => void
  setMathBounds: (bounds: Bounds) => void
  getState: () => any
  HelperExpression: (options: { latex: string }) => {
    observe: (event: 'value', callback: () => void) => void
    unobserve: (event: 'value') => void
    numericValue: number | typeof NaN
    listValue: number[] | undefined
  }
  destroy: () => void
}
