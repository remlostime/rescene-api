# ReScene API

AI-powered environment remastering service. Receives a photo and optional location from an iOS client, uses a Vision LLM to analyze the scene, and returns 3 creative "environment remastering" script options.

## Project Structure

```
src/
├── index.ts                          # Composition root: bootstrap, DI, start server
├── config/env.ts                     # Typed environment configuration
├── interfaces/ai-service.interface.ts # IAIService contract + response types
├── services/
│   ├── vertex-ai-gemini.service.ts   # Production: Vertex AI Gemini implementation
│   └── mock-ai.service.ts            # Local dev: hardcoded mock responses
├── routes/analyze.route.ts           # POST /api/analyze — Fastify route plugin
├── prompts/director.prompt.ts        # "Master Director" prompt builder
└── types/fastify.d.ts                # Fastify type augmentation
```

## Architecture

- **Dependency Injection** via Fastify's `decorate()` pattern. The `IAIService` is instantiated once in `src/index.ts` and injected into route handlers.
- **Swappable implementations**: `VertexAIGeminiService` for production, `MockAIService` for local testing (controlled by `USE_MOCK_AI` env var).
- **Structured output**: Uses Vertex AI SDK `responseSchema` to guarantee strictly typed JSON from the LLM.

## Setup

```bash
cp .env.example .env
# Edit .env with your GCP_PROJECT_ID (or set USE_MOCK_AI=true for local dev)
npm install
```

## Development

```bash
npm run dev          # tsx watch — hot-reloading dev server
```

## Production Build

```bash
npm run build        # tsc → dist/
npm start            # node dist/index.js
```

## Docker

```bash
docker build -t rescene-api .
docker run -p 8080:8080 --env-file .env rescene-api
```

## API

### POST /api/analyze

**Request body:**

| Field         | Type   | Required | Description                     |
|---------------|--------|----------|---------------------------------|
| `imageBase64` | string | yes      | Base64-encoded image (JPEG)     |
| `latitude`    | number | no       | GPS latitude                    |
| `longitude`   | number | no       | GPS longitude                   |
| `locationName`| string | no       | Human-readable location name    |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "options": [
      {
        "title": "Cinematic Sunset",
        "description": "为场景打造温暖的黄金时刻氛围...",
        "nano_prompt": "Keep the foreground subject completely unchanged..."
      }
    ]
  }
}
```

## Environment Variables

| Variable         | Default            | Description                          |
|------------------|--------------------|--------------------------------------|
| `GCP_PROJECT_ID` | *(required)*       | Google Cloud project ID              |
| `GCP_LOCATION`   | `us-central1`      | Vertex AI region                     |
| `GEMINI_MODEL`   | `gemini-2.0-flash` | Gemini model name                    |
| `PORT`           | `8080`             | Server port                          |
| `USE_MOCK_AI`    | `false`            | Use MockAIService (no GCP needed)    |
