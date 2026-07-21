import type { DesmosCalculator, Tutorial } from '../../types'
import type { Evaluator, EvaluatorResult } from './evaluators/types'
import type { VisionResult } from '../vision/types'
import { genericResultExtractor } from './GenericResultExtractor'
import { genericEvaluator } from './evaluators/generic'
import { quadraticRegressionEvaluator } from './evaluators/quadraticRegression'
import { linearRegressionEvaluator } from './evaluators/linearRegression'
import { quadraticRootsEvaluator } from './evaluators/quadraticRoots'
import { systemsEvaluator } from './evaluators/systems'
import { getAIProvider } from '../ai/provider'
import { solveSystemPrompt } from '../ai/prompts'
import { findMatchingTechnique, formatTechniqueForPrompt, isKnowledgeBaseReady } from '../../knowledge'

const evaluators: Evaluator[] = [
  quadraticRegressionEvaluator,
  linearRegressionEvaluator,
  quadraticRootsEvaluator,
  systemsEvaluator,
  genericEvaluator, 
]

export class ResultEngine {
  async compute(calculator: DesmosCalculator, tutorial: Tutorial, visionResult?: VisionResult): Promise<void> {
    // We already have expectedAnswer mapped, reset computedAnswer.
    tutorial.computedAnswer = undefined
    tutorial.resultSource = 'ai' // fallback

    console.log('[ResultEngine] Starting computation for tutorial:', tutorial.technique)

    // Priority 1: Generic Result Extractor (inspects entire Desmos state)
    try {
      console.log('[ResultEngine] Trying Generic Result Extractor...')
      const extracted = await genericResultExtractor.extract(calculator)
      console.log('[ResultEngine] Generic extractor result:', extracted)
      if (extracted) {
        tutorial.computedAnswer = extracted.value
        tutorial.resultSource = 'desmos'
        console.log('[ResultEngine] SUCCESS: Using extracted value:', extracted.value)
        return
      }
    } catch (e) {
      console.warn('[ResultEngine] Generic extractor failed:', e)
    }

    // Priority 2: Technique-specific evaluators
    console.log('[ResultEngine] Trying technique-specific evaluators...')
    for (const evaluator of evaluators) {
      if (evaluator.canEvaluate(tutorial)) {
        try {
          console.log(`[ResultEngine] Running evaluator: ${evaluator.id}`)
          const result = await evaluator.evaluate(calculator, tutorial)
          console.log(`[ResultEngine] Evaluator ${evaluator.id} result:`, result)
          if (result) {
            tutorial.computedAnswer = result.computedAnswer
            tutorial.resultSource = result.resultSource
            console.log('[ResultEngine] SUCCESS: Using evaluator result:', result.computedAnswer)
            return
          }
        } catch (e) {
          console.warn(`[ResultEngine] Evaluator ${evaluator.id} failed:`, e)
        }
      }
    }

    // Priority 3: AI fallback with technique-based solving
    console.log('[ResultEngine] Desmos extraction failed, using AI fallback with technique-based solving')
    await this.computeWithAI(tutorial, visionResult)

    console.log('[ResultEngine] Final computedAnswer:', tutorial.computedAnswer)
  }

  private async computeWithAI(tutorial: Tutorial, visionResult?: VisionResult): Promise<void> {
    const provider = getAIProvider()
    if (!provider.getModelInfo().configured) {
      console.log('[ResultEngine] AI provider not configured, using expected answer fallback')
      tutorial.computedAnswer = tutorial.expectedAnswer || 'No result computed'
      tutorial.resultSource = 'ai'
      return
    }

    try {
      // Build enhanced question with answer choices if available
      let enhancedQuestion = tutorial.question
      if (visionResult?.answerChoices && visionResult.answerChoices.length > 0) {
        const choicesText = visionResult.answerChoices
          .map(c => `${c.label}: ${c.content}`)
          .join('\n')
        enhancedQuestion = `${tutorial.question}\n\nAnswer choices:\n${choicesText}`
      }

      // Find matching technique for enhanced solving
      let techniqueKnowledge: string | undefined
      const matchingTechnique = findMatchingTechnique(tutorial.question)
      if (matchingTechnique && isKnowledgeBaseReady()) {
        techniqueKnowledge = formatTechniqueForPrompt(matchingTechnique)
        if (import.meta.env.DEV) {
          console.log('[ResultEngine] Using technique for AI fallback:', matchingTechnique.metadata.id)
        }
      }

      const systemPrompt = solveSystemPrompt(techniqueKnowledge)
      const solveResult = await provider.solveQuestion(enhancedQuestion, systemPrompt)

      console.log('[ResultEngine] AI solve result:', solveResult)

      // Use the AI-computed answer
      tutorial.computedAnswer = solveResult.answer
      tutorial.resultSource = 'ai'

      // If AI matched a choice, use the choice label as the answer
      if (solveResult.matchedChoice) {
        tutorial.computedAnswer = solveResult.matchedChoice
        console.log('[ResultEngine] AI matched answer choice:', solveResult.matchedChoice)
      }
    } catch (e) {
      console.warn('[ResultEngine] AI fallback failed:', e)
      tutorial.computedAnswer = tutorial.expectedAnswer || 'No result computed'
      tutorial.resultSource = 'ai'
    }
  }
}

export const resultEngine = new ResultEngine()
