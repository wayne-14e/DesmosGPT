import { getAIProvider } from '../../lib/ai/provider'
import { visionSystemPrompt } from '../../lib/ai/prompts'
import type { VisionResult } from '../../lib/vision/types'

export async function processImage(file: File): Promise<VisionResult> {
  const provider = getAIProvider()
  const encoded = await fileToBase64(file)
  return provider.processImage({ data: encoded, mimeType: file.type }, visionSystemPrompt)
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
