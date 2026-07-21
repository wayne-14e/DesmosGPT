/**
 * Knowledge Base Loader
 * 
 * Automatically imports and validates all technique JSON files from the techniques directory.
 * Provides a searchable registry for looking up techniques by ID or SAT topic.
 */

import type { Technique } from './schema'
import { validateTechnique } from './schema'

// Dynamically import all JSON files from the techniques directory
const techniqueModules = import.meta.glob('./techniques/*.json', { as: 'raw' })

/**
 * Knowledge Registry
 * Stores all validated techniques with lookup capabilities
 */
class KnowledgeRegistry {
  private techniques: Map<string, Technique> = new Map()
  private byTopic: Map<string, Technique[]> = new Map()
  private byTag: Map<string, Technique[]> = new Map()
  private initialized = false

  /**
   * Initialize the registry by loading and validating all technique files
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    const loadPromises = Object.entries(techniqueModules).map(async ([path, importer]) => {
      try {
        const content = await importer()
        const data = JSON.parse(content as string)
        
        if (validateTechnique(data)) {
          this.registerTechnique(data)
          if (import.meta.env.DEV) {
            console.log(`[KnowledgeBase] Loaded technique: ${data.metadata.id} (${data.title})`)
          }
        } else {
          console.error(`[KnowledgeBase] Validation failed for: ${path}`)
        }
      } catch (error) {
        console.error(`[KnowledgeBase] Failed to load ${path}:`, error)
      }
    })

    await Promise.all(loadPromises)
    this.initialized = true

    if (import.meta.env.DEV) {
      console.log(`[KnowledgeBase] Registry initialized with ${this.techniques.size} techniques`)
    }
  }

  /**
   * Register a technique in all lookup indexes
   */
  private registerTechnique(technique: Technique): void {
    const id = technique.metadata.id
    
    // Store by ID
    this.techniques.set(id, technique)

    // Index by SAT topic
    const topic = technique.satTopic.toLowerCase()
    if (!this.byTopic.has(topic)) {
      this.byTopic.set(topic, [])
    }
    this.byTopic.get(topic)!.push(technique)

    // Index by tags
    for (const tag of technique.metadata.tags) {
      const normalizedTag = tag.toLowerCase()
      if (!this.byTag.has(normalizedTag)) {
        this.byTag.set(normalizedTag, [])
      }
      this.byTag.get(normalizedTag)!.push(technique)
    }

    // Index by subtopics if present
    if (technique.subTopics) {
      for (const subTopic of technique.subTopics) {
        const normalizedSub = subTopic.toLowerCase()
        if (!this.byTopic.has(normalizedSub)) {
          this.byTopic.set(normalizedSub, [])
        }
        this.byTopic.get(normalizedSub)!.push(technique)
      }
    }
  }

  /**
   * Get a technique by its ID
   */
  getById(id: string): Technique | undefined {
    return this.techniques.get(id)
  }

  /**
   * Get all techniques for a given SAT topic
   */
  getByTopic(topic: string): Technique[] {
    return this.byTopic.get(topic.toLowerCase()) || []
  }

  /**
   * Get all techniques that match a tag
   */
  getByTag(tag: string): Technique[] {
    return this.byTag.get(tag.toLowerCase()) || []
  }

  /**
   * Search techniques by trigger keywords
   * Returns techniques that have any of the given keywords in their triggerKeywords list
   */
  searchByKeywords(keywords: string[]): Technique[] {
    const normalizedKeywords = keywords.map(k => k.toLowerCase())
    const results: Technique[] = []

    for (const technique of this.techniques.values()) {
      const techniqueKeywords = technique.triggerKeywords.map(k => k.toLowerCase())
      const hasMatch = normalizedKeywords.some(keyword => 
        techniqueKeywords.some(tk => tk.includes(keyword) || keyword.includes(tk))
      )
      if (hasMatch) {
        results.push(technique)
      }
    }

    return results
  }

  /**
   * Get all registered techniques
   */
  getAll(): Technique[] {
    return Array.from(this.techniques.values())
  }

  /**
   * Get all SAT topics
   */
  getAllTopics(): string[] {
    return Array.from(this.byTopic.keys())
  }

