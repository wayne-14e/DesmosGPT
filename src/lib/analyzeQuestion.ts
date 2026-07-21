import type { Tutorial, DesmosExpression } from '../types'
import { getAIProvider } from './ai/provider'
import { tutorialSystemPrompt } from './ai/prompts'
import { demoTutorial, normalizeLatex } from './techniques'
import { findMatchingTechnique, formatTechniqueForPrompt, isKnowledgeBaseReady } from '../knowledge'

export async function analyzeQuestion(question: string): Promise<Tutorial> {
  const provider = getAIProvider()
  if (!provider.getModelInfo().configured) return { ...demoTutorial, question }

  // Find matching technique from knowledge base
  let enhancedPrompt = tutorialSystemPrompt
  const matchingTechnique = findMatchingTechnique(question)
  
  if (matchingTechnique && isKnowledgeBaseReady()) {
    const techniqueKnowledge = formatTechniqueForPrompt(matchingTechnique)
    enhancedPrompt = `${tutorialSystemPrompt}

${techniqueKnowledge}

Use the technique knowledge above as your authoritative guide. Follow the coaching steps, interpretation instructions, and answer logic exactly as specified.`
    
    if (import.meta.env.DEV) {
      console.log('[DesmosGPT] Using technique:', matchingTechnique.metadata.id)
    }
  } else if (import.meta.env.DEV) {
    console.log('[DesmosGPT] No matching technique found, using general prompt')
  }

  const response = await provider.analyzeQuestion(question, enhancedPrompt)
  const parsed = JSON.parse(response.replace(/^```json\s*|\s*```$/g, '')) as Omit<Tutorial, 'question' | 'computedAnswer' | 'resultSource'>
  if (!parsed.steps?.length) throw new Error('AI response did not contain a complete tutorial.')

  // Validate and sanitize each step's expressions.
  // Remove empty or clearly-invalid entries; warn during development.
  const steps = parsed.steps.map(step => {
    // Normalise the primary expression field
    const primaryNormalized = normalizeLatex(step.expression) ?? step.expression

    // Build a clean expressions array: prefer AI-provided, fallback to [primary]
    const rawExprs = step.expressions && step.expressions.length > 0
      ? step.expressions
      : [step.expression]

    const cleanExprs = rawExprs
      .map(e => {
        if (typeof e === 'string') return normalizeLatex(e)
        if (e && typeof e === 'object') return e as DesmosExpression
        return null
      })
      .filter((e): e is string | DesmosExpression => e !== null && (typeof e !== 'string' || e.length > 0))

    if (cleanExprs.length === 0) {
      console.warn('[DesmosGPT] Step has no valid expressions:', step.id, step.expression)
      cleanExprs.push(primaryNormalized)
    }

    return { ...step, expression: primaryNormalized, expressions: cleanExprs }
  })

  return { ...parsed, steps, question }
}

