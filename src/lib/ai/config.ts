export interface AIConfig {
  provider: string
  model?: string
  apiKey?: string
}

export const getAIConfig = (): AIConfig => ({
  provider: (import.meta.env.VITE_AI_PROVIDER as string | undefined)?.toLowerCase() ?? 'google',
  model: import.meta.env.VITE_AI_MODEL as string | undefined,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
})
