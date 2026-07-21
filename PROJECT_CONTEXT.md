# Project Context & Architecture Guide

## 1. Executive Summary & Tech Stack

- **Project Overview**: DesmosGPT is an SAT Math coaching application that uses AI to analyze math problems and generate step-by-step visual tutorials using the Desmos graphing calculator. Users paste SAT math questions, and the app provides interactive visual solutions with Desmos graph expressions.

- **Core Stack**: 
  - React 18.3.1 with TypeScript 5.7.3
  - Vite 5.4.14 for build tooling and dev server
  - Lucide React 0.468.0 for icons
  - CSS with custom styling (no CSS framework)

- **Backend & Database**: 
  - No backend server - pure client-side application
  - No database - state managed in React components
  - Provider-agnostic AI layer; **Google AI Studio (Gemini)** is the active development provider
  - Desmos Calculator API v1.11 loaded via CDN script

- **Authentication & Security**: 
  - No user authentication system
  - Provider and model configuration stored in Vite environment variables
  - No session management or access control

- **Infrastructure & Deployment**: 
  - Static site deployment capable
  - No CI/CD configured
  - No containerization (Docker)
  - Built for browser-only execution

## 2. Directory Structure & Architecture

```
DesmosGPT/
├── src/
│   ├── App.tsx              # Main application component with landing/coach views
│   ├── main.tsx             # React entry point and DOM mounting
│   ├── types.ts             # TypeScript type definitions (Tutorial, CoachStep, Bounds, DesmosCalculator)
│   ├── styles.css           # Global CSS with custom design system
│   ├── vite-env.d.ts        # Vite environment variable types
│   ├── lib/
│   │   ├── ai/              # Provider abstraction (config, types, GoogleAIProvider)
│   │   ├── analyzeQuestion.ts # Tutorial generation via AIProvider
│   │   └── techniques.ts    # Demo tutorial data, examples, and LaTeX normalization
│   └── features/
│       └── input/           # Multi-modal question composer and OCR/vision pipeline
├── index.html               # HTML entry point with Desmos API script
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration with React plugin
├── tsconfig.json            # TypeScript compiler configuration
├── tsconfig.node.json       # TypeScript config for Vite config files
├── .env.example             # Environment variable template
├── .env.local               # Local environment variables (gitignored)
├── .gitignore               # Git ignore patterns
└── dist/                    # Build output directory
```

**Architectural Pattern**: Client-side SPA with component-based architecture. Single-page application with two main views (landing and coach) managed through React state. No routing library - view switching handled by conditional rendering based on tutorial state.

## 3. Data Models & Database Schema

**Core TypeScript Types** (no database):

- **Tutorial**: Main data structure for math problem tutorials
  - `question: string` - The original SAT math question
  - `technique: string` - Name of the solving technique
  - `summary: string` - One-sentence technique summary
  - `answer: string` - Final answer
  - `time: string` - Estimated solving time (e.g., "12 sec")
  - `steps: CoachStep[]` - Array of step-by-step instructions

- **CoachStep**: Individual tutorial step
  - `id: string` - Unique identifier for the step
  - `title: string` - Step title (imperative, under 6 words)
  - `expression: string` - Valid Desmos graph string for the copy box
  - `expressions?: (string | DesmosExpression)[]` - Cumulative equations and native objects (tables) visible
  - `hint: string` - Short hint (under 9 words)
  - `why: string` - Explanation of why this step works
  - `bounds?: Bounds` - Optional graph viewport bounds

- **Bounds**: Graph viewport coordinates
  - `left: number`, `right: number`, `bottom: number`, `top: number`

- **DesmosCalculator**: Interface for Desmos API
  - `setExpression()`, `removeExpression()`, `setMathBounds()`, `destroy()`

**State Management**: React useState hooks for local component state. No global state management library. Data flows unidirectionally from parent to child components.

## 4. Feature Modules & Integrations

**Key Business Logic**:
- **Question Analysis**: AI-powered analysis through the configured provider
- **Tutorial Generation**: Structured step-by-step visual tutorials with Desmos expressions
- **Interactive Graphing**: Real-time Desmos calculator integration with step-by-step expression rendering
- **Progress Tracking**: Visual progress indicator showing completed steps
- **Expression Copying**: Clipboard integration for copying Desmos expressions

