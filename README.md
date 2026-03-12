# ReScene API

AI-powered environment remastering service. A stateless, serverless-ready backend that supports both **Google Cloud** and **AWS** as interchangeable cloud providers, controlled by a single `CLOUD_PROVIDER` environment variable.

## Workflow

The API supports two workflows:

### Quick Flow (Analyze → Render)

1. **Analyze** — The iOS app sends a Base64 image to `POST /api/analyze`. The server uploads it to cloud storage, passes the URI to the AI service for analysis, and returns an `imageId` plus 3 creative remastering options.
2. **Render** — The user picks an option. The app sends the `imageId` and `nano_prompt` to `POST /api/render`. The server references the source image in storage, calls the image generation service, uploads the result, and returns a public HTTPS URL.

### Chat Flow (Chat → Render)

1. **Chat** — The iOS app sends a message plus the full conversation history to `POST /api/chat`. The AI Photography Director agent either asks clarifying questions (`chat_reply`) or produces a proposal card with a technical rendering prompt (`proposal_card`). The client manages chat state and passes the full history on each request.
2. **Render** — Once the user approves a proposal, the app sends the `imageId` and `nano_prompt` to `POST /api/render` as above.

## Cloud Provider Architecture

The backend uses a Dependency Injection factory pattern to switch between cloud providers. All route handlers are completely provider-agnostic — they interact only with the `IAIService`, `IImageService`, and `IStorageService` interfaces.

| Capability | Google Cloud | AWS |
|------------|-------------|-----|
| Storage | GCS (`GcsStorageService`) | S3 (`S3StorageService`) |
| AI Agent/LLM | Gemini via Vertex AI (`VertexAIGeminiService`) | Amazon Nova Pro via Bedrock (`BedrockNovaService`) |
| Image Generation | Gemini Image via Vertex AI (`VertexAIImageService`) | Titan Image Generator v2 via Bedrock (`BedrockTitanImageService`) |

Set `CLOUD_PROVIDER=google` or `CLOUD_PROVIDER=aws` in your `.env` to switch.

## Project Structure

```
src/
├── index.ts                                    # Composition root: bootstrap, DI, start server
├── config/env.ts                               # Typed environment configuration
├── interfaces/
│   ├── ai-service.interface.ts                 # IAIService contract + response types
│   ├── chat.types.ts                           # Chat feature types (ChatMessage, Proposal, etc.)
│   ├── storage-service.interface.ts            # IStorageService contract
│   └── image-service.interface.ts              # IImageService contract
├── services/
│   ├── factory.ts                              # DI factory: createServices() switches on CLOUD_PROVIDER
│   ├── google/
│   │   ├── gcs-storage.service.ts              # Google Cloud Storage
│   │   ├── vertex-ai-gemini.service.ts         # Vertex AI Gemini (analysis + chat)
│   │   └── vertex-ai-image.service.ts          # Vertex AI image generation
│   ├── aws/
│   │   ├── s3-storage.service.ts               # Amazon S3
│   │   ├── bedrock-nova.service.ts             # Amazon Nova Pro via Bedrock (analysis + chat)
│   │   └── bedrock-titan-image.service.ts      # Titan Image Generator v2 via Bedrock
│   └── mock/
│       ├── mock-ai.service.ts                  # Local dev: mock analysis + chat responses
│       └── mock-image.service.ts               # Local dev: mock image generation
├── routes/
│   ├── analyze.route.ts                        # POST /api/analyze — scene analysis
│   ├── chat.route.ts                           # POST /api/chat — AI director chat
│   └── render.route.ts                         # POST /api/render — image generation
├── prompts/
│   ├── director.prompt.ts                      # "Master Director" prompt builder (analyze)
│   └── chat-agent.prompt.ts                    # Chat agent system prompt (chat)
└── types/fastify.d.ts                          # Fastify type augmentation
```

## Architecture

- **Stateless** — No in-memory state between requests. Cloud storage acts as the temporary file cache between the analyze and render steps.
- **Dependency Injection** via a factory pattern (`services/factory.ts`) + Fastify's `decorate()`. Three services are injected: `aiService`, `storageService`, and `imageService`.
- **Multi-cloud** — Google Cloud and AWS implementations sit behind shared interfaces. The factory reads `CLOUD_PROVIDER` and instantiates the correct set.
- **Swappable implementations**: Production services (Google or AWS) vs. mock services for local testing (controlled by `USE_MOCK_AI`).
- **Structured output**: Google uses Vertex AI SDK `responseSchema`; AWS uses Bedrock Converse API tool use to enforce structured JSON.

## Setup

```bash
cp .env.example .env
# Edit .env — set CLOUD_PROVIDER and the matching provider credentials
npm install
```

### Google Cloud Setup

```env
CLOUD_PROVIDER=google
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
GCS_BUCKET_NAME=rescene-images
```

Requires Application Default Credentials (`gcloud auth application-default login`).

### AWS Setup

```env
CLOUD_PROVIDER=aws
AWS_REGION=us-east-1
S3_BUCKET_NAME=rescene-images
BEDROCK_NOVA_MODEL=us.amazon.nova-pro-v1:0
BEDROCK_TITAN_IMAGE_MODEL=amazon.titan-image-generator-v2:0
```

Requires AWS credentials configured via `aws configure`, environment variables, or IAM role.

### Local Development (No Cloud)

```env
USE_MOCK_AI=true
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

Uploads the image to cloud storage, analyzes the scene with the AI service, and returns 3 remastering options.

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
      "description": "Transform the photo into a cyberpunk neon rain night...",
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

| Variable                  | Default              | Description                                       |
|---------------------------|----------------------|---------------------------------------------------|
| `CLOUD_PROVIDER`          | `google`             | Cloud provider: `google` or `aws`                 |
| `GCP_PROJECT_ID`          | *(required for GCP)* | Google Cloud project ID                           |
| `GCP_LOCATION`            | `us-central1`        | Vertex AI region                                  |
| `GEMINI_MODEL`            | `gemini-2.0-flash`   | Gemini model for scene analysis                   |
| `GCS_BUCKET_NAME`         | `rescene-images`     | GCS bucket for temporary image storage            |
| `IMAGE_GENERATION_MODEL`  | `gemini-2.0-flash-preview-image-generation` | Gemini model for image editing |
| `AWS_REGION`              | `us-east-1`          | AWS region (required for AWS)                     |
| `S3_BUCKET_NAME`          | `rescene-images`     | S3 bucket for temporary image storage             |
| `BEDROCK_NOVA_MODEL`      | `us.amazon.nova-pro-v1:0` | Bedrock model ID for AI agent               |
| `BEDROCK_TITAN_IMAGE_MODEL` | `amazon.titan-image-generator-v2:0` | Bedrock model ID for image gen |
| `PORT`                    | `8080`               | Server port                                       |
| `USE_MOCK_AI`             | `false`              | Use mock AI services (no cloud credentials needed)|
