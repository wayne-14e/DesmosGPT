import { useEffect, useRef } from 'react'
import 'mathlive'

type MathFieldElement = HTMLElement & { value: string; getValue: (format?: string) => string; setValue: (value: string) => void }

interface Props { value: string; onChange: (latex: string, plainText: string) => void; visible: boolean }

export function MathKeyboard({ value, onChange, visible }: Props) {
  const field = useRef<MathFieldElement>(null)
  useEffect(() => { if (field.current && field.current.getValue() !== value) field.current.setValue(value) }, [value])
  useEffect(() => {
    const element = field.current
    if (!element) return
    const handleInput = () => onChange(element.getValue('latex'), element.getValue('ascii-math'))
    element.addEventListener('input', handleInput)
    return () => element.removeEventListener('input', handleInput)
  }, [onChange])
  return <div className={`math-editor ${visible ? 'is-visible' : ''}`}>
    <div className="math-editor-head"><span><i/> MATH MODE</span><span>LaTeX enabled</span></div>
    <math-field ref={field} virtual-keyboard-mode="onfocus" smart-mode="true" aria-label="Math expression editor" />
  </div>
}
