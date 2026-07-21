import { Braces, ImagePlus, Pi, Radical, Superscript } from 'lucide-react'
interface Props { onMath: () => void; onUpload: () => void; onInsert: (value: string) => void; mathActive: boolean }
export function InputToolbar({ onMath, onUpload, onInsert, mathActive }: Props) {
  return <div className="input-toolbar">
    <button type="button" className={mathActive ? 'active' : ''} onClick={onMath}><Braces size={16}/> Math</button>
    <button type="button" onClick={onUpload}><ImagePlus size={16}/> Image</button>
    <span/>
    <button type="button" aria-label="Insert fraction" onClick={() => onInsert('\\frac{#?}{#?}')}><span>⁄</span></button>
    <button type="button" aria-label="Insert power" onClick={() => onInsert('^{#?}')}><Superscript size={16}/></button>
    <button type="button" aria-label="Insert root" onClick={() => onInsert('\\sqrt{#?}')}><Radical size={17}/></button>
    <button type="button" aria-label="Insert pi" onClick={() => onInsert('\\pi')}><Pi size={16}/></button>
  </div>
}
