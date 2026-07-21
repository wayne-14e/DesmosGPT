import type { Tutorial } from '../types'

export const demoTutorial: Tutorial = {
  question: 'Find the equation of the parabola passing through (-1, 10), (0, 14), and (1, 20).',
  technique: 'Quadratic Regression',
  summary: 'Enter the points into a table, then run a regression to find the parameters.',
  expectedAnswer: 'y = 3x^2 + x + 14',
  time: '20 sec',
  steps: [
    {
      id: 'table',
      title: 'Enter the points',
      expression: 'x_1, y_1',
      expressions: [
        {
          type: 'table',
          columns: [
            { latex: 'x_1', values: ['-1', '0', '1'] },
            { latex: 'y_1', values: ['10', '14', '20'] }
          ]
        }
      ],
      hint: 'Create a table and add the coordinates.',
      why: 'Tables organize coordinates for Desmos to analyze.',
      bounds: { left: -5, right: 5, bottom: 0, top: 25 },
    },
    {
      id: 'regression',
      title: 'Run quadratic regression',
      expression: 'y_1~a*x_1^2+b*x_1+c',
      expressions: [
        {
          type: 'table',
          columns: [
            { latex: 'x_1', values: ['-1', '0', '1'] },
            { latex: 'y_1', values: ['10', '14', '20'] }
          ]
        },
        'y_1~a*x_1^2+b*x_1+c'
      ],
      hint: 'Use the ~ symbol to run a regression.',
      why: 'Desmos will find the a, b, and c parameters that best fit these points.',
      bounds: { left: -5, right: 5, bottom: 0, top: 25 },
    }
  ]
}

export const examples = [
  'What is the positive solution to x² − 5x − 14 = 0?',
  'A line passes through (2, 7) and (6, 15). What is its slope?',
  'The table shows exponential growth. Find the equation.',
]

/**
 * Normalise a Desmos expression string so it can be safely handed to
 * calculator.setExpression(). Handles common Unicode and LaTeX artefacts
 * that the AI may emit.
 *
 * Returns null when the result would be empty or clearly invalid,
 * allowing callers to skip the expression entirely.
 */
export function normalizeLatex(expression: string | null | undefined): string | null {
  if (!expression) return null
  const result = expression
    // Unicode superscripts / minus
    .replaceAll('²', '^2')
    .replaceAll('³', '^3')
    .replaceAll('−', '-')
    .replaceAll('\u2212', '-')       // Unicode MINUS SIGN
    .replaceAll('\u00B2', '^2')      // SUPERSCRIPT TWO
    .replaceAll('\u00B3', '^3')      // SUPERSCRIPT THREE
    // LaTeX operators Desmos doesn't use
    .replaceAll('\\cdot', '*')
    .replaceAll('\\times', '*')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\,', '')
    .replaceAll('\\:', '')
    .replaceAll('\\;', '')
    // Strip LaTeX \frac{a}{b} → not valid Desmos; drop the markers, keep the content
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    // Strip remaining backslash commands (e.g. \sqrt becomes sqrt)
    .replace(/\\([a-zA-Z]+)/g, '$1')
    // Desmos regression tilde – keep only one space before it so Desmos parses it
    .replaceAll('~', '~')
    // Strip stray LaTeX display delimiters
    .replaceAll('$$', '')
    .replaceAll('\\[', '')
    .replaceAll('\\]', '')
    // Collapse spaces (Desmos is space-insensitive but let's be clean)
    .replace(/\s+/g, '')

  return result.length > 0 ? result : null
}

/**
 * Formats a raw or normalized Desmos expression for beautiful rendering via KaTeX.
 * Retains subscript forms (e.g. x_1) as they are natively supported by KaTeX,
 * but replaces computational symbols with proper mathematical notation.
 */
export function formatForDisplay(expression: string | null | undefined): string {
  if (!expression) return ''
  return expression
    // Convert computational multiply to dot
    .replaceAll('*', '\\cdot ')
    // Convert regression tilde to beautiful sim
    .replaceAll('~', '\\sim ')
}

