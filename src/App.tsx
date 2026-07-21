import { useCallback, useEffect, useRef, useState } from 'react'
import katex from 'katex'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Copy, Crosshair, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import { analyzeQuestion } from './lib/analyzeQuestion'
import { demoTutorial, normalizeLatex, formatForDisplay } from './lib/techniques'
import { GraphStateManager } from './lib/graphState'
import { resultEngine } from './lib/result/ResultEngine'
import type { DesmosCalculator, Tutorial } from './types'
import { MultiModalInput } from './features/input/MultiModalInput'
import type { InputPayload } from './features/input/types'
import type { Attachment } from './features/input/types'
import { getAIProvider } from './lib/ai/provider'
import type { ProviderHealth } from './lib/ai/types'

// ─── KaTeX math renderer ─────────────────────────────────────────────────────

function Math({ expr, display = false }: { expr: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(expr, ref.current, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: false,
      })
    } catch {
      if (ref.current) ref.current.textContent = expr
    }
  }, [expr, display])
  return <span ref={ref} className={display ? 'math-display' : 'math-inline'} />
}

/**
 * Renders a mixed string that may contain LaTeX fragments wrapped in $…$ or $$…$$.
 * Plain text is rendered verbatim; LaTeX segments are rendered with KaTeX.
 */
function MixedMath({ text }: { text: string }) {
  const parts: Array<{ type: 'text' | 'inline' | 'display'; value: string }> = []
  let remaining = text
  // split on $$…$$ first, then $…$
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) })
    const raw = match[0]
    if (raw.startsWith('$$')) {
      parts.push({ type: 'display', value: raw.slice(2, -2).trim() })
    } else {
      parts.push({ type: 'inline', value: raw.slice(1, -1).trim() })
    }
    last = match.index + raw.length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  if (parts.length === 0) parts.push({ type: 'text', value: remaining })

  return (
    <>
      {parts.map((p, i) =>
        p.type === 'text' ? (
          <span key={i}>{p.value}</span>
        ) : (
          <Math key={i} expr={p.value} display={p.type === 'display'} />
        )
      )}
    </>
  )
}

// ─── Desmos Graph component ───────────────────────────────────────────────────

const DESMOS_TIMEOUT_MS = 10_000

// Enable detailed sync logging in development. Set to false before shipping.
const DEBUG_GRAPH = import.meta.env.DEV

interface GraphProps {
  tutorial: Tutorial
  active: number
  stepKey: number
  calculatorRef: React.MutableRefObject<DesmosCalculator | undefined>
}

