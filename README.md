# DesmosGPT

An AI-powered SAT Math coaching application that transforms how students learn and solve math problems. Paste any SAT math question, and get interactive, step-by-step visual tutorials powered by the Desmos graphing calculator.

## 🎯 What It Does

DesmosGPT helps SAT students master math problems through:

- **AI Analysis**: Understands your math question using advanced AI (Google Gemini)
- **Visual Learning**: Generates interactive Desmos graph expressions that bring problems to life
- **Step-by-Step Coaching**: Breaks down solutions into clear, actionable steps
- **Multi-Modal Input**: Type questions, use a math editor, paste screenshots, or upload images
- **Smart OCR**: Automatically extracts math problems from images using vision AI

## 🛠 Tech Stack

### Frontend
- **React 18.3.1** with TypeScript 5.7.3 - Modern, type-safe UI
- **Vite 5.4.14** - Lightning-fast build tooling and dev server
- **Lucide React 0.468.0** - Beautiful, consistent icons
- **Custom CSS** - Tailored design system with glass-morphism effects

### AI & Math
- **Google AI Studio (Gemini)** - Primary AI provider for question analysis and vision/OCR
- **Desmos Calculator API v1.11** - Interactive graphing calculator loaded via CDN
- **MathLive** - Professional LaTeX math field with virtual keyboard

### Architecture
- **Pure Client-Side** - No backend server, runs entirely in the browser
- **No Database** - State managed in React components
- **Static Site Ready** - Easy deployment to any static hosting platform

## 🧠 How It Works

### 1. Question Input
Students can input math problems multiple ways:
- **Rich Text Editor**: Type natural language questions with keyboard shortcuts
- **Math Keyboard**: Professional LaTeX editor with virtual keyboard for complex equations
- **Image Upload**: Drag & drop or click to upload problem images (PNG, JPG, WEBP)
- **Clipboard Screenshots**: Paste screenshots directly into the app

### 2. Vision Processing (OCR)
When an image is uploaded:
- The AI analyzes the image to extract the math problem
- It understands SAT formatting and ignores page numbers, watermarks, and decorations
- Extracts equations, tables, graphs, diagrams, and answer choices
- Converts everything to editable text with LaTeX notation

### 3. AI Analysis
The AI analyzes the question using:
- **Knowledge Base Matching**: Searches a growing library of SAT techniques
- **Technique Selection**: Identifies the best solving approach (e.g., quadratic regression, systems of equations)
- **Tutorial Generation**: Creates step-by-step instructions with Desmos expressions

### 4. Interactive Visualization
- Each step renders Desmos graph expressions progressively
- Students see the graph build up as they advance through steps
- Expressions are validated and normalized for Desmos compatibility
- Copy buttons let students paste expressions into Desmos directly

### 5. Result Extraction
The app automatically extracts the final answer:
- **Generic Result Extractor**: Inspects Desmos state to find computed values
- **Technique-Specific Evaluators**: Custom logic for specialized techniques
- **AI Fallback**: Uses AI-generated answer when needed

## ✨ Key Features

### Multi-Modal Input System
- Unified composer for text, LaTeX math, and images
- Smart clipboard handling for screenshots
- MathLive integration for professional equation editing
- Drag-and-drop image upload with preview

### Vision Pipeline
- Structured extraction of SAT problems from images
- Table, graph, and diagram detection
- Multiple choice answer preservation
- Confidence scoring and error recovery

### Knowledge Base
- **Growing Library**: SAT techniques stored as JSON files in `src/knowledge/techniques/`
- **Schema-Driven**: Each technique follows a standardized structure
- **Auto-Discovery**: New techniques are automatically loaded at startup
- **AI Integration**: Techniques guide AI behavior for consistent, expert coaching
- **Extensible**: Add new techniques without code changes

### Graph State Management
- **Stable Expression IDs**: Prevents unnecessary re-renders
- **Diff-Based Updates**: Only changes what's needed
- **Validation Gate**: Filters invalid expressions before sending to Desmos
- **Cumulative Rendering**: Builds graphs progressively through steps

### Result Engine
- **Priority System**: Generic extractor → Technique evaluators → AI fallback
- **Type Detection**: Numbers, booleans, points, lists, strings
- **Desmos Authority**: Treats Desmos as the primary computation engine
- **Debug Mode**: Detailed logging for development

## 📚 Knowledge Base (Growing & In Progress)

The Knowledge Base is a scalable architecture that separates SAT technique knowledge from application code. It's currently in active development and continuously expanding.

### Current Techniques
- Quadratic Regression
- Linear Regression
- Quadratic Roots
- Systems of Equations
- Function Modeling

### Technique Schema
Each technique includes:
- Metadata (ID, version, tags)
- SAT topic classification
- Trigger keywords for automatic matching
- Required Desmos actions with syntax
- Expected outputs and interpretations
- Step-by-step coaching instructions
- Common mistakes and confidence hints

### Adding New Techniques
To add a new SAT technique:
1. Create a JSON file in `src/knowledge/techniques/`
2. Follow the schema structure
3. The loader automatically discovers and validates it
4. AI can immediately use the new technique

**Status**: The knowledge base is actively growing. We're continuously adding new SAT topics and techniques to cover more problem types.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Google AI Studio API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/DesmosGPT.git
cd DesmosGPT
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Google AI API key:
```
VITE_AI_PROVIDER=google
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_AI_MODEL=gemini-2.5-flash
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for static deployment.

## 📁 Project Structure

```
DesmosGPT/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # React entry point
│   ├── types.ts             # TypeScript type definitions
│   ├── styles.css           # Global CSS
│   ├── lib/
│   │   ├── ai/              # AI provider abstraction
│   │   ├── analyzeQuestion.ts # Tutorial generation
│   │   ├── graphState.ts    # Desmos state management
│   │   ├── result/          # Result extraction engine
│   │   ├── vision/          # Vision processing pipeline
│   │   └── techniques.ts    # Demo data and LaTeX utilities
│   ├── knowledge/           # Knowledge base (growing)
│   │   ├── schema.ts        # Technique schema
│   │   ├── index.ts         # Knowledge loader
│   │   └── techniques/      # JSON technique files
│   └── features/
│       └── input/           # Multi-modal input system
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript configuration
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Conventions

- **Files**: kebab-case for config, PascalCase for components, camelCase for utilities
- **Components**: PascalCase (App, Graph)
- **Functions/Variables**: camelCase (analyzeQuestion, normalizeLatex)
- **Types**: PascalCase (Tutorial, CoachStep, Bounds)

### Error Handling

- Try-catch blocks in async functions
- Fallback to demo tutorial when API fails
- Graceful degradation with silent failures

## 🌟 Future Enhancements

- [ ] More SAT techniques in the knowledge base
- [ ] PDF document support
- [ ] Handwriting recognition
- [ ] Camera capture for mobile
- [ ] Voice input for questions
- [ ] Multiple image support
- [ ] User authentication and progress tracking
- [ ] Technique difficulty ratings
- [ ] Practice problem generator

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Areas where help is especially appreciated:

- Adding new SAT techniques to the knowledge base
- Improving OCR accuracy for specific problem types
- Enhancing the math editor
- Adding new visualization features
- Bug fixes and performance improvements

## 📧 Support

For questions, issues, or suggestions, please open an issue on GitHub.

---

Built with ❤️ for SAT students everywhere
