import { LoaderCircle, RefreshCw, RotateCcw, X, Check } from 'lucide-react'
import type { Attachment } from './types'

interface Props { attachment: Attachment; onRemove: () => void; onReplace: () => void; onRetry: () => void }

export function InputPreview({ attachment, onRemove, onReplace, onRetry }: Props) {
  const vision = attachment.vision
  
  const getStatusLabel = () => {
    if (attachment.ocrStatus === 'processing') return 'Reading problem…'
    if (attachment.ocrStatus === 'error') return attachment.error ?? 'Failed to read'
    if (attachment.ocrStatus === 'complete' && vision) {
      const parts = []
      parts.push('Question extracted')
      if (vision.containsTable) parts.push('Table detected')
      if (vision.containsGraph) parts.push('Graph detected')
      if (vision.containsDiagram) parts.push('Diagram detected')
      if (vision.containsMultipleChoice) parts.push(`${vision.answerChoices.length} answer choices`)
      return parts.join(' · ')
    }
    return 'Ready to read'
  }

  const label = getStatusLabel()
  
  return <div className="attachment-preview">
    <img src={attachment.previewUrl} alt="Uploaded math problem"/>
    <div className="attachment-meta">
      <span className={attachment.ocrStatus === 'error' ? 'error' : ''}>
        {attachment.ocrStatus === 'processing' && <LoaderCircle className="spin" size={13}/>}
        {attachment.ocrStatus === 'complete' && vision && <Check size={13} style={{marginRight: 4}}/>}
        {label}
      </span>
      <small>{vision ? `Confidence: ${Math.round(vision.confidence * 100)}% · ${attachment.file.name}` : attachment.file.name}</small>
    </div>
    {attachment.ocrStatus === 'error' && <button type="button" className="retry-ocr" onClick={onRetry}><RefreshCw size={14}/> Retry</button>}
    <button type="button" aria-label="Replace image" onClick={onReplace}><RotateCcw size={15}/></button>
    <button type="button" aria-label="Remove image" onClick={onRemove}><X size={16}/></button>
  </div>
}