function Graph({ tutorial, active, stepKey, calculatorRef }: GraphProps) {
  const host = useRef<HTMLDivElement>(null)
  const graphState = useRef(new GraphStateManager())
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // ── Init calculator ──────────────────────────────────────────────────────
  useEffect(() => {
    setReady(false)
    setError(null)
    graphState.current.reset()

    const timeoutId = window.setTimeout(() => {
      if (!calculatorRef.current) {
        setError('Calculator failed to load. Check your connection and retry.')
      }
    }, DESMOS_TIMEOUT_MS)

    const tryInit = () => {
      if (!host.current || calculatorRef.current) return false
      if (!window.Desmos) return false
      try {
        calculatorRef.current = window.Desmos.GraphingCalculator(host.current, {
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          lockViewport: false,
          keypad: true,
        })
        setReady(true)
        window.clearTimeout(timeoutId)
        return true
      } catch (err) {
        console.error('[DesmosGPT] Calculator initialization error:', err)
        if (err instanceof Error) {
          setError(`Calculator failed to load: ${err.message}`)
        }
        return false
      }
    }

    if (!tryInit()) {
      // Desmos not ready yet — poll (handles slow connections / async script load)
      const interval = window.setInterval(() => {
        if (tryInit()) window.clearInterval(interval)
      }, 100)
      return () => {
        window.clearTimeout(timeoutId)
        window.clearInterval(interval)
        calculatorRef.current?.destroy()
        calculatorRef.current = undefined
        graphState.current.reset()
      }
    }

    return () => {
      window.clearTimeout(timeoutId)
      calculatorRef.current?.destroy()
      calculatorRef.current = undefined
      graphState.current.reset()
    }
  // retryCount increments force a fresh init on retry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, calculatorRef])

  // ── Sync expressions whenever step changes ───────────────────────────────
  useEffect(() => {
    if (!ready || !calculatorRef.current) return

    const result = graphState.current.syncToStep(
      calculatorRef.current,
      tutorial.steps,
      active,
    )

    if (DEBUG_GRAPH) {
      console.group(`[DesmosGPT] Step ${active + 1} / ${tutorial.steps.length} — "${tutorial.steps[active]?.title}"`)
      console.log('Technique:', tutorial.technique)
      console.log('Set IDs (' + result.set.length + '):', result.set)
      if (result.removed.length) console.log('Removed IDs (' + result.removed.length + '):', result.removed)
      if (result.skipped.length) console.warn('Skipped (invalid/empty) expressions:', result.skipped)
      console.log('Bounds applied:', result.boundsApplied)
      console.groupEnd()
    }
  }, [tutorial, active, ready, stepKey])

  const retry = () => {
    calculatorRef.current?.destroy()
    calculatorRef.current = undefined
    graphState.current.reset()
    setRetryCount(c => c + 1)
  }

  if (error) {
    return (
      <div className="graph-shell">
        <div className="graph-error">
          <Crosshair size={24} />
          <span>{error}</span>
          <button className="retry-btn" onClick={retry}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="graph-shell" data-ready={ready}>
      <div ref={host} className="graph" />
      {!ready && (
        <div className="graph-fallback" role="status" aria-label="Loading calculator">
          <LoaderCircle className="spin" size={22} />
          <span>Loading calculator…</span>
        </div>
      )}
      <div className="graph-label">
        <span className="pulse" />
        LIVE DESMOS
      </div>
    </div>
  )
}



// ─── Loading progress ─────────────────────────────────────────────────────────

type LoadStage = 'idle' | 'analyzing' | 'complete' | 'error'

const STAGE_LABELS: Record<Exclude<LoadStage, 'idle' | 'error'>, string> = {
  analyzing: 'Analyzing question…',
  complete: 'Building your tutorial…',
}

function LoadingProgress({ stage }: { stage: LoadStage }) {
  if (stage === 'idle') return null
  if (stage === 'error') return null
  return (
    <div className="loading-progress" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={16} />
      <span>{STAGE_LABELS[stage]}</span>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  // ── Persistent input state (survives back navigation) ────────────────────
  const [inputText, setInputText]       = useState('')
  const [inputLatex, setInputLatex]     = useState('')
  const [inputAttachments, setInputAttachments] = useState<Attachment[]>([])

  // ── Tutorial / coach state ───────────────────────────────────────────────
  const [tutorial, setTutorial]     = useState<Tutorial | null>(null)
  const [active, setActive]         = useState(0)
  const [stepKey, setStepKey]       = useState(0)  // increments to trigger graph animation
  const [showAnswer, setShowAnswer] = useState(false)
  const [loadStage, setLoadStage]   = useState<LoadStage>('idle')
  const [copied, setCopied]         = useState(false)
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | null>(null)
  const [visionResult, setVisionResult] = useState<import('./lib/vision/types').VisionResult | undefined>(undefined)

  const calculatorRef = useRef<DesmosCalculator>()

  useEffect(() => {
    void getAIProvider().checkAvailability().then(setProviderHealth)
  }, [])

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goTo = useCallback((index: number) => {
    setActive(index)
    setStepKey(k => k + 1)
  }, [])

  const goBack = useCallback(() => {
    // Return to landing and clear input for fresh start
    setTutorial(null)
    setActive(0)
    setShowAnswer(false)
    setStepKey(0)
    setInputText('')
    setInputLatex('')
    setInputAttachments([])
    setVisionResult(undefined)
  }, [])

  const computeAndShowAnswer = async () => {
    if (tutorial && calculatorRef.current) {
      document.body.style.cursor = 'wait'
      await resultEngine.compute(calculatorRef.current, tutorial, visionResult)
      document.body.style.cursor = 'default'
      setTutorial({ ...tutorial }) // trigger re-render
      setShowAnswer(true)
    }
  }

  // ── Submit handler ───────────────────────────────────────────────────────
  const start = async (payload: InputPayload) => {
    const value =
      [payload.text, payload.latex].filter(Boolean).join('\n') ||
      payload.attachments[0]?.vision?.questionText ||
      'Analyze the attached SAT Math question.'
    if (!value.trim()) return

    // Persist the payload so Back restores it
    setInputText(payload.text)
    setInputLatex(payload.latex)
    setInputAttachments(payload.attachments)

    // Capture VisionResult from attachments for AI fallback
    const attachmentVision = payload.attachments[0]?.vision
    setVisionResult(attachmentVision)

    setLoadStage('analyzing')
    setShowAnswer(false)
    try {
      const result = await analyzeQuestion(value)
      setLoadStage('complete')
      // Small breathing room before switching view so the final stage label is visible
      await new Promise(r => setTimeout(r, 220))
      setTutorial(result)
      setActive(0)
      setStepKey(0)
    } catch {
      setTutorial({ ...demoTutorial, question: value })
      setActive(0)
      setStepKey(0)
    } finally {
      setLoadStage('idle')
    }
  }

  // ── Copy expression ──────────────────────────────────────────────────────
  // Always copy the same normalized string that was sent to Desmos so there
  // is never a mismatch between the copy box and the graph.
  const step = tutorial?.steps[active]
  const copy = async () => {
    if (!step) return
    const text = normalizeLatex(step.expression) ?? step.expression
    try {
      await navigator.clipboard?.writeText(text)
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  // ─── LANDING VIEW ────────────────────────────────────────────────────────
  if (!tutorial) {
    return (
      <main className="landing">
        <nav>
          <div className="brand">
            <div className="brand-mark"><span /></div>
            DESMOS<span>GPT</span>
          </div>
          <div className="nav-right"><span className="status-dot" /> SAT MATH COACH</div>
        </nav>
        <section className="hero">
          <div className="eyebrow"><Sparkles size={14} /> BUILT FOR THE DIGITAL SAT</div>
          <h1>Math moves faster<br />when you can <em>see it.</em></h1>
          <p>Paste, type, or drop in any SAT math problem. Get the exact Desmos moves — one visual step at a time.</p>

          <LoadingProgress stage={loadStage} />

          <MultiModalInput
            onSubmit={start}
            loading={loadStage !== 'idle'}
            initialText={inputText}
            initialLatex={inputLatex}
            initialAttachments={inputAttachments}
            onTextChange={setInputText}
            onLatexChange={setInputLatex}
            onAttachmentsChange={setInputAttachments}
          />

          {providerHealth && !providerHealth.available && (
            <div className="provider-warning" role="status">
              <strong>Developer warning</strong>
              <span>{providerHealth.message}</span>
            </div>
          )}
          <div className="shortcut">⌘ / CTRL + ENTER to start · PASTE A SCREENSHOT ANYWHERE</div>
        </section>
        <div className="ambient one" /><div className="ambient two" />
        <footer>
          <span>DESMOSGPT / 01</span>
          <span>VISUAL THINKING FOR SAT MATH</span>
          <span>© 2026</span>
        </footer>
      </main>
    )
  }

  // ─── COACH VIEW ──────────────────────────────────────────────────────────
  const isLast = active === tutorial.steps.length - 1

  return (
    <main className="coach coach-enter">
      <header>
        <button className="brand back-brand" onClick={goBack} aria-label="Back to question editor">
          <div className="brand-mark"><span /></div>
          DESMOS<span>GPT</span>
        </button>
        <div className="question-pill">
          {tutorial.technique}
          <i />
          {tutorial.time}
        </div>
        <button className="new-problem" onClick={goBack}>
          New problem <ArrowRight size={15} />
        </button>
      </header>

      <div className="workspace">
        {/* ── Lesson panel ── */}
        <section className="lesson">
          <div className="progress" role="progressbar" aria-valuenow={active + 1} aria-valuemax={tutorial.steps.length}>
            <span>STEP {String(active + 1).padStart(2, '0')}</span>
            <div>
              {tutorial.steps.map((s, i) => (
                <button
                  key={s.id}
                  className={`progress-pip${i <= active ? ' done' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
            <span>{String(tutorial.steps.length).padStart(2, '0')} TOTAL</span>
          </div>

          <div className="context">
            <span>YOUR QUESTION</span>
            <p>{tutorial.question}</p>
          </div>

          <div className="step-content step-enter" key={`step-${active}`}>
            <div className="tiny-label"><span /> DESMOS MOVE</div>
            <h2>{step?.title}</h2>
            <p className="hint"><MixedMath text={step?.hint ?? ''} /></p>

            <div className={`expression${copied ? ' expression-copied' : ''}`}>
              <div className="expr-math">
                {step && <Math expr={formatForDisplay(normalizeLatex(step.expression) ?? step.expression)} display={false} />}
              </div>
              <button
                onClick={copy}
                aria-label={copied ? 'Copied!' : 'Copy expression'}
                title={copied ? 'Copied!' : 'Copy expression'}
              >
                {copied ? <Check size={19} /> : <Copy size={19} />}
              </button>
            </div>

            <div className="why">
              <Sparkles size={15} />
              <p><MixedMath text={step?.why ?? ''} /></p>
            </div>
          </div>

          <div className="controls">
            <button
              className="secondary"
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
              aria-label="Previous step"
            >
              <ChevronLeft size={18} /> Back
            </button>
            <button
              className="primary"
              onClick={() => {
                if (isLast) {
                  void computeAndShowAnswer()
                } else {
                  goTo(active + 1)
                }
              }}
            >
              {isLast ? 'See answer' : 'Next move'}
              {!isLast && <ChevronRight size={18} />}
            </button>
          </div>
        </section>

        {/* ── Graph panel ── */}
        <section className="visual">
          <Graph tutorial={tutorial} active={active} stepKey={stepKey} calculatorRef={calculatorRef} />
          <div className="graph-caption">
            <span><i /> Your graph updates with every move</span>
            <span>DESMOS CALCULATOR</span>
          </div>
        </section>
      </div>

      {/* ── Answer card ── */}
      {showAnswer && (
        <div className="answer-card answer-card-enter" role="dialog" aria-label="Final answer">
          <div>
            <span style={{font: '500 10px "DM Mono", monospace', letterSpacing: '1.25px', color: '#9cb1c8'}}>FINAL ANSWER</span>
            <strong className="final-answer"><Math expr={formatForDisplay(tutorial.computedAnswer)} /></strong>
          </div>
          <p>
            <b>{tutorial.technique}</b>
            <br />
            {tutorial.summary}
          </p>
          <button onClick={goBack}>
            Try another <ArrowRight size={16} />
          </button>
        </div>
      )}
    </main>
  )
}

export default App
