import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, LoaderCircle, ScanLine } from 'lucide-react'
import { processImage } from './OCRProcessor'
import { ImageUploader } from './ImageUploader'
import { InputPreview } from './InputPreview'
import { InputToolbar } from './InputToolbar'
import { MathKeyboard } from './MathKeyboard'
import { acceptsImage, type Attachment, type InputPayload } from './types'

interface Props {
  onSubmit: (payload: InputPayload) => void
  loading?: boolean
  // Controlled state props — provided by App when returning from Coach mode
  initialText?: string
  initialLatex?: string
  initialAttachments?: Attachment[]
  onTextChange?: (text: string) => void
  onLatexChange?: (latex: string) => void
  onAttachmentsChange?: (attachments: Attachment[]) => void
}

const id = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

export function MultiModalInput({
  onSubmit,
  loading,
  initialText = '',
  initialLatex = '',
  initialAttachments = [],
  onTextChange,
  onLatexChange,
  onAttachmentsChange,
}: Props) {
  const [text, _setText]       = useState(initialText)
  const [latex, _setLatex]     = useState(initialLatex)
  const [mathOpen, setMathOpen] = useState(false)
  const [attachments, _setAttachments] = useState<Attachment[]>(initialAttachments)
  const [dragging, setDragging] = useState(false)
  const filePicker     = useRef<HTMLInputElement>(null)
  const textArea       = useRef<HTMLTextAreaElement>(null)
  const attachmentsRef = useRef<Attachment[]>([])

  // Propagate prop changes (e.g. when user navigates Back and text was lifted)
  useEffect(() => { _setText(initialText) }, [initialText])
  useEffect(() => { _setLatex(initialLatex) }, [initialLatex])
  useEffect(() => { _setAttachments(initialAttachments) }, [initialAttachments])
  useEffect(() => { attachmentsRef.current = attachments }, [attachments])

  // Cleanup object URLs on unmount
  useEffect(() => () => {
    attachmentsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl))
  }, [])

  // Sync state upward when it changes, using useEffect to avoid setState in render
  useEffect(() => { onTextChange?.(text) }, [text, onTextChange])
  useEffect(() => { onLatexChange?.(latex) }, [latex, onLatexChange])
  useEffect(() => { onAttachmentsChange?.(attachments) }, [attachments, onAttachmentsChange])

  // Expose normal setters
  const setText = _setText
  const setLatex = _setLatex
  const setAttachments = _setAttachments

  const runVision = useCallback(async (attachment: Attachment) => {
    setAttachments(items =>
      items.map(item => item.id === attachment.id ? { ...item, ocrStatus: 'processing', error: undefined } : item)
    )
    try {
      const vision = await processImage(attachment.file)
      setAttachments(items =>
        items.map(item => item.id === attachment.id ? { ...item, ocrStatus: 'complete', vision } : item)
      )
      if (vision.questionText) setText(current => current || vision.questionText)
    } catch {
      setAttachments(items =>
        items.map(item =>
          item.id === attachment.id
            ? { ...item, ocrStatus: 'error', error: "We couldn't read this image. Retry, replace it, or type the problem below." }
            : item
        )
      )
    }
  }, [setAttachments, setText])

  const addFiles = useCallback(async (files: File[]) => {
    const image = files.find(acceptsImage)
    if (!image) return
    const attachment: Attachment = {
      id: id(),
      type: 'image',
      file: image,
      previewUrl: URL.createObjectURL(image),
      ocrStatus: 'processing',
    }
    setAttachments(current => {
      current.forEach(item => URL.revokeObjectURL(item.previewUrl))
      return [attachment]
    })
    void runVision(attachment)
  }, [runVision, setAttachments])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.files ?? []).find(acceptsImage)
      if (image) { event.preventDefault(); void addFiles([image]); return }
      const pastedText = event.clipboardData?.getData('text/plain')
      if (pastedText && document.activeElement !== textArea.current) {
        setText(current => current ? `${current}\n${pastedText}` : pastedText)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles, setText])

  const insertMath = (value: string) => { setMathOpen(true); setLatex(current => current + value) }

  const submit = () => {
    if (text.trim() || latex.trim() || attachments.length) {
      onSubmit({ text: text.trim(), latex, attachments })
    }
  }

  return (
    <div
      className={`multimodal-input ${dragging ? 'is-dragging' : ''}`}
      onDragOver={event => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)) }}
    >
      <div className="input-topline">
        <span><ScanLine size={14} /> ASK DESMOSGPT</span>
        <small>paste text, math, or a screenshot</small>
      </div>
      <textarea
        ref={textArea}
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit() }}
        placeholder="Paste or write an SAT math problem…"
      />
      <MathKeyboard
        value={latex}
        visible={mathOpen}
        onChange={(nextLatex, plain) => {
          setLatex(nextLatex)
          if (plain) setText(current => current || plain)
        }}
      />
      {attachments.map(attachment => (
        <InputPreview
          key={attachment.id}
          attachment={attachment}
          onRetry={() => void runVision(attachment)}
          onRemove={() => { URL.revokeObjectURL(attachment.previewUrl); setAttachments([]) }}
          onReplace={() => filePicker.current?.click()}
        />
      ))}
      {!attachments.length && <ImageUploader onFiles={files => void addFiles(files)} />}
      <input
        ref={filePicker}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={event => void addFiles(Array.from(event.target.files ?? []))}
      />
      <div className="input-footer">
        <InputToolbar
          mathActive={mathOpen}
          onMath={() => setMathOpen(open => !open)}
          onUpload={() => filePicker.current?.click()}
          onInsert={insertMath}
        />
        <button
          type="button"
          className="submit-input"
          onClick={submit}
          disabled={loading || (!text.trim() && !latex.trim() && !attachments.length)}
        >
          {loading
            ? <LoaderCircle className="spin" size={18} />
            : <><span>Coach me</span><ArrowUp size={18} /></>
          }
        </button>
      </div>
    </div>
  )
}
