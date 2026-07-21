import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAIConfig } from './config'
import type { AIProvider, ImageInput, ModelInfo, ProviderHealth, SolveResult } from './types'
import type { VisionResult } from '../vision/types'
import { parseVisionResult } from '../vision/parser'

/** 1×1 PNG for startup vision health checks */
const VISION_PROBE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

export class GoogleAIProvider implements AIProvider {
  getModelInfo(): ModelInfo {
    const config = getAIConfig()
    return {
      provider: config.provider,
      model: config.model,
      configured: Boolean(config.apiKey && config.model),
    }
  }

  async checkAvailability(): Promise<ProviderHealth> {
    const config = getAIConfig()
    const info = this.getModelInfo()

    if (config.provider !== 'google') {
      return { ...info, available: false, message: `Unsupported AI provider: ${config.provider}.` }
    }
    if (!config.apiKey) {
      return { ...info, available: false, message: 'Set VITE_GOOGLE_API_KEY to enable AI processing.' }
    }
    if (!config.model) {
      return { ...info, available: false, message: 'Set VITE_AI_MODEL (e.g. gemini-2.5-flash) to enable AI processing.' }
    }

    try {
      const textModel = this.createModel()
      const textResult = await textModel.generateContent('Reply with exactly: ok')
      assertResponse(textResult.response.text())

      const visionModel = this.createModel('Vision availability check.')
      const visionResult = await visionModel.generateContent([
        { text: 'Describe this image in one word.' },
        { inlineData: { mimeType: 'image/png', data: VISION_PROBE_PNG_BASE64 } },
      ])
      assertResponse(visionResult.response.text())

      return { ...info, available: true, message: 'Google AI Studio (Gemini) is ready.' }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error'
      return { ...info, available: false, message: `Gemini health check failed: ${detail}` }
    }
  }

  async analyzeQuestion(question: string, systemPrompt: string): Promise<string> {
    return retry(async () => {
      const model = this.createModel(systemPrompt, true)
      const result = await model.generateContent(question)
      return assertResponse(result.response.text())
    })
  }

  async processImage(image: ImageInput, systemPrompt: string): Promise<VisionResult> {
    const content = await retry(async () => {
      const model = this.createModel(systemPrompt, true)
      const result = await model.generateContent([
        { text: 'Extract the SAT problem from this image.' },
        { inlineData: { mimeType: image.mimeType, data: image.data } },
      ])
      return assertResponse(result.response.text())
    })
    return parseVisionResult(content)
  }

  async solveQuestion(question: string, systemPrompt: string): Promise<SolveResult> {
    const content = await retry(async () => {
      const model = this.createModel(systemPrompt, true)
      const result = await model.generateContent(question)
      return assertResponse(result.response.text())
    })
    const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')) as SolveResult
    return {
      answer: parsed.answer,
      reasoning: parsed.reasoning,
      matchedChoice: parsed.matchedChoice || null
    }
  }

  private createModel(systemInstruction?: string, jsonResponse = false) {
    const config = getAIConfig()
    if (!config.apiKey) throw new Error('AI provider is not configured.')
    if (!config.model) throw new Error('AI model is not configured.')

    const client = new GoogleGenerativeAI(config.apiKey)
    return client.getGenerativeModel({
      model: config.model,
      systemInstruction,
      generationConfig: {
        temperature: 0.1,
        ...(jsonResponse ? { responseMimeType: 'application/json' as const } : {}),
      },
    })
  }
}

function assertResponse(text: string | undefined): string {
  if (!text?.trim()) throw new Error('AI provider returned an empty response.')
  return text
}

async function retry<T>(work: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await work()
    } catch (error) {
      lastError = error
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 600 * 2 ** attempt))
    }
  }
  throw lastError
}
