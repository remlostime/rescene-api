# ReScene API

AI-powered environment remastering service. A stateless, serverless-ready backend that uses Google Cloud Storage as a temporary image cache and Vertex AI for scene analysis and image generation.

## Workflow

The API supports two workflows:

### Quick Flow (Analyze → Render)

1. **Analyze** — The iOS app sends a Base64 image to `POST /api/analyze`. The server uploads it to GCS, passes the `gs://` URI to Gemini for analysis, and returns an `imageId` plus 3 creative remastering options.
2. **Render** — The user picks an option. The app sends the `imageId` and `nano_prompt` to `POST /api/render`. The server references the source image in GCS, calls Gemini 2.0 Flash for image editing, uploads the result to GCS, and returns a public HTTPS URL.

### Chat Flow (Chat → Render)

1. **Chat** — The iOS app sends a message plus the full conversation history to `POST /api/chat`. The AI Photography Director agent either asks clarifying questions (`chat_reply`) or produces a proposal card with a technical rendering prompt (`proposal_card`). The client manages chat state and passes the full history on each request.
2. **Render** — Once the user approves a proposal, the app sends the `imageId` and `nano_prompt` to `POST /api/render` as above.

## Project Structure

```
src/
├── index.ts                                # Composition root: bootstrap, DI, start server
├── config/env.ts                           # Typed environment configuration
├── interfaces/
│   ├── ai-service.interface.ts             # IAIService contract + response types
│   ├── chat.types.ts                       # Chat feature types (ChatMessage, Proposal, etc.)
│   ├── storage-service.interface.ts        # IStorageService contract (GCS)
│   └── image-service.interface.ts          # IImageService contract (Nano Banana 2)
├── services/
│   ├── vertex-ai-gemini.service.ts         # Production: Vertex AI Gemini (analysis + chat)
│   ├── vertex-ai-image.service.ts          # Production: Nano Banana 2 (image editing)
│   ├── storage.service.ts                  # Production: Google Cloud Storage
│   ├── mock-ai.service.ts                  # Local dev: mock analysis + chat responses
│   └── mock-image.service.ts               # Local dev: mock image generation
├── routes/
│   ├── analyze.route.ts                    # POST /api/analyze — scene analysis
│   ├── chat.route.ts                       # POST /api/chat — AI director chat
│   └── render.route.ts                     # POST /api/render — image generation
├── prompts/
│   ├── director.prompt.ts                  # "Master Director" prompt builder (analyze)
│   └── chat-agent.prompt.ts               # Chat agent system prompt (chat)
└── types/fastify.d.ts                      # Fastify type augmentation
```

## Architecture

- **Stateless** — No in-memory state between requests. GCS acts as the temporary file cache between the analyze and render steps.
- **Dependency Injection** via Fastify's `decorate()` pattern. Three services are injected: `aiService`, `storageService`, and `imageService`.
- **Swappable implementations**: Production services (`VertexAIGeminiService`, `VertexAIImageService`, `StorageService`) vs. mock services for local testing (controlled by `USE_MOCK_AI`).
- **Structured output**: Uses Vertex AI SDK `responseSchema` to guarantee strictly typed JSON from the analysis LLM.

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

Uploads the image to GCS, analyzes the scene with Gemini, and returns 3 remastering options.

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
  "imageId": "a1b2c3d4-...",
  "data": {
    "options": [
      {
        "title": "Cinematic Sunset",
        "description": "A warm golden hour transformation...",
        "nano_prompt": "Keep the foreground subject completely unchanged..."
      }
    ]
  }
}
```

### POST /api/chat

Multi-turn chat with the AI Photography Director agent. The agent clarifies the user's vision or produces a rendering proposal.

**Request body:**

| Field     | Type           | Required | Description                                        |
|-----------|----------------|----------|----------------------------------------------------|
| `imageId` | string         | yes      | UUID returned from `/api/analyze`                  |
| `message` | string         | yes      | The user's latest message                          |
| `history` | ChatMessage[]  | yes      | Full conversation history (client-managed)         |

Each `ChatMessage` is `{ role: "user" | "model", text: string }`.

**Response (200) — chat_reply:**

```json
{
  "status": "success",
  "data": {
    "type": "chat_reply",
    "text": "Do you mean cyberpunk cool or vintage film cool?"
  }
}
```

**Response (200) — proposal_card:**

```json
{
  "status": "success",
  "data": {
    "type": "proposal_card",
    "text": "Got it! Here's a proposal based on your vision:",
    "proposal": {
      "title": "Cyberpunk Neon Rain",
      "description": "将照片转变为充满赛博朋克风格的霓虹雨夜...",
      "nano_prompt": "Keep the foreground subject completely unchanged..."
    }
  }
}
```

### POST /api/render

Uses the previously uploaded image and a selected prompt to generate a remastered image.

**Request body:**

| Field         | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| `imageId`     | string | yes      | UUID returned from `/api/analyze`        |
| `nano_prompt` | string | yes      | The selected option's `nano_prompt` text |

**Response (200):**

```json
{
  "status": "success",
  "resultUrl": "https://storage.googleapis.com/rescene-images/output/e5f6g7h8-....jpg"
}
```

## Environment Variables

| Variable                 | Default              | Description                                 |
|--------------------------|----------------------|---------------------------------------------|
| `GCP_PROJECT_ID`         | *(required)*         | Google Cloud project ID                     |
| `GCP_LOCATION`           | `us-central1`        | Vertex AI region                            |
| `GEMINI_MODEL`           | `gemini-2.0-flash`   | Gemini model for scene analysis             |
| `GCS_BUCKET_NAME`        | `rescene-images`     | GCS bucket for temporary image storage      |
| `IMAGE_GENERATION_MODEL` | `gemini-2.0-flash-preview-image-generation`| Gemini model for image editing |
| `PORT`                   | `8080`               | Server port                                 |
| `USE_MOCK_AI`            | `false`              | Use mock services (no GCP needed)           |
