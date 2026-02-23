# Medical Affairs Research Assistant (MA-FARS)

An autonomous research system for Medical Affairs, inspired by Analemma's FARS. Combines PubMed search with Venice AI for automated medical literature research, synthesis, and output generation.

## Features

- **PubMed Integration**: Search and retrieve medical literature programmatically
- **Venice AI Synthesis**: Use Venice API for GenAI-powered analysis and writing
- **Multiple Output Formats**: Generate reports, papers, slides, KOL briefings, medical information responses
- **CLI & Interactive Modes**: Use via command line or interactive prompt

## Installation

```bash
cd projects/MAResearchAssistant
npm install
```

## Configuration

Create a `.env` file:

```env
# Venice AI API Key
VENICE_INFERENCE_KEY=your_venice_api_key_here

# Optional: Custom output directory
OUTPUT_DIR=./output
```

Get your Venice API key from https://venice.ai

## Usage

### Command Line

```bash
# Quick PubMed search
node src/cli.js search "GLP-1 agonist diabetes"

# Get abstract by PMID
node src/cli.js abstract 38127654

# Full research with summary
node src/cli.js research "semaglutide cardiovascular outcomes"

# Generate research paper
node src/cli.js paper "CAR-T cell therapy lymphoma"

# Generate PowerPoint slides
node src/cli.js slides "PD-1 inhibitor melanoma"

# Generate KOL briefing
node src/cli.js kol "BTK inhibitor multiple sclerosis"

# Competitive analysis
node src/cli.js competitive "GLP-1 agonist"

# With options
node src/cli.js research "immunotherapy cancer" --clinical --recent 3 --max 20
```

### Interactive Mode

```bash
node src/agent.js
```

Then type queries directly.

### As a Module

```javascript
const MAResearchAgent = require("./src/agent");

const agent = new MAResearchAgent({
  veniceApiKey: "your_api_key",
  outputDir: "./output"
});

// Run research
const result = await agent.research(
  "semaglutide weight loss",
  "summary",
  { maxResults: 15 }
);

console.log(result.summary);
console.log(result.outputPath);
```

## Options

| Option | Description |
|--------|-------------|
| `--clinical` | Filter to clinical trials only |
| `--recent N` | Search last N years |
| `--max N` | Maximum results (default 15) |
| `--focus areas` | Focus areas for synthesis |

## Output Formats

- **Report** (`.md`): Markdown report with summary and citations
- **Paper** (`.md`): Full literature review paper structure
- **Slides** (`.pptx` or `.txt`): PowerPoint or text slides
- **KOL Briefing**: Key Opinion Leader briefing document
- **MI Response**: Medical Information response draft

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              MA Research Assistant                  │
├─────────────────────────────────────────────────────┤
│  Input: Query + Task Type                           │
├─────────────────────────────────────────────────────┤
│  1. PubMed Client                                   │
│     - Search: esearch + esummary                    │
│     - Abstracts: efetch                             │
├─────────────────────────────────────────────────────┤
│  2. Venice Client                                   │
│     - Summarization                                 │
│     - Abstract generation                           │
│     - Paper section writing                         │
│     - KOL briefing                                  │
├─────────────────────────────────────────────────────┤
│  3. Output Generator                                │
│     - Reports, Papers, Slides, MI responses        │
└─────────────────────────────────────────────────────┘
```

## Requirements

- Node.js 18+
- Venice API key
- Internet connection (for PubMed API)

## License

MIT

## Author

Vivek Gates (@vivgatesAI)