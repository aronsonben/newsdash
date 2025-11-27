# NewsDash

A modern single page application built with Vite, React, and TypeScript. Powered by Google Gemini 2.0 Flash with Google Search grounding for AI-enhanced news discovery.

## Features

- Vite + React + TypeScript
- React Router for SPA routing
- ESLint + Prettier configured for TS/React
- **Google Gemini 2.0 Flash with Google Search grounding** for real-time web-grounded AI responses
- OpenRouter integration as fallback option
- Typed API client with environment-based configuration
- Minimal, clean UI with a header and chat panel

## AI Provider Setup

### Google Gemini (Recommended)

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add to `.env.local`:
   ```sh
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

The Gemini client uses the **gemini-2.0-flash-exp** model with Google Search grounding enabled, allowing it to search the web and provide up-to-date information with citations.

### OpenRouter (Optional Fallback)

If you want to use OpenRouter as a fallback:

1. Get your API key from [OpenRouter](https://openrouter.ai/)
2. Add to `.env.local`:
   ```sh
   VITE_OPENROUTER_API_KEY=your_api_key_here
   ```

The system automatically uses Gemini if configured, otherwise falls back to OpenRouter.

## Setup

### Prerequisites
- Node.js 18+
- pnpm, npm, or yarn

### Install

```sh
# using pnpm (recommended)
pnpm install

# or npm
npm install

# or yarn
yarn
```

### Environment
Copy `.env.local.example` or create `.env.local` with:

```sh
# Google Gemini API Key (get from https://aistudio.google.com/apikey)
VITE_GEMINI_API_KEY=your_gemini_api_key

# OpenRouter API Key (optional fallback)
VITE_OPENROUTER_API_KEY=your_openrouter_key

VITE_SITE_URL=http://localhost:5173
VITE_SITE_TITLE=NewsDash
```

## Run

```sh
pnpm dev
# npm run dev
# yarn dev
```

Open http://localhost:5173.

## Build & Preview

```sh
pnpm build
pnpm preview
```

## Lint & Format

```sh
pnpm lint
pnpm format
```

## API Client Architecture

The application supports multiple AI providers through a unified interface:

### Gemini Client (`src/lib/geminiClient.ts`)
- Google Gemini 2.0 Flash with Google Search grounding
- Real-time web search integration
- Extracts search queries and grounding metadata
- Configurable temperature, topP, topK parameters

### OpenRouter Client (`src/lib/openRouterClient.ts`)
- Fallback option for multiple LLM providers
- Supports OpenAI, Anthropic, and other models
- Retained for flexibility

### Unified API Client (`src/lib/apiClient.ts`)
- Auto-selects best available provider (Gemini → OpenRouter → stub)
- Manual provider selection via `provider` parameter
- Unified request/response types
- Handles API key validation and error messaging

## Project structure

- `src/main.tsx`: App bootstrapping and router
- `src/App.tsx`: Layout shell
- `src/components/Header.tsx`: Top bar
- `src/components/ChatPanel.tsx`: Simple chat UI wiring to `apiClient`
- `src/components/NewsDashboard.tsx`: News display component
- `src/lib/apiClient.ts`: Unified typed client with provider selection
- `src/lib/geminiClient.ts`: Google Gemini with Search grounding
- `src/lib/openRouterClient.ts`: OpenRouter integration (fallback)
- `vite.config.ts`, `tsconfig.json`: Build configuration
- `.eslintrc.cjs`, `.prettierrc.json`: Tooling configuration

