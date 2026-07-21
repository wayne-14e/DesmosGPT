import type { VisionResult, TableData, GraphData, AnswerChoice, DiagramData } from './types'

/**
 * Vision Parser - parses and validates Gemini JSON response into structured VisionResult
 */
export function parseVisionResult(content: string): VisionResult {
  // Remove markdown code blocks if present
  const cleanedContent = content.replace(/^```json\s*|\s*```$/g, '')
  
  try {
    const parsed = JSON.parse(cleanedContent) as Partial<VisionResult>
    
    // Validate required fields
    if (!parsed.questionText || typeof parsed.questionText !== 'string') {
      throw new Error('Missing or invalid questionText')
    }
    
    if (typeof parsed.confidence !== 'number') {
      throw new Error('Missing or invalid confidence')
    }
    
    // Build the VisionResult with defaults for optional fields
    return {
      questionText: parsed.questionText,
      equations: validateArray(parsed.equations, 'equations'),
      tables: validateTables(parsed.tables ?? []),
      graphs: validateGraphs(parsed.graphs ?? []),
      answerChoices: validateAnswerChoices(parsed.answerChoices ?? []),
      diagrams: validateDiagrams(parsed.diagrams ?? []),
      detectedTopics: validateArray(parsed.detectedTopics, 'detectedTopics'),
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      containsTable: Boolean(parsed.containsTable),
      containsGraph: Boolean(parsed.containsGraph),
      containsDiagram: Boolean(parsed.containsDiagram),
      containsMultipleChoice: Boolean(parsed.containsMultipleChoice),
      warnings: validateArray(parsed.warnings, 'warnings'),
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse vision response as JSON')
    }
    throw error
  }
}

function validateArray<T>(value: unknown, fieldName: string): T[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value as T[]
}

function validateTables(tables: unknown[]): TableData[] {
  return tables
    .filter((table): table is Record<string, unknown> => 
      table !== null && typeof table === 'object'
    )
    .map(table => ({
      headers: validateArray<string>(table.headers, 'table.headers'),
      rows: validateArray(table.rows, 'table.rows').map(row => 
        validateArray(row, 'table.row')
      ),
    }))
}

function validateGraphs(graphs: unknown[]): GraphData[] {
  const validTypes = ['quadratic', 'linear', 'exponential', 'scatter', 'coordinate-plane', 'unknown'] as const
  
  return graphs
    .filter((graph): graph is Record<string, unknown> => 
      graph !== null && typeof graph === 'object'
    )
    .map(graph => ({
      type: validTypes.includes(graph.type as any) ? graph.type as any : 'unknown',
      visiblePoints: validateArray(graph.visiblePoints, 'graph.visiblePoints'),
      axisLabels: graph.axisLabels as { x?: string; y?: string } | undefined,
      intercepts: graph.intercepts as { xIntercept?: number; yIntercept?: number } | undefined,
      title: graph.title as string | undefined,
      notes: graph.notes as string | undefined,
    }))
}

function validateAnswerChoices(choices: unknown[]): AnswerChoice[] {
  const validLabels = ['A', 'B', 'C', 'D'] as const
  
  return choices
    .filter((choice): choice is Record<string, unknown> => 
      choice !== null && typeof choice === 'object'
    )
    .map(choice => ({
      label: validLabels.includes(choice.label as any) ? choice.label as any : 'A',
      content: typeof choice.content === 'string' ? choice.content : '',
    }))
}

function validateDiagrams(diagrams: unknown[]): DiagramData[] {
  const validTypes = ['geometry', 'coordinate-grid', 'figure', 'unknown'] as const
  
  return diagrams
    .filter((diagram): diagram is Record<string, unknown> => 
      diagram !== null && typeof diagram === 'object'
    )
    .map(diagram => ({
      type: validTypes.includes(diagram.type as any) ? diagram.type as any : 'unknown',
      description: diagram.description as string | undefined,
      labels: validateArray(diagram.labels, 'diagram.labels'),
      measurements: validateArray(diagram.measurements, 'diagram.measurements'),
    }))
}
