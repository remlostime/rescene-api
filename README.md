# ReScene API

AI-powered photo environment remastering service. Upload a photo, get creative remastering suggestions, then render a new version with a transformed background while keeping the subject pixel-perfect.

Built with **Fastify + TypeScript**, deployable on **Google Cloud** or **AWS** — switchable with a single env var.

---

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Request Lifecycle](#request-lifecycle)
  - [Quick Flow (Analyze → Render)](#quick-flow-analyze--render)
  - [Chat Flow (Chat → Render)](#chat-flow-chat--render)
- [Project Structure](#project-structure)
- [Codebase Walkthrough](#codebase-walkthrough)
  - [Entry Point — `index.ts`](#entry-point--indexts)
  - [Configuration — `config/env.ts`](#configuration--configenvts)
  - [Interfaces (Contracts)](#interfaces-contracts)
  - [Service Factory — `services/factory.ts`](#service-factory--servicesfactoryts)
  - [Google Cloud Services](#google-cloud-services)
  - [AWS Services](#aws-services)
  - [Mock Services](#mock-services)
  - [Routes (API Endpoints)](#routes-api-endpoints)
  - [Prompts (AI Instructions)](#prompts-ai-instructions)
- [How Multi-Cloud DI Works](#how-multi-cloud-di-works)
- [How Structured Output Works](#how-structured-output-works)
- [Setup](#setup)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        iOS Client                            │
└─────────┬──────────────────┬──────────────────┬──────────────┘
          │ POST /api/analyze│ POST /api/chat   │ POST /api/render
          ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│                     Fastify HTTP Server                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ analyze.route│  │  chat.route  │  │ render.route │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌─────────────────────────────────────────────────────┐     │
│  │          Three Injected Service Interfaces          │     │
│  │                                                     │     │
│  │  ┌───────────────┐ ┌───────────┐ ┌──────────────┐  │     │
│  │  │IStorageService│ │IAIService │ │IImageService │  │     │
│  │  └───────┬───────┘ └─────┬─────┘ └──────┬───────┘  │     │
│  └──────────┼───────────────┼──────────────┼───────────┘     │
└─────────────┼───────────────┼──────────────┼─────────────────┘
              │               │              │
   ┌──────────▼───────────────▼──────────────▼──────────┐
   │            Service Factory (DI Switch)              │
   │                                                     │
   │  CLOUD_PROVIDER=google        CLOUD_PROVIDER=aws    │
   │  ┌─────────────────────┐  ┌──────────────────────┐  │
   │  │ GcsStorageService   │  │ S3StorageService      │  │
   │  │ VertexAIGeminiSvc   │  │ BedrockNovaService    │  │
   │  │ VertexAIImageSvc    │  │ BedrockTitanImageSvc  │  │
   │  └─────────────────────┘  └──────────────────────┘  │
   └─────────────────────────────────────────────────────┘
              │                            │
   ┌──────────▼──────────┐    ┌────────────▼────────────┐
   │   Google Cloud       │    │   AWS                   │
   │  • Cloud Storage     │    │  • S3                   │
   │  • Vertex AI (LLM)   │    │  • Bedrock Nova (LLM)  │
   │  • Vertex AI (Image) │    │  • Bedrock Titan (Img)  │
   └──────────────────────┘    └─────────────────────────┘
```

**Key design principles:**
- **Stateless** — No in-memory state between requests. Cloud storage is the only shared state (temp images).
- **Multi-cloud** — Google and AWS implementations sit behind shared interfaces; a factory picks the right set at startup.
- **Protocol-based** — Routes depend only on interfaces (`IAIService`, `IStorageService`, `IImageService`), never concrete classes.

---

## Request Lifecycle

### Quick Flow (Analyze → Render)

The happy path for the iOS app's "auto-suggest" feature:

```
1. Client sends Base64 JPEG ──► POST /api/analyze
2.   Route generates a UUID (imageId)
3.   IStorageService.uploadBase64() ──► saves to cloud as temp/{imageId}.jpg
4.   IAIService.generateRemasterOptions(storageUri) ──► AI analyzes the photo
5.   Returns imageId + 3 remastering options (title, description, nano_prompt)

6. User picks an option ──► POST /api/render
7.   Route resolves storageUri from imageId
8.   IImageService.editImage(storageUri, nano_prompt) ──► AI generates new image
9.   IStorageService.uploadBuffer() ──► saves result as output/{resultId}.jpg
10.  Returns the public HTTPS URL of the rendered image
```

### Chat Flow (Chat → Render)

A conversational alternative where the user describes their vision:

```
1. Client sends message + history ──► POST /api/chat
2.   Route resolves storageUri from imageId
3.   IAIService.chatWithAgent(storageUri, message, history) ──► AI Director
4.   AI either:
       a. Asks a clarifying question ──► returns { type: "chat_reply" }
       b. Produces a proposal ──► returns { type: "proposal_card", proposal }
5. (Repeat until proposal is approved)

6. User approves proposal ──► POST /api/render (same as Quick Flow step 6-10)
```

> **Note:** Chat state is client-managed. The server is stateless — the client passes the full `history` array on every request.

---

## Project Structure

```
src/
├── index.ts                        # Composition root: config → DI → routes → start
├── config/
│   └── env.ts                      # Typed env config with validation
├── interfaces/
│   ├── ai-service.interface.ts     # IAIService — analyze + chat contracts
│   ├── image-service.interface.ts  # IImageService — image generation contract
│   ├── chat.types.ts               # Shared chat types (ChatMessage, Proposal, etc.)
│   └── storage-service.interface.ts# IStorageService — upload + URL resolution
├── services/
│   ├── factory.ts                  # DI factory: reads config → returns {storage, ai, image}
│   ├── google/
│   │   ├── gcs-storage.service.ts          # Google Cloud Storage
│   │   ├── vertex-ai-gemini.service.ts     # Gemini LLM (analysis + chat)
│   │   └── vertex-ai-image.service.ts      # Gemini image generation
│   ├── aws/
│   │   ├── s3-storage.service.ts           # Amazon S3
│   │   ├── bedrock-nova.service.ts         # Amazon Nova Pro (analysis + chat)
│   │   └── bedrock-titan-image.service.ts  # Titan Image Generator v2
│   └── mock/
│       ├── mock-ai.service.ts              # Canned responses for local dev
│       └── mock-image.service.ts           # Returns a 1x1 JPEG placeholder
├── routes/
│   ├── analyze.route.ts            # POST /api/analyze
│   ├── chat.route.ts               # POST /api/chat
│   └── render.route.ts             # POST /api/render
├── prompts/
│   ├── director.prompt.ts          # System prompt builder for analyze (Master Director)
│   └── chat-agent.prompt.ts        # System prompt builder for chat (Photography Director)
└── types/
    └── fastify.d.ts                # Augments FastifyInstance with our 3 services
```

---

## Codebase Walkthrough

### Entry Point — `index.ts`

The composition root. It does four things in order:

1. **Loads config** via `loadEnvConfig()` — reads `.env`, validates, returns a typed `EnvConfig`.
2. **Creates services** via `createServices(config)` — the DI factory returns the three service instances.
3. **Decorates Fastify** — attaches `storageService`, `aiService`, `imageService` to the Fastify instance so every route can access them via `fastify.storageService`, etc.
4. **Registers routes** and starts listening on the configured port.

### Configuration — `config/env.ts`

Exports:
- `CloudProvider` type — `'google' | 'aws'`
- `EnvConfig` interface — typed shape of all config values
- `loadEnvConfig()` — reads `process.env`, applies defaults, validates required fields based on the selected provider (e.g. `GCP_PROJECT_ID` is required when `CLOUD_PROVIDER=google`)

### Interfaces (Contracts)

These are the boundaries that make the codebase multi-cloud. Routes only import interfaces, never concrete service classes.

| Interface | File | Methods | Purpose |
|-----------|------|---------|---------|
| `IStorageService` | `interfaces/storage-service.interface.ts` | `uploadBase64()`, `uploadBuffer()`, `getPublicUrl()`, `getStorageUri()` | Upload images and resolve their URIs/URLs |
| `IAIService` | `interfaces/ai-service.interface.ts` | `generateRemasterOptions()`, `chatWithAgent()` | Scene analysis (returns 3 options) and multi-turn chat |
| `IImageService` | `interfaces/image-service.interface.ts` | `editImage()` | Takes a source image URI + prompt, returns a `Buffer` of the rendered image |

Supporting types in `interfaces/chat.types.ts`:
- `ChatMessage` — `{ role: 'user' | 'model', text: string }`
- `Proposal` — `{ title, description, nano_prompt }`
- `ChatRequest` / `ChatResponse` — request/response shapes for the chat endpoint

### Service Factory — `services/factory.ts`

The single place where concrete classes are selected. Logic:

```
if USE_MOCK_AI=true  → MockAIService + MockImageService + real storage for the chosen provider
if CLOUD_PROVIDER=google → GcsStorageService + VertexAIGeminiService + VertexAIImageService
if CLOUD_PROVIDER=aws    → S3StorageService  + BedrockNovaService   + BedrockTitanImageService
```

Uses dynamic `import()` so only the selected provider's SDK is loaded at runtime.

### Google Cloud Services

**`GcsStorageService`** — Wraps `@google-cloud/storage`. Uploads buffers to a GCS bucket, returns `gs://` URIs and `https://storage.googleapis.com/` public URLs.

**`VertexAIGeminiService`** — Wraps `@google-cloud/vertexai`. Implements both `IAIService` methods:
- `generateRemasterOptions()` — Sends the image (via `gs://` file URI) + the Director system prompt to Gemini. Uses `responseSchema` to enforce structured JSON output (3 options with title/description/nano_prompt).
- `chatWithAgent()` — Sends the full chat history + image to a Gemini model configured with the Chat Agent system prompt. The image is prepended to the first user message. Returns structured JSON (`chat_reply` or `proposal_card`).

**`VertexAIImageService`** — Wraps Gemini's image generation mode (`responseModalities: ['IMAGE', 'TEXT']`). Sends the source image + nano_prompt, extracts the generated image from `inlineData` in the response.

### AWS Services

**`S3StorageService`** — Wraps `@aws-sdk/client-s3`. Same interface as GCS. Returns `s3://` URIs and `https://{bucket}.s3.{region}.amazonaws.com/` public URLs. Has an extra `getObjectAsBase64()` method used internally by the Bedrock services (Bedrock requires inline Base64 image data, not URIs).

**`BedrockNovaService`** — Wraps `@aws-sdk/client-bedrock-runtime` using the Converse API. Implements both `IAIService` methods:
- `generateRemasterOptions()` — Downloads the image from S3 as Base64, sends it with the Director prompt via `ConverseCommand`. Uses **tool use** (forced tool choice) to enforce structured output — the model must call `output_remaster_options` with the correct schema.
- `chatWithAgent()` — Same pattern with `output_chat_response` tool. Maps `'model'` role to `'assistant'` for Bedrock's expected format.

**`BedrockTitanImageService`** — Wraps Bedrock's `InvokeModelCommand` for the Titan Image Generator v2. Downloads source from S3, sends an `IMAGE_VARIATION` task with the nano_prompt, returns the generated image buffer.

### Mock Services

For local development without cloud credentials (`USE_MOCK_AI=true`):

**`MockAIService`** — Returns hardcoded remastering options for `generateRemasterOptions()`. For `chatWithAgent()`, does simple keyword matching: if the message contains actionable keywords (e.g. "cyberpunk", "sunset"), returns a `proposal_card`; otherwise returns a `chat_reply` asking for more detail.

**`MockImageService`** — Returns a 1x1 JPEG placeholder buffer. Useful for testing the full request flow without hitting an image generation API.

> Mock mode still uses **real cloud storage** (GCS or S3) for the selected provider — only the AI and image generation services are mocked.

### Routes (API Endpoints)

All three routes follow the same pattern: validate input → call services via injected interfaces → return JSON.

**`analyze.route.ts`** — `POST /api/analyze`
1. Validates `imageBase64` (required), plus optional `latitude`, `longitude`, `locationName`.
2. Generates a UUID `imageId`.
3. Uploads the image to `temp/{imageId}.jpg` via `storageService.uploadBase64()`.
4. Calls `aiService.generateRemasterOptions()` with the storage URI.
5. Returns `{ status, imageId, data: { options } }`.

**`chat.route.ts`** — `POST /api/chat`
1. Validates `imageId` (UUID format), `message`, and `history` array.
2. Resolves the storage URI from the imageId (`temp/{imageId}.jpg`).
3. Calls `aiService.chatWithAgent()` with the URI, message, and history.
4. Returns `{ status, data: { type, text, proposal? } }`.

**`render.route.ts`** — `POST /api/render`
1. Validates `imageId` (UUID format) and `nano_prompt`.
2. Resolves the source URI from imageId.
3. Calls `imageService.editImage()` with the URI and prompt → gets a `Buffer`.
4. Uploads the result to `output/{resultId}.jpg`.
5. Returns `{ status, resultUrl }` with the public HTTPS URL.

### Prompts (AI Instructions)

**`director.prompt.ts`** — `buildDirectorPrompt(locationName?)` — Constructs the system prompt for the analyze endpoint. Defines the "Master Photography Post-Production Director" persona. If a `locationName` is provided and is a famous landmark, the prompt instructs the AI to propose location-inspired options. Otherwise falls back to generic "Semantic & Vibe Remastering." Always enforces the critical subject-preservation rule.

**`chat-agent.prompt.ts`** — `buildChatAgentSystemPrompt()` — Constructs the system prompt for the chat endpoint. Defines the "AI Photography Director" persona with behavior rules: ask clarifying questions for vague requests, produce a `proposal_card` when the vision is clear. Includes strict rules for nano_prompt generation and subject preservation.

---

## How Multi-Cloud DI Works

```
                        ┌──────────────┐
                        │  EnvConfig   │
                        │ cloudProvider│
                        └──────┬───────┘
                               │
                    ┌──────────▼──────────┐
                    │  createServices()   │ ← services/factory.ts
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───────┐ ┌─────▼──────┐ ┌───────▼───────┐
     │ IStorageService│ │ IAIService │ │ IImageService │
     └────────┬───────┘ └─────┬──────┘ └───────┬───────┘
              │               │                │
              ▼               ▼                ▼
     fastify.decorate()  — attached to Fastify instance
              │               │                │
              ▼               ▼                ▼
     Routes call methods on interfaces (never concrete classes)
```

1. `index.ts` calls `createServices(config)` once at startup.
2. The factory reads `config.cloudProvider` and dynamically imports only the chosen provider's modules.
3. The three service instances are attached to Fastify via `decorate()`.
4. `types/fastify.d.ts` augments `FastifyInstance` so TypeScript knows about `fastify.aiService`, etc.
5. Routes access services as `fastify.storageService`, `fastify.aiService`, `fastify.imageService`.

To add a new cloud provider (e.g. Azure), you would:
1. Create new service classes implementing the three interfaces.
2. Add a new case in the factory's `switch` statement.
3. Add the new provider value to the `CloudProvider` type.

---

## How Structured Output Works

Both AI services need to return well-typed JSON, but each cloud enforces it differently:

| Provider | Mechanism | How It Works |
|----------|-----------|-------------|
| **Google (Vertex AI)** | `responseSchema` | Pass a JSON Schema to `generationConfig.responseSchema`. Gemini is constrained to only produce JSON matching that schema. |
| **AWS (Bedrock Nova)** | Tool use (forced) | Define a tool with the desired output schema, then set `toolChoice: { tool: { name: '...' } }`. The model is forced to "call" that tool, producing structured JSON as the tool's input payload. |

This is why `BedrockNovaService` defines `remasterOptionsTool` and `chatResponseTool` — they're not real tools, just a mechanism to enforce structured output from the model.

---

## Setup

```bash
cp .env.example .env    # Copy and edit with your provider credentials
npm install
```

### Google Cloud

```env
CLOUD_PROVIDER=google
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
GCS_BUCKET_NAME=rescene-images
```

Requires Application Default Credentials:
```bash
gcloud auth application-default login
```

### AWS

```env
CLOUD_PROVIDER=aws
AWS_REGION=us-east-1
S3_BUCKET_NAME=rescene-images
BEDROCK_NOVA_MODEL=us.amazon.nova-pro-v1:0
BEDROCK_TITAN_IMAGE_MODEL=amazon.titan-image-generator-v2:0
```

Requires AWS credentials via `aws configure`, environment variables, or IAM role.

### Local Development (No Cloud AI)

```env
USE_MOCK_AI=true
```

This mocks only the AI and image generation — storage still hits the real cloud provider.

### Run

```bash
npm run dev          # Hot-reloading dev server (tsx watch)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled output
```

### Docker

```bash
docker build -t rescene-api .
docker run -p 8080:8080 --env-file .env rescene-api
```

### AWS App Runner

The project includes `apprunner.yaml` for deployment to AWS App Runner with Node.js 22 runtime.

---

## API Reference

### `GET /health`

Health check. Returns `{ "status": "ok" }`.

### `POST /api/analyze`

Upload and analyze a photo. Returns 3 creative remastering options.

**Request:**

| Field         | Type   | Required | Description                  |
|---------------|--------|----------|------------------------------|
| `imageBase64` | string | yes      | Base64-encoded JPEG image    |
| `latitude`    | number | no       | GPS latitude                 |
| `longitude`   | number | no       | GPS longitude                |
| `locationName`| string | no       | Human-readable location name |

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

### `POST /api/chat`

Multi-turn chat with the AI Photography Director.

**Request:**

| Field     | Type          | Required | Description                                |
|-----------|---------------|----------|--------------------------------------------|
| `imageId` | string (UUID) | yes      | UUID returned from `/api/analyze`          |
| `message` | string        | yes      | The user's latest message                  |
| `history` | ChatMessage[] | yes      | Full conversation history (client-managed) |

Each `ChatMessage`: `{ role: "user" | "model", text: string }`

**Response — clarifying question:**

```json
{
  "status": "success",
  "data": {
    "type": "chat_reply",
    "text": "Do you mean cyberpunk cool or vintage film cool?"
  }
}
```

**Response — ready proposal:**

```json
{
  "status": "success",
  "data": {
    "type": "proposal_card",
    "text": "Here's a proposal based on your vision:",
    "proposal": {
      "title": "Cyberpunk Neon Rain",
      "description": "Transform the photo into a cyberpunk neon rain night...",
      "nano_prompt": "Keep the foreground subject completely unchanged..."
    }
  }
}
```

### `POST /api/render`

Generate a remastered image from a previously uploaded photo.

**Request:**

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

---

## Environment Variables

| Variable                    | Default                                         | Description                          |
|-----------------------------|--------------------------------------------------|--------------------------------------|
| `CLOUD_PROVIDER`            | `google`                                         | `google` or `aws`                    |
| `PORT`                      | `8080`                                           | Server port                          |
| `USE_MOCK_AI`               | `false`                                          | Mock AI services for local dev       |
| **Google Cloud**            |                                                  |                                      |
| `GCP_PROJECT_ID`            | *(required)*                                     | Google Cloud project ID              |
| `GCP_LOCATION`              | `us-central1`                                    | Vertex AI region                     |
| `GEMINI_MODEL`              | `gemini-2.0-flash`                               | Gemini model for analysis + chat     |
| `GCS_BUCKET_NAME`           | `rescene-images`                                 | GCS bucket name                      |
| `IMAGE_GENERATION_MODEL`    | `gemini-2.0-flash-preview-image-generation`      | Gemini model for image generation    |
| **AWS**                     |                                                  |                                      |
| `AWS_REGION`                | `us-east-1`                                      | AWS region                           |
| `S3_BUCKET_NAME`            | `rescene-images`                                 | S3 bucket name                       |
| `BEDROCK_NOVA_MODEL`        | `us.amazon.nova-pro-v1:0`                        | Bedrock model for AI agent           |
| `BEDROCK_TITAN_IMAGE_MODEL` | `amazon.titan-image-generator-v2:0`              | Bedrock model for image generation   |
