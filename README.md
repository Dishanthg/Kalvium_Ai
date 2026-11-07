# AI-Powered Lesson Creation Tool

A full-stack educational web application designed to synthesize lesson plans with OpenRouter web-search research and dual independent quality-control (QC) audits.

---

## 1. Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React icons, JSZip.
- **Backend**: Node.js, Express, TSX.
- **AI Engine**: OpenRouter Chat Completions API using its free-model router and web-search server tool.
- **Build & Dev Tooling**: Vite 8, Tailwind CSS Vite plugin, TypeScript 7.

---

## 2. Setup & Local Development Instructions

### Prerequisites
- Node.js (version 20 or higher recommended)
- An OpenRouter API key from [OpenRouter](https://openrouter.ai/keys)

### Installation
1. Clone the repository and navigate into the workspace directory:
   ```bash
   https://github.com/Dishanthg/Kalvium_Ai.git
   cd /path/Kalvium_Ai.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the OpenRouter API key:
   Copy `.env.example` to `.env.local` and replace its placeholder with your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```
   `.env.local` is ignored by Git. The key is read by the Express server and is not included in the browser bundle. The app uses `openrouter/free` for model calls. OpenRouter web search is a separate service and may incur charges.
4. Run the full-stack development server:
   ```bash
   npm run dev
   ```
   The application will be running on `http://localhost:3000`.
   If port 3000 is already in use, set `PORT` before starting the server (for example, `$env:PORT=3001` in PowerShell).

5. Build for production:
   ```bash
   npm run build
   ```

---

## 3. Architecture & Key Architectural Decisions

```
[ Instructor Inputs ] -> [ Step A: Search Grounding ] -> Verified Metadata URLs
                                      |
                                      v
                          [ Step B: Structured Lesson ] (Strict 45-min Schema)
                                      |
                   +------------------+------------------+
                   |                                     |
                   v                                     v
       [ QC Layer 1: Factual ]                [ QC Layer 2: Pedagogical ]
   (Search Fact-Check & Citations)            (Objective, Timing & Scaffolding)
                   |                                     |
                   +------------------+------------------+
                                      |
                                      v
            [ Instructor Workspace: Edit / Diff Rewrite / Preview / Export ]
```

### Why These Decisions Were Made:

1. **Two-Step Generation Pipeline (Research Separation)**:
   - *Requirement*: Never combine search grounding and JSON schema mode in one prompt.
   - *Rationale*: Step A uses OpenRouter's web-search tool to retrieve source citations. Step B is a separate request that structures the lesson as JSON and cites the returned source catalog.

2. **Dual Independent QC Layers**:
   - *Layer 1 (Factual Accuracy & Technical Rigor)*: Uses web search to independently verify claims against official RFCs, technical specifications, and academic consensus.
   - *Layer 2 (Instructional Quality & Pacing)*: Audits curriculum alignment with the measurable learning objective, 45-minute budget feasibility, progressive scaffolding, worked example quality, and diagnostic question rigor.
   - *Isolation*: The two layers run with isolated prompts and schemas and do not see each other's outputs, eliminating confirmation bias.

3. **Fast Section-Level Rewrites with Diff Previews**:
   - Rather than regenerating an entire lesson when an instructor applies a QC suggestion, the app uses the configured OpenRouter free model to rewrite *only* the affected section. The instructor is presented with a side-by-side or unified diff before accepting.

4. **Fault Tolerance & Reliability**:
   - Every AI request is wrapped in retry logic with exponential backoff and timeout safeguards.
   - Each pipeline step (Research, Generate, QC1, QC2) has independent status tracking and retry capabilities, allowing failed steps to be retried without losing previously completed work.

5. **Persistence & Data Safety**:
   - All state (inputs, sources, sections, QC reports, issue statuses) is automatically synchronized to `localStorage`.
   - Instructor manual edits are protected: re-running generation triggers a confirmation warning and automatically snapshots the draft to a 5-version rollback history.

6. **Comprehensive Multi-Format Export**:
   - Instructors can export the finalized lesson, citations, and QC reports as Markdown, print-friendly HTML/PDF, and JSON, or download everything as a complete `.zip` archive via JSZip.

---

## 4. Acknowledgements

- **OpenRouter**: Routes free-model requests and provides the web-search server tool used in research and factual verification.
- **Lucide Icons**: Clean, consistent iconography across the user interface.
- **Tailwind CSS**: Modern utility-first styling.
- **JSZip**: In-browser client-side archive packaging for export bundles.