  /**
   * Get all tags
   */
  getAllTags(): string[] {
    return Array.from(this.byTag.keys())
  }

  /**
   * Check if registry is initialized
   */
  isReady(): boolean {
    return this.initialized
  }

  /**
   * Get technique count
   */
  count(): number {
    return this.techniques.size
  }
}

// Singleton instance
const registry = new KnowledgeRegistry()

/**
 * Initialize the knowledge base
 * Call this once at application startup
 */
export async function initializeKnowledgeBase(): Promise<void> {
  await registry.initialize()
}

/**
 * Get a technique by ID
 */
export function getTechniqueById(id: string): Technique | undefined {
  return registry.getById(id)
}

/**
 * Get techniques by SAT topic
 */
export function getTechniquesByTopic(topic: string): Technique[] {
  return registry.getByTopic(topic)
}

/**
 * Get techniques by tag
 */
export function getTechniquesByTag(tag: string): Technique[] {
  return registry.getByTag(tag)
}

/**
 * Search techniques by keywords
 */
export function searchTechniques(keywords: string[]): Technique[] {
  return registry.searchByKeywords(keywords)
}

/**
 * Get all techniques
 */
export function getAllTechniques(): Technique[] {
  return registry.getAll()
}

/**
 * Get all SAT topics
 */
export function getAllTopics(): string[] {
  return registry.getAllTopics()
}

/**
 * Get all tags
 */
export function getAllTags(): string[] {
  return registry.getAllTags()
}

/**
 * Check if knowledge base is ready
 */
export function isKnowledgeBaseReady(): boolean {
  return registry.isReady()
}

/**
 * Get technique count
 */
export function getTechniqueCount(): number {
  return registry.count()
}

/**
 * Find the best matching technique for a given question
 * Uses keyword matching against trigger keywords
 */
export function findMatchingTechnique(question: string): Technique | null {
  if (!registry.isReady()) {
    console.warn('[KnowledgeBase] Registry not initialized')
    return null
  }

  // Extract potential keywords from the question (simple word extraction)
  const words = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)

  const matches = registry.searchByKeywords(words)

  if (matches.length === 0) {
    return null
  }

  if (matches.length === 1) {
    return matches[0]
  }

  // If multiple matches, score by keyword overlap count
  const scored = matches.map(technique => {
    const techniqueKeywords = technique.triggerKeywords.map(k => k.toLowerCase())
    const overlap = words.filter(w => 
      techniqueKeywords.some(tk => tk.includes(w) || w.includes(tk))
    ).length
    return { technique, score: overlap }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].technique
}

/**
 * Get technique knowledge as a formatted string for AI prompts
 * This injects the technique's structured knowledge into the AI prompt
 */
export function formatTechniqueForPrompt(technique: Technique): string {
  return `
TECHNIQUE: ${technique.title}
SAT Topic: ${technique.satTopic}
${technique.subTopics ? `Sub-topics: ${technique.subTopics.join(', ')}` : ''}

DESCRIPTION: ${technique.description}

WHEN TO USE: ${technique.whenToUse}

REQUIRED DESMOS ACTIONS:
${technique.requiredDesmosActions.map((action, i) => 
  `${i + 1}. ${action.type}: ${action.description}${action.syntax ? ` (Syntax: ${action.syntax})` : ''}`
).join('\n')}

EXPECTED DESMOS OUTPUTS:
${technique.expectedDesmosOutputs.map((output, i) => 
  `${i + 1}. ${output.type}: ${output.description} - ${output.interpretation}`
).join('\n')}

INTERPRETATION INSTRUCTIONS: ${technique.interpretationInstructions}

ANSWER LOGIC: ${technique.answerLogic}

COACHING STEPS:
${technique.coachingSteps.map((step, i) => 
  `${i + 1}. ${step.title}: ${step.instruction}${step.hint ? `\n   Hint: ${step.hint}` : ''}${step.why ? `\n   Why: ${step.why}` : ''}`
).join('\n')}

COMMON MISTAKES:
${technique.commonMistakes.map((mistake, i) => `- ${mistake}`).join('\n')}

CONFIDENCE HINTS:
${technique.confidenceHints.map((hint, i) => `- ${hint}`).join('\n')}
`
}
