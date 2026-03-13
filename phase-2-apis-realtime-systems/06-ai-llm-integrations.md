# AI & LLM Integrations - Interview Q&A

## Table of Contents
1. [Integrating LLM APIs](#integrating-llm-apis)
2. [Streaming Responses (SSE)](#streaming-responses-sse)
3. [Vector Databases & Retrieval Augmented Generation (RAG)](#vector-databases--retrieval-augmented-generation-rag)

---

## Integrating LLM APIs

### Q1: How do you design an API that integrates with third-party LLMs (like OpenAI) effectively?

**Answer:**
Integrating LLMs involves handling high latency, token management, and structured outputs.

**Best Practices:**
1. **Never block the main thread:** LLM calls can take several seconds. Always handle them asynchronously. Use background jobs (e.g., BullMQ) if the user doesn't need the result immediately.
2. **Handle Rate Limiting and Retries:** Use exponential backoff for `429 Too Many Requests` errors from LLM providers.
3. **Structured Output:** Enforce JSON responses using Provider features (e.g., OpenAI's `response_format: { type: "json_object" }` or Function Calling) instead of parsing raw text.
4. **Token Management & Cost Tracking:** Always track the `usage` object in the LLM response to monitor costs. Implement rate limiting on your end per user.

```typescript
import { InitializedService } from '@nestjs/common';
import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LlmService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(LlmService.name);

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generateUserProfile(userData: any): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Output JSON.' },
          { role: 'user', content: `Generate a profile for: ${JSON.stringify(userData)}` }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      });

      // Track usage for billing/monitoring
      this.logger.log(`Tokens used: ${response.usage?.total_tokens}`);
      
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      this.logger.error('LLM generation failed', error);
      throw error; // Handle appropriately based on error type (RateLimitError, APIError, etc.)
    }
  }
}
```

---

## Streaming Responses (SSE)

### Q2: Why and how do you implement streaming for LLM responses in a Node.js API?

**Answer:**
Since LLM generation is slow, waiting for the entire response degrades UX. We use Server-Sent Events (SSE) to stream tokens to the client as they are generated.

SSE is a unidirectional web standard over HTTP where the server pushes updates to the client.

```typescript
// NestJS Controller using SSE

import { Controller, Sse, MessageEvent, Post, Body } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LlmService } from './llm.service';

@Controller('ai')
export class AiController {
  constructor(private readonly llmService: LlmService) {}

  @Sse('chat/stream')
  streamChat(@Body('prompt') prompt: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      this.llmService.streamCompletion(prompt, (chunk) => {
        subscriber.next({ data: chunk }); // Send SSE message
      }).then(() => {
        subscriber.complete(); // Close the stream when done
      }).catch((err) => {
        subscriber.error(err);
      });
    });
  }
}

// In LlmService.ts
async streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
  const stream = await this.openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    stream: true, // Enable streaming
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      onChunk(content);
    }
  }
}
```

**Client-side consumption:**
Clients consume this using the standard `EventSource` API or `fetch` with stream reading.

---

## Vector Databases & Retrieval Augmented Generation (RAG)

### Q3: Explain RAG architecture and the role of Vector Databases.

**Answer:**
RAG (Retrieval-Augmented Generation) is a technique to ground LLM responses in specific, private, or up-to-date knowledge bases without retraining the model.

**The Workflow:**
1. **Ingestion (Prep):**
   - Take your documents (PDFs, Wiki, DB records).
   - Chunk them into smaller pieces.
   - Pass chunks through an Embedding Model (e.g., `text-embedding-3-small`) to convert text into fixed-length arrays of float numbers (vectors).
   - Store these vectors + metadata in a Vector Database (e.g., pgvector, Pinecone, Qdrant).
2. **Retrieval (Runtime):**
   - User submits a query.
   - Embed the user query using the *same* Embedding Model.
   - Perform a "Similarity Search" (usually Cosine Similarity or L2 distance) in the Vector DB to find the 'Top K' most relevant chunks.
3. **Generation:**
   - Inject the retrieved text chunks into the prompt context.
   - Ask the LLM to answer the user's query *based purely on the provided context*.

**PostgreSQL `pgvector` Example:**
Postgres with the `pgvector` extension is highly popular as it avoids adding a new standalone DB to your stack.

```sql
-- Create vector extension
CREATE EXTENSION vector;

-- Create table to hold embeddings
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  content text NOT NULL,
  embedding vector(1536) -- OpenAI embeddings are 1536 dims
);

-- Indexing for fast similarity search (HNSW or IVFFlat)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Query to find closest matches
SELECT id, content, 1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]' -- cosine distance operator
LIMIT 5;
```
