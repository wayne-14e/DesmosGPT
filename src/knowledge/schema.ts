/**
 * Schema for SAT Math technique knowledge files.
 * Each technique is stored as an independent JSON file in src/knowledge/techniques/
 */

export interface TechniqueMetadata {
  id: string
  version: string
  author?: string
  lastUpdated: string
  tags: string[]
}

export interface DesmosAction {
  type: 'table' | 'expression' | 'regression' | 'slider' | 'inequality' | 'function' | 'point' | 'custom'
  description: string
  syntax?: string
  example?: string
}

export interface DesmosOutput {
  type: 'number' | 'equation' | 'point' | 'list' | 'boolean' | 'graph' | 'table' | 'parameters'
  description: string
  interpretation: string
}

export interface CoachingStep {
  id: string
  title: string
  instruction: string
  desmosAction?: DesmosAction
  expectedOutput?: DesmosOutput
  hint?: string
  why?: string
}

export interface Technique {
  // Metadata
  metadata: TechniqueMetadata
  
  // Core identification
  title: string
  description: string
  satTopic: string
  subTopics?: string[]
  
  // Triggering and classification
  triggerKeywords: string[]
  whenToUse: string
  
  // Desmos integration
  requiredDesmosActions: DesmosAction[]
  expectedDesmosOutputs: DesmosOutput[]
  
  // AI guidance
  interpretationInstructions: string
  answerLogic: string
  coachingSteps: CoachingStep[]
  
  // Learning support
  commonMistakes: string[]
  confidenceHints: string[]
  
  // Optional extensions
  examples?: string[]
  prerequisites?: string[]
  relatedTechniques?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string
}

/**
 * Validator function to ensure a technique object conforms to the schema
 */
export function validateTechnique(data: unknown): data is Technique {
  if (typeof data !== 'object' || data === null) return false
  
  const t = data as Partial<Technique>
  
  // Required fields
  if (typeof t.metadata !== 'object' || t.metadata === null) return false
  if (typeof t.metadata.id !== 'string') return false
  if (typeof t.metadata.version !== 'string') return false
  if (!Array.isArray(t.metadata.tags)) return false
  
  if (typeof t.title !== 'string') return false
  if (typeof t.description !== 'string') return false
  if (typeof t.satTopic !== 'string') return false
  
  if (!Array.isArray(t.triggerKeywords)) return false
  if (typeof t.whenToUse !== 'string') return false
  
  if (!Array.isArray(t.requiredDesmosActions)) return false
  if (!Array.isArray(t.expectedDesmosOutputs)) return false
  
  if (typeof t.interpretationInstructions !== 'string') return false
  if (typeof t.answerLogic !== 'string') return false
  
  if (!Array.isArray(t.coachingSteps)) return false
  if (!Array.isArray(t.commonMistakes)) return false
  if (!Array.isArray(t.confidenceHints)) return false
  
  // Validate coaching steps structure
  for (const step of t.coachingSteps) {
    if (typeof step !== 'object' || step === null) return false
    if (typeof step.id !== 'string') return false
    if (typeof step.title !== 'string') return false
    if (typeof step.instruction !== 'string') return false
  }
  
  return true
}

/**
 * Type guard for DesmosAction
 */
export function isDesmosAction(data: unknown): data is DesmosAction {
  if (typeof data !== 'object' || data === null) return false
  const a = data as Partial<DesmosAction>
  if (typeof a.type !== 'string') return false
  if (typeof a.description !== 'string') return false
  const validTypes = ['table', 'expression', 'regression', 'slider', 'inequality', 'function', 'point', 'custom']
  return validTypes.includes(a.type)
}

/**
 * Type guard for DesmosOutput
 */
export function isDesmosOutput(data: unknown): data is DesmosOutput {
  if (typeof data !== 'object' || data === null) return false
  const o = data as Partial<DesmosOutput>
  if (typeof o.type !== 'string') return false
  if (typeof o.description !== 'string') return false
  if (typeof o.interpretation !== 'string') return false
  const validTypes = ['number', 'equation', 'point', 'list', 'boolean', 'graph', 'table', 'parameters']
  return validTypes.includes(o.type)
}
