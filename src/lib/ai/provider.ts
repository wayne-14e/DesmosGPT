import { getAIConfig } from './config'
import { GoogleAIProvider } from './googleAIProvider'
import type { AIProvider, ModelInfo, ProviderHealth, VisionResult } from './types'

class UnavailableProvider implements AIProvider {
  constructor(private readonly message: string) {}

  getModelInfo(): ModelInfo {
    const config = getAIConfig()
    return { provider: config.provider, model: config.model, configured: false }
  }

  checkAvailability(): Promise<ProviderHealth> {
    return Promise.resolve({ ...this.getModelInfo(), available: false, message: this.message })
  }

  analyzeQuestion(): Promise<string> {
    return Promise.reject(new Error(this.message))
  }

  processImage(): Promise<VisionResult> {
    return Promise.reject(new Error(this.message))
  }
}

export const getAIProvider = (): AIProvider => {
  const config = getAIConfig()
  if (config.provider === 'google') return new GoogleAIProvider()
  return new UnavailableProvider(`Unsupported AI provider: ${config.provider}. Set VITE_AI_PROVIDER=google.`)
}
