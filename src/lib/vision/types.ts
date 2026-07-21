/**
 * Structured Vision Result for SAT Math Problem Extraction
 * 
 * This interface represents a complete understanding of an SAT Math problem
 * from an image, preserving all information required to solve it.
 */

export interface TableData {
  headers: string[]
  rows: (string | number)[][]
}

export interface GraphData {
  type: 'quadratic' | 'linear' | 'exponential' | 'scatter' | 'coordinate-plane' | 'unknown'
  visiblePoints?: { x: number; y: number }[]
  axisLabels?: { x?: string; y?: string }
  intercepts?: { xIntercept?: number; yIntercept?: number }
  title?: string
  notes?: string
}

export interface AnswerChoice {
  label: 'A' | 'B' | 'C' | 'D'
  content: string
}

export interface DiagramData {
  type: 'geometry' | 'coordinate-grid' | 'figure' | 'unknown'
  description?: string
  labels?: string[]
  measurements?: string[]
}

export interface VisionResult {
  /** The main question text extracted from the image */
  questionText: string
  
  /** Mathematical expressions/equations found in the problem */
  equations: string[]
  
  /** Tables extracted from the problem */
  tables: TableData[]
  
  /** Graphs detected in the problem */
  graphs: GraphData[]
  
  /** Answer choices extracted from the problem */
  answerChoices: AnswerChoice[]
  
  /** Diagrams and figures detected in the problem */
  diagrams: DiagramData[]
  
  /** Detected mathematical topics (e.g., "quadratic equations", "systems of equations") */
  detectedTopics: string[]
  
  /** Confidence score from 0 to 1 */
  confidence: number
  
  /** Whether a table was detected */
  containsTable: boolean
  
  /** Whether a graph was detected */
  containsGraph: boolean
  
  /** Whether a diagram was detected */
  containsDiagram: boolean
  
  /** Whether multiple choice options were detected */
  containsMultipleChoice: boolean
  
  /** Warnings about extraction quality or ambiguities */
  warnings: string[]
}
