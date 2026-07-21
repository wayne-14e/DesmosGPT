export type AttachmentType = 'image'
export type OcrStatus = 'idle' | 'processing' | 'complete' | 'error'

export interface Attachment {
  id: string
  type: AttachmentType
  file: File
  previewUrl: string
  vision?: import('../../lib/vision/types').VisionResult
  ocrStatus: OcrStatus
  error?: string
}

export interface InputPayload {
  text: string
  latex: string
  attachments: Attachment[]
}

export const imageTypes = ['image/png', 'image/jpeg', 'image/webp']
export const acceptsImage = (file: File) => imageTypes.includes(file.type)
