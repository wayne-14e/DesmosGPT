import { ImagePlus } from 'lucide-react'
import { useRef } from 'react'

interface Props { onFiles: (files: File[]) => void; compact?: boolean }
export function ImageUploader({ onFiles, compact }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return <button type="button" className={compact ? 'tool-button' : 'dropzone'} onClick={() => input.current?.click()}>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => onFiles(Array.from(event.target.files ?? []))} />
    <ImagePlus size={compact ? 17 : 21}/>{!compact && <><strong>Drop a screenshot here</strong><span>or click to browse · PNG, JPG, WEBP</span></>}
  </button>
}
