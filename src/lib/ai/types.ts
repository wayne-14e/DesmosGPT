// Re-export VisionResult from the vision module
export type { VisionResult } from '../vision/types'

export interface ImageInput { data: string; mimeType: string }

export interface ModelInfo {
  provider: string
  model?: string
  configured: boolean
}

export interface ProviderHealth extends ModelInfo {
  available: boolean
  message: string
}

export interface SolveResult {
  answer: string
  reasoning: string
  matchedChoice: 'A' | 'B' | 'C' | 'D' | null
}

export interface AIProvider {
  analyzeQuestion(question: string, systemPrompt: string): Promise<string>
  processImage(image: ImageInput, systemPrompt: string): Promise<import('../vision/types').VisionResult>
  solveQuestion(question: string, systemPrompt: string): Promise<SolveResult>
  checkAvailability(): Promise<ProviderHealth>
  getModelInfo(): ModelInfo
}
