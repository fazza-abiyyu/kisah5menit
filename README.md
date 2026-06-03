# Kisah 5 Menit

**Short stories, generated in 5 minutes.** An open-source web application that creates and serves bite-sized Indonesian short stories powered by AI.

## Overview

Kisah 5 Menit is a static site generator (SSG) that produces beautifully crafted short stories in Bahasa Indonesia. Each story is designed to be read in approximately 5 minutes — perfect for a quick literary escape during your coffee break or commute.

## Key Advantages

### Zero Cost to Run
**No API key required.** Kisah 5 Menit uses [Pollinations.ai](https://pollinations.ai) as its primary text generation provider — a completely free, open AI API that requires no authentication or billing setup. Just `npm install && npm run agent` and it works out of the box. Google Gemini is supported as an optional primary provider if you choose to supply an API key, but the entire pipeline runs at **$0/month** by default.

### Smart AI Fallback Chain
When one model fails, the system automatically falls back through a resilient chain:

```
Gemini SDK (optional)
  → Pollinations.ai (Gemini / Gemini-Search)
    → Pollinations.ai (GPT, Mistral, DeepSeek, Qwen, Llama, ...)
```

Each model has **health tracking** with automatic blacklisting — models that fail consecutively are temporarily removed from the pool (3-day cooldown after 3 failures) and automatically re-enabled once they recover. This means the story generator keeps running even when individual providers are down or rate-limited.

## Features

- **AI-Powered Story Generation** — Stories are automatically generated using multiple AI providers with intelligent fallback
- **Static Site Generation (SSG)** — Pre-rendered HTML pages for fast loading and easy hosting
- **Express.js API Backend** — RESTful API with rate limiting for story generation
- **Sitemap Support** — Auto-generated sitemaps for stories and pages
- **Vercel-Ready Deployment** — Configured for seamless deployment on Vercel
- **Daily Story Automation** — GitHub Actions workflow for scheduled daily story generation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Server | Express.js |
| AI | Google GenAI / OpenAI |
| SSG | Custom build script (`tsx`) |
| Deployment | Vercel |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/<your-username>/kisah5menit.git
cd kisah5menit
npm install
```

### Development

```bash
# Start development server
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Generate static site
npm run build:ssg

# Run AI agent for story generation
npm run agent
```

## Project Structure

```
kisah5menit/
├── api/              # API routes & sitemap generators
├── public/
│   ├── pages/        # Generated static HTML story pages
│   └── index.html    # Landing page
├── src/              # Source code (TypeScript)
├── .github/workflows/ # CI/CD pipelines
├── vercel.json       # Vercel deployment config
└── package.json
```

## Open Source License

This project is **open source** and available under the **ISC License**. You are free to use, modify, and distribute this software.

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.