**External APIs & Services**:
- **Google AI Studio (Gemini API)**: Primary provider for question analysis and vision/OCR via `@google/generative-ai`. OpenRouter remains a documented optional future provider (not wired at runtime).
- **MathLive**: Provides the professional LaTeX math field and on-demand virtual keyboard used by the question composer.
- **Desmos Calculator API**: Loaded via CDN script (https://www.desmos.com/api/v1.11/calculator.js). Provides GraphingCalculator interface for interactive math visualization.
- **Google Fonts**: DM Mono, Manrope, and Playfair Display fonts loaded via Google Fonts CDN.

## 5. Environment & Configuration

**Required Environment Variables**:
- `VITE_AI_PROVIDER`: Provider identifier (currently `google`).
- `VITE_GOOGLE_API_KEY`: Google AI Studio API key for Gemini.
- `VITE_AI_MODEL`: Gemini model id (e.g. `gemini-2.5-flash`).

**Optional / future providers** (commented in `.env.example`, not required at runtime):
- `VITE_OPENROUTER_API_KEY`, `VITE_AI_BASE_URL` — for a future `OpenRouterProvider` re-registration.

**Essential CLI Commands**:
- `npm run dev` - Start Vite development server
- `npm run build` - Type-check and build for production (runs `tsc --noEmit && vite build`)
- `npm run preview` - Preview production build locally

**Configuration Files**:
- `vite.config.ts` - Minimal Vite config with React plugin
- `tsconfig.json` - Strict TypeScript with ES2022 target, React JSX transform
- `tsconfig.node.json` - Separate config for Vite config files

## 6. Development Conventions & Patterns

**Naming Conventions**:
- **Files**: kebab-case for config files, PascalCase for components, camelCase for utilities
- **Components**: PascalCase (App, Graph)
- **Functions/Variables**: camelCase (analyzeQuestion, normalizeLatex)
- **Types**: PascalCase (Tutorial, CoachStep, Bounds)

**Code Patterns**:
- **React Functional Components** with hooks (useState, useEffect, useRef)
- **TypeScript strict mode** enabled with no implicit any
- **Async/await** for API calls with try-catch error handling
- **Arrow functions** for callbacks and event handlers
- **Template literals** for multi-line strings (AI prompts)

**Error Handling**:
- Try-catch blocks in async functions
- Fallback to demo tutorial when API fails or key missing
- Silent failures with graceful degradation

**Styling**:
- Custom CSS with CSS custom properties
- Responsive design with media queries
- No CSS framework or utility classes
- Gradient backgrounds and glass-morphism effects

## 7. Multi-Modal Input System

The landing experience centers on a reusable question composer at `src/features/input/`. It deliberately keeps text and files in one payload so additional formats can be introduced without changing the tutorial pipeline:

```ts
interface InputPayload {
  text: string
  latex: string
  attachments: Attachment[]
}

interface Attachment {
  id: string
  type: 'image'
  file: File
  previewUrl: string
  ocrText?: string
  ocrStatus: 'idle' | 'processing' | 'complete' | 'error'
}
```

### Supported input methods

- **Rich text**: The primary textarea supports natural-language questions, standard copy/paste, and the Cmd/Ctrl+Enter submit shortcut.
- **Math editor**: `MathKeyboard.tsx` integrates MathLive rather than a custom keyboard. It opens only when the student selects Math, supports LaTeX, ASCII/plain-text export, Unicode symbols, paste, desktop/mobile virtual keyboard behavior, and common quick inserts (fractions, powers, roots, and π).
- **Images**: `ImageUploader.tsx` accepts PNG, JPG/JPEG, and WEBP through click-to-upload or drag and drop. The current UI permits one image while the attachments array keeps the model ready for multiple files.
- **Clipboard screenshots**: `MultiModalInput.tsx` listens for clipboard image files globally. A pasted screenshot creates an immediate preview; text clipboard content is appended to the editor when focus is elsewhere.

### OCR flow

1. An image attachment is created immediately with an object-URL preview and `processing` state.
2. `OCRProcessor.ts` sends the image through the configured AI provider and receives a structured vision result.
3. The extracted text is added to the editable rich-text field and retained as `attachment.ocrText`.
4. OCR errors retain the image preview and show an inline status, allowing the student to type or correct the problem manually. A Gemini key is required for automatic OCR.

### Component architecture

- `MultiModalInput.tsx`: orchestration, smart intent handling, and unified submit payload
- `MathKeyboard.tsx`: MathLive field and LaTeX/plain-text synchronization
- `ImageUploader.tsx`: format-constrained upload affordances
- `InputPreview.tsx`: attachment preview, OCR status, replace, and remove actions
- `InputToolbar.tsx`: compact editor and math shortcuts
- `OCRProcessor.ts`: isolated provider-backed vision service
- `types.ts`: attachment and payload contracts

The attachment discriminant can grow to `pdf`, `document`, `camera`, `audio`, or handwriting-derived formats. Multiple attachments, camera capture, PDF parsing, document drop, handwriting recognition, and voice input can therefore be added within this module without redesigning the surrounding application.

## 8. Vision Processing Pipeline

Vision processing is intentionally independent of any individual model vendor. All AI operations pass through the `AIProvider` contract in `src/lib/ai/types.ts`:

```ts
interface AIProvider {
  analyzeQuestion(question, systemPrompt): Promise<string>
  processImage(image, systemPrompt): Promise<VisionResult>
  checkAvailability(): Promise<ProviderHealth>
  getModelInfo(): ModelInfo
}
```

`getAIProvider()` selects the configured provider implementation. The active `GoogleAIProvider` uses the official `@google/generative-ai` SDK (text, JSON-mode structured output, and Gemini Vision). Application code calls only `AIProvider`; re-enabling OpenRouter later means adding `OpenRouterProvider` and a branch in `provider.ts`.

```
Inference (analyzeQuestion / OCRProcessor)
        ↓
   getAIProvider()
        ↓
   AIProvider interface
        ↓
   GoogleAIProvider  ←  VITE_AI_PROVIDER=google
        ↓
   Google AI Studio Gemini API
```

Startup `checkAvailability()` verifies `VITE_GOOGLE_API_KEY`, sends a text probe to the configured model, and runs a minimal vision probe so OCR failures surface as a developer warning on the landing page.

### Structured vision result

Image processing returns a typed `VisionResult`, never a bare OCR string. See Section 9 for the complete structured VisionResult interface and SAT Vision Extraction details.

The dedicated vision prompt extracts only the SAT problem. It ignores page furniture and watermarks, preserves notation and answer choices, describes visual math content in metadata, and never solves the problem.

### Lifecycle and recovery

1. Pasting, dropping, or choosing an image immediately creates an attachment preview.
2. `OCRProcessor.ts` calls `AIProvider.processImage()`, not a vendor SDK.
3. `VisionResult.questionText` populates the editable text field while the full structured result remains on the attachment.
4. A failed request leaves the preview intact and provides Retry OCR, Replace image, and manual typing as uninterrupted recovery options.
5. On application startup, `checkAvailability()` verifies configuration and the configured model; an inline developer warning appears if either is unavailable.

The attachment list and the `ImageInput` provider contract are deliberately extensible for multiple images, PDFs, camera capture, handwriting, diagrams, graphs, and tables. Adding a new attachment type or provider does not change the input or tutorial API.

## 9. SAT Vision Extraction

The Vision Pipeline has been redesigned to understand SAT Math problems as complete documents rather than performing simple OCR. The system now extracts and preserves all information required to solve the problem.

### Architecture

```
Image
    ↓
Gemini Vision
    ↓
Vision Parser
    ↓
Structured VisionResult
    ↓
Editor
    ↓
AI Tutor
```

### Structured VisionResult

The VisionResult interface provides a complete representation of an SAT Math problem:

```ts
interface VisionResult {
  questionText: string
  equations: string[]
  tables: TableData[]
  graphs: GraphData[]
  answerChoices: AnswerChoice[]
  diagrams: DiagramData[]
  detectedTopics: string[]
  confidence: number
  containsTable: boolean
  containsGraph: boolean
  containsDiagram: boolean
  containsMultipleChoice: boolean
  warnings: string[]
}
```

### Table Extraction

Tables are extracted as structured data, not descriptions:

```ts
interface TableData {
  headers: string[]
  rows: (string | number)[][]
}
```

This enables automatic population of Desmos tables.

### Graph Detection

Graphs are identified with their mathematical meaning:

```ts
interface GraphData {
  type: 'quadratic' | 'linear' | 'exponential' | 'scatter' | 'coordinate-plane' | 'unknown'
  visiblePoints?: { x: number; y: number }[]
  axisLabels?: { x?: string; y?: string }
  intercepts?: { xIntercept?: number; yIntercept?: number }
  title?: string
  notes?: string
}
```

The system captures graph type, visible points, axis labels, intercepts, and notes without attempting pixel-perfect reconstruction.

### Multiple Choice Extraction

All answer choices are preserved exactly:

```ts
interface AnswerChoice {
  label: 'A' | 'B' | 'C' | 'D'
  content: string
}
```

Equations and mathematical notation within answer choices are preserved.

### Equation Extraction

Mathematical expressions are extracted separately from normal text, using LaTeX notation for:
- Fractions
- Superscripts
- Radicals
- Absolute values
- Exponents
- Logarithms
- Inequalities

### SAT Awareness

The Vision model understands SAT formatting and ignores:
- Page numbers
- Copyright notices
- Watermarks
- Section headers
- Footers
- Navigation elements
- Decorative elements

Only content necessary to solve the problem is extracted.

### Vision Parser

The dedicated parser layer (`src/lib/vision/parser.ts`) validates and transforms Gemini JSON responses into the structured VisionResult. It includes:
- JSON parsing with markdown code block removal
- Required field validation
- Type-safe array validation
- Enum validation for graph types, diagram types, and answer choice labels
- Default value assignment for optional fields

### UI Improvements

The InputPreview component now displays structured detection results:
- "Question extracted"
- "Table detected"
- "Graph detected"
- "Diagram detected"
- "4 answer choices"
- "Confidence: 98%"

Users immediately understand what the Vision Pipeline recognized.

### Future Expansion

The VisionResult interface is designed to support future formats without API redesign:
- Handwritten work
- PDFs
- Multiple images
- Geometry figures
- Coordinate grids
- Calculator screenshots
- Scanned worksheets

### Important

The Vision Pipeline is responsible only for understanding and reconstructing the SAT problem. It does not solve the question. The Technique Engine remains responsible for deciding how to solve it.

## 10. Known Edge Cases, Quirks & Technical Debt

**Desmos API Loading**:
- Desmos Calculator API loaded via external script with polling interval (120ms) to check availability
- Race condition handled by checking `window.Desmos` existence before initialization
- Cleanup on unmount to prevent memory leaks

**API Key Handling**:
- No runtime validation of API key format
- Falls back to demo mode silently if key missing (no user feedback)
- API key exposed in client-side bundle (acceptable for this use case)

**LaTeX Normalization**:
- Simple string replacement for Unicode characters (² → ^2, − → -)
- May not handle all LaTeX edge cases
- Spaces removed from expressions for Desmos compatibility

**Type Safety**:
- Global window interface augmentation for Desmos API
- Type assertions used for environment variables (as string | undefined)
- JSON parsing without schema validation (relies on AI output consistency)

**Build Artifacts**:
- Generated vite.config.js and vite.config.d.ts ignored in git
- TypeScript build info files (*.tsbuildinfo) ignored
- dist/ directory ignored

**Performance**:
- No code splitting or lazy loading
- All icons imported from lucide-react (could optimize with tree-shaking)
- No debouncing on textarea input (acceptable for current use case)

**Desmos Expression Sync**:
- `normalizeLatex` in `techniques.ts` now returns `string | null`. Callers should use `?? fallback`.
- `analyzeQuestion.ts` validates and sanitizes AI-returned expressions before returning a Tutorial; steps with no valid expressions fall back to their primary `expression` field.
- The `Graph` component uses `GraphStateManager` (see Section 11) for all Desmos API calls.

## 11. Desmos Synchronization Architecture

### Root Cause (Fixed 2026-07-21)

Two compounding bugs caused the empty graph symptom:

1. **Silent Desmos API failures**: AI often returned LaTeX expressions containing backslashes (`\frac`, `\sqrt`) or Unicode math characters (`−` U+2212). Desmos's `setExpression` accepts these silently but renders nothing. No error was thrown.

2. **Single expression per step (Fixed)**: `CoachStep.expression` held only one expression string. Steps requiring multiple simultaneous curves had to collapse them into one broken string which Desmos rejected.

3. **LLM Mathematical Hallucination vs Desmos Math Engine**: The AI generates the `tutorial.answer` synchronously during initial analysis. Deeply complex equations or regressions evaluated flawlessly by native Desmos within the UI may contrast the AI's static generated string answer if the LLM hallucinated the algebra. UI relies on Desmos strictly for *visualizations* and the LLM strictly for *narration*.

### Graph State Manager (`src/lib/graphState.ts`)

`GraphStateManager` is the single source of truth for all Desmos API calls:

```
coaching step (index)
      ↓
GraphStateManager.syncToStep(calculator, steps, activeIndex)
      ↓ resolveExpressions() → step.expressions[] or [step.expression]
      ↓ normalizeLatex() → validates & fixes each expression (returns null if invalid)
      ↓ diff: desired IDs vs rendered IDs
      ↓ calculator.setExpression() / removeExpression() / setMathBounds()
```

**Key properties:**
- **Stable IDs**: Each expression gets a deterministic ID `${stepId}-expr-${index}`, so Desmos updates curves rather than replacing them.
- **Diff-based**: Only changed or new expressions are pushed to the API; unchanged curves are left alone.
- **Validation gate**: `normalizeLatex()` returns `null` for invalid/empty inputs; the manager skips those entries and records them in `SyncResult.skipped`.
- **Cumulative build**: Steps 0…active are all rendered simultaneously (building the graph progressively); expressions above `activeIndex` are removed.

### `CoachStep` Schema (Updated)

```ts
type CoachStep = {
  id: string
  title: string
  expression: string    // Primary expression for the copy button
  expressions?: (string | DesmosExpression)[] // ALL expressions or native objects visible at this step (cumulative)
  hint: string
  why: string
  bounds?: Bounds
}
```

When `expressions[]` is absent, the renderer falls back to `[expression]`.

### Expression Validation Chain

```
AI JSON response
      ↓ analyzeQuestion.ts → normalizeLatex() each entry, filter nulls
      ↓ demoTutorial (techniques.ts) → expressions[] hardcoded with validated strings
      ↓ GraphStateManager.syncToStep() → normalizeLatex() again (safety net)
      ↓ calculator.setExpression({ id, latex, color })
```

### Copy Box Consistency & Display formatting

The copy button writes `normalizeLatex(step.expression) ?? step.expression` — the clean string passed to Desmos.
Meanwhile, the side panel UI renders `formatForDisplay(normalizeLatex(step.expression) ?? step.expression)` through KaTeX. This ensures that Desmos syntax (e.g. `~` or `*`) is maintained accurately for clipboard copying but converts dynamically to proper LaTeX (e.g. `\sim` and `\cdot`) for aesthetic display.

### Dev Logging

When `import.meta.env.DEV` is true, the sync effect logs a grouped entry per step:
```
[DesmosGPT] Step N / M — "Step Title"
  Technique: ...
  Set IDs (N): [...]
  Removed IDs (N): [...]
  Skipped (invalid/empty) expressions: [...]
  Bounds applied: true/false
```

### Advanced API Features Supported

`GraphStateManager` dynamically routes Desmos natively.
- Fully typing `CoachStep.expressions` items with native `DesmosExpression` JSON structures enables tables (`type: 'table'`), discrete plot colors, and folder hierarchies programmatically.
- Normalization automatically recursively sanitizes latex entries even if embedded in columns of a native object.

## 12. Result Engine & Generic Answer Extraction

### Problem Statement

The Result Engine previously returned "No result computed" even when Desmos had already evaluated the final expression. For example:

```
a = 12
b = 15
a + b = 27
```

Desmos knows the answer (27), but the engine failed to detect it because it relied only on technique-specific evaluators.

### Solution: Generic Result Extractor

A new `GenericResultExtractor` module (`src/lib/result/GenericResultExtractor.ts`) inspects the entire Desmos state to find the best available computed result. This works for every technique without custom code.

### Architecture

```
ResultEngine
    ↓
GenericResultExtractor (Priority 1)
    ↓
Technique Evaluator (Priority 2)
    ↓
AI fallback (Priority 3)
```

### Extraction Pipeline

The `GenericResultExtractor` follows this priority order:

1. **Explicit evaluated scalar expression**: If the last expression produces a numeric value (e.g., `a+b`, `sqrt(17)`, `distance(A,B)`, `f(5)`, `mean(L)`), read the computed value directly from Desmos.

2. **Regression parameters**: Intercept and slope from regression expressions.

3. **Intersection points**: Coordinates from intersection expressions.

4. **Table outputs**: Values from table columns.

5. **Sliders**: Current slider values.

6. **Technique-specific evaluator**: Custom evaluators for specialized techniques.

7. **AI fallback**: If no Desmos result is available, use the AI-generated answer.

### Expression Detection

The extractor does NOT simply read the last row. It walks backward through the expression list and finds the last **visible expression that produces a value**, ignoring:

- Blank expressions
- Comments (lines starting with `#`)
- Folders
- Hidden metadata
- Helper expressions that are not final outputs
- Text notes
- Images

### Supported Result Types

The extractor understands and returns structured data for:

- **Numbers**: `{ type: "number", value: "27", expression: "a+b", source: "desmos" }`
- **Booleans**: `{ type: "boolean", value: "true", expression: "x>5", source: "desmos" }`
- **Points**: `{ type: "point", value: "(3,5)", expression: "(3,5)", source: "desmos" }`
- **Lists**: `{ type: "list", value: "[1, 2, 3]", expression: "[1,2,3]", source: "desmos" }`
- **Strings**: Text-based results
- **Unknown**: When type cannot be determined

### Implementation Details

The `GenericResultExtractor` class:

1. **Extracts state**: Uses `calculator.getState()` to get all expressions.
2. **Finds last meaningful**: Walks backward, filtering out non-meaningful expressions.
3. **Evaluates value**: Uses `calculator.HelperExpression()` to get computed numeric or list values.
4. **Infers type**: Falls back to pattern matching when HelperExpression doesn't provide a value.
5. **Returns structured result**: Provides type, value, expression, and source.

### Debug Mode

In development mode (`import.meta.env.DEV`), the extractor logs diagnostic information:

```
[GenericResultExtractor] Extraction Result
  Expressions scanned: 7
  Last evaluated expression: a+b
  Detected type: number
  Computed value: 27
  Source: Desmos
```

This makes debugging future techniques much easier.

### Result Engine Integration

The `ResultEngine` now prioritizes the generic extractor before falling back to technique-specific evaluators:

```ts
// Priority 1: Generic Result Extractor (inspects entire Desmos state)
const extracted = await genericResultExtractor.extract(calculator)
if (extracted) {
  tutorial.computedAnswer = extracted.value
  tutorial.resultSource = 'desmos'
  return
}

// Priority 2: Technique-specific evaluators
for (const evaluator of evaluators) {
  // ... existing evaluator logic
}

// Priority 3: AI fallback
tutorial.computedAnswer = tutorial.expectedAnswer || 'No result computed'
```

### Success Criteria

For the example:

```
a = 12
b = 15
a + b = 27
```

The Final Answer card now displays `27` without any AI reasoning. The Result Engine treats Desmos as the authoritative computation engine and automatically extracts the last meaningful computed result whenever possible.

### AI Fallback with Technique-Based Solving

When the Generic Result Extractor and technique-specific evaluators fail to extract a meaningful result from Desmos, the Result Engine now falls back to AI-powered solving with technique guidance.

**Enhanced Pipeline:**

```
ResultEngine
    ↓
GenericResultExtractor (Priority 1)
    ↓
Technique Evaluator (Priority 2)
    ↓
AI Fallback with Technique-Based Solving (Priority 3)
```

**AI Fallback Behavior:**

1. **Question Enhancement**: If a `VisionResult` is available with answer choices, the AI receives the question with all choices appended:
   ```
   Original question...
   
   Answer choices:
   A: [content]
   B: [content]
   C: [content]
   D: [content]
   ```

2. **Technique Integration**: The AI fallback uses the Knowledge Base to find the matching technique for the question. If found, the technique's complete knowledge (coaching steps, interpretation instructions, answer logic) is injected into the solve prompt.

3. **Structured Solving**: The AI uses a dedicated `solveSystemPrompt` that instructs it to:
   - Analyze the question carefully
   - Apply the appropriate mathematical technique
   - Solve step by step with clear reasoning
   - Compute the final numerical or symbolic answer
   - Match the computed answer to the correct choice if options are provided

4. **Answer Matching**: The AI returns a structured `SolveResult`:
   ```ts
   {
     answer: string           // Final answer (number, expression, or choice label)
     reasoning: string        // Brief explanation
     matchedChoice: 'A'|'B'|'C'|'D'|null  // Matching choice label if available
   }
   ```

5. **Result Display**: If the AI matches a choice (e.g., "B"), the Final Answer card displays "B" as the answer. Otherwise, it displays the computed numerical or symbolic answer.

**Benefits:**

- **No "No result computed"**: The AI always provides a reasoned answer when Desmos extraction fails
- **Technique Consistency**: The AI uses the same technique knowledge as the tutorial generation
- **Answer Choice Awareness**: When Vision extraction provides choices, the AI intelligently matches its computed answer to the correct option
- **Fallback Safety**: If the AI provider is not configured, the system falls back to the expected answer from the tutorial

**Implementation:**

- Added `solveQuestion()` method to `AIProvider` interface
- Added `SolveResult` type with answer, reasoning, and matchedChoice fields
- Added `solveSystemPrompt()` function in `prompts.ts` with optional technique knowledge injection
- Updated `GoogleAIProvider` to implement `solveQuestion()` with JSON parsing
- Modified `ResultEngine.compute()` to accept optional `visionResult` parameter
- Added `computeWithAI()` private method to handle AI fallback with technique integration
- Updated `App.tsx` to capture `VisionResult` from attachments and pass it to `ResultEngine`

## 13. Knowledge Base Architecture

### Overview

The Knowledge Base is a scalable architecture that separates SAT technique knowledge from application code. Techniques are stored as independent JSON files in `src/knowledge/techniques/`, each conforming to a TypeScript schema. This design allows adding new SAT topics without modifying application code.

### Architecture

```
src/knowledge/
├── schema.ts              # TypeScript schema and validators
├── index.ts               # Knowledge loader and registry
└── techniques/
    ├── quadratic-regression.json
    ├── linear-regression.json
    ├── quadratic-roots.json
    ├── systems.json
    └── function-modeling.json
```

### Schema Design

The technique schema (`src/knowledge/schema.ts`) defines a comprehensive structure for SAT techniques:

**Core Fields:**
- `metadata`: ID, version, author, tags
- `title`: Human-readable technique name
- `description`: What the technique does
- `satTopic`: Primary SAT topic (e.g., "Algebra: Functions")
- `subTopics`: Optional related topics
- `triggerKeywords`: Keywords for automatic matching
- `whenToUse`: Guidance on when to apply this technique

**Desmos Integration:**
- `requiredDesmosActions`: Array of Desmos action objects (type, description, syntax, example)
- `expectedDesmosOutputs`: Array of expected outputs with interpretation guidance

**AI Guidance:**
- `interpretationInstructions`: How to interpret Desmos results
- `answerLogic`: How to derive the final answer
- `coachingSteps`: Step-by-step coaching instructions

**Learning Support:**
- `commonMistakes`: Typical student errors
- `confidenceHints`: Validation cues for students

**Optional Extensions:**
- `examples`: Sample problems
- `prerequisites`: Required knowledge
- `relatedTechniques`: Links to other techniques
- `difficulty`: Beginner/intermediate/advanced
- `estimatedTime`: Expected solving time

### Loader Design

The knowledge loader (`src/knowledge/index.ts`) uses Vite's `import.meta.glob` to automatically discover and load all JSON files:

```ts
const techniqueModules = import.meta.glob('./techniques/*.json', { as: 'raw' })
```

**Initialization Flow:**
1. `initializeKnowledgeBase()` is called at app startup (in `main.tsx`)
2. Loader asynchronously imports all JSON files
3. Each file is parsed and validated against the schema
4. Valid techniques are registered in multiple indexes:
   - By ID (exact lookup)
   - By SAT topic (categorical lookup)
   - By tags (tag-based lookup)
   - By subtopics (granular lookup)

**Validation:**
- Schema validation ensures all required fields are present
- Type guards validate nested structures (DesmosAction, DesmosOutput)
- Invalid files log errors without crashing the app
- Development mode logs successful loads and validation failures

### Registry Behavior

The `KnowledgeRegistry` class provides:

**Lookup Methods:**
- `getById(id)`: Exact ID lookup
- `getByTopic(topic)`: All techniques for a SAT topic
- `getByTag(tag)`: All techniques with a specific tag
- `searchByKeywords(keywords)`: Fuzzy matching against trigger keywords

**Search Algorithm:**
- Extracts words from the question
- Normalizes to lowercase
- Matches against technique trigger keywords
- Scores by keyword overlap count
- Returns highest-scoring technique

**Utility Methods:**
- `getAll()`: All registered techniques
- `getAllTopics()`: All unique SAT topics
- `getAllTags()`: All unique tags
- `isReady()`: Registry initialization status
- `count()`: Number of loaded techniques

### Adding New Techniques

To add a new SAT technique:

1. **Create a new JSON file** in `src/knowledge/techniques/`:
   - Use kebab-case naming (e.g., `circle-equations.json`)
   - Follow the schema structure exactly
   - Include all required fields

2. **Populate the technique data**:
   - Define metadata (id, version, tags)
   - Write clear title and description
   - Specify SAT topic and subtopics
   - List trigger keywords for matching
   - Document when to use the technique
   - Specify required Desmos actions with syntax
   - Define expected outputs and interpretations
   - Write interpretation instructions and answer logic
   - Create coaching steps with hints and explanations
   - List common mistakes and confidence hints

3. **No code changes required**:
   - The loader automatically discovers new files
   - Validation happens at runtime
   - Registry indexes are updated automatically
   - AI can immediately use the new technique

**Example technique file:**
```json
{
  "metadata": {
    "id": "circle-equations",
    "version": "1.0.0",
    "tags": ["circle", "geometry", "radius"]
  },
  "title": "Circle Equations",
  "description": "Find the equation of a circle given center and radius.",
  "satTopic": "Geometry: Circles",
  "triggerKeywords": ["circle", "radius", "center", "equation"],
  "whenToUse": "When given center (h, k) and radius r.",
  "requiredDesmosActions": [...],
  "expectedDesmosOutputs": [...],
  "interpretationInstructions": "...",
  "answerLogic": "...",
  "coachingSteps": [...],
  "commonMistakes": [...],
  "confidenceHints": [...]
}
```

### AI Consumption

The AI pipeline (`src/lib/analyzeQuestion.ts`) now uses the Knowledge Base:

**Flow:**
1. User submits a question
2. `findMatchingTechnique(question)` searches the registry
3. If a match is found, `formatTechniqueForPrompt()` converts it to a structured prompt
4. The technique knowledge is injected into the AI system prompt
5. AI follows the technique blueprint (coaching steps, interpretation, answer logic)
6. If no match is found, AI uses the general prompt

**Prompt Enhancement:**
The technique knowledge is formatted as a structured section:
```
TECHNIQUE: [title]
SAT Topic: [topic]
DESCRIPTION: [description]
WHEN TO USE: [when to use]
REQUIRED DESMOS ACTIONS: [list]
EXPECTED DESMOS OUTPUTS: [list]
INTERPRETATION INSTRUCTIONS: [instructions]
ANSWER LOGIC: [logic]
COACHING STEPS: [steps with hints and why]
COMMON MISTAKES: [list]
CONFIDENCE HINTS: [list]
```

The AI is instructed to use this knowledge as its authoritative guide.

**Benefits:**
- Techniques become the single source of truth
- AI behavior is consistent and predictable
- Adding techniques doesn't require prompt engineering
- Knowledge is versioned and maintainable
- Non-technical users can add techniques via JSON

### Future-Proofing

The architecture supports dozens of techniques without code changes:

- **Scalable registry**: O(1) lookups by ID, O(n) by topic/tag
- **Flexible schema**: Extensible via optional fields
- **Auto-discovery**: New files work immediately
- **Validation**: Catches errors at runtime
- **Search**: Fuzzy matching handles variations
- **Modular**: Each technique is independent

**Adding a new technique requires only:**
1. Creating a JSON file in `src/knowledge/techniques/`
2. No edits to application code
3. No prompt engineering
4. No registry updates

### Development Mode

In development (`import.meta.env.DEV`), the loader logs:
- Successful technique loads with ID and title
- Validation failures with file path
- Registry initialization count
- Which technique is being used for a question
- When no matching technique is found

This aids debugging and technique development.

