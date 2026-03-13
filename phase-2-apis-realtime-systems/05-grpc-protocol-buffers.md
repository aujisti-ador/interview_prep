# gRPC & Protocol Buffers — Interview Preparation Guide

## Table of Contents
1. [What is gRPC and Why Use It?](#q1-what-is-grpc-and-why-use-it)
2. [Protocol Buffers (Protobuf) Deep Dive](#q2-protocol-buffers-protobuf-deep-dive)
3. [Protobuf Schema Evolution & Compatibility](#q3-protobuf-schema-evolution--compatibility)
4. [gRPC Communication Patterns](#q4-grpc-communication-patterns)
5. [gRPC in NestJS](#q5-grpc-in-nestjs)
6. [gRPC Error Handling](#q6-grpc-error-handling)
7. [gRPC Authentication & Security](#q7-grpc-authentication--security)
8. [gRPC Performance & Optimization](#q8-grpc-performance--optimization)
9. [gRPC-Web for Browser Clients](#q9-grpc-web-for-browser-clients)
10. [gRPC in Microservices Architecture](#q10-grpc-in-microservices-architecture)
11. [gRPC vs REST — Interview Decision Framework](#q11-grpc-vs-rest--interview-decision-framework)
12. [Quick Reference](#quick-reference)

---

## Q1: What is gRPC and Why Use It?

### Q: Explain what gRPC is and why you would choose it over REST for microservice communication.

**Answer:**

gRPC (gRPC Remote Procedure Call) is a high-performance, open-source RPC framework originally developed by Google. It uses HTTP/2 for transport, Protocol Buffers as the interface description language and serialization format, and provides features such as authentication, bidirectional streaming, flow control, and more.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         gRPC Architecture Overview                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────┐          HTTP/2           ┌────────────────┐           │
│   │   gRPC Client   │  ◄═══════════════════►  │   gRPC Server   │           │
│   │  (Node.js/TS)   │   Binary Protobuf Msgs   │  (NestJS/Go)    │           │
│   └───────┬────────┘                           └───────┬────────┘           │
│           │                                            │                     │
│    ┌──────┴──────┐                              ┌──────┴──────┐             │
│    │ Generated   │                              │ Generated   │             │
│    │ Client Stub │                              │ Server Stub │             │
│    └──────┬──────┘                              └──────┬──────┘             │
│           │                                            │                     │
│    ┌──────┴──────┐                              ┌──────┴──────┐             │
│    │   .proto    │ ◄────── Shared Contract ──── │   .proto    │             │
│    │   file      │                              │   file      │             │
│    └─────────────┘                              └─────────────┘             │
│                                                                              │
│   Key: ═══ = HTTP/2 multiplexed connection (binary frames)                  │
│        ─── = Code generation from proto definitions                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key Advantages of gRPC:**

| Feature | Benefit |
|---------|---------|
| Binary Protocol (Protobuf) | 2-10x smaller payloads than JSON, faster serialization |
| HTTP/2 Transport | Multiplexing, header compression, server push |
| Strong Typing | Compile-time type safety from .proto schemas |
| Code Generation | Auto-generate client/server stubs in 12+ languages |
| Streaming | Native support for all four streaming patterns |
| Deadlines/Timeouts | Built-in deadline propagation across services |
| Interceptors | Middleware-like pattern for cross-cutting concerns |

**gRPC vs REST vs GraphQL:**

| Criteria | gRPC | REST | GraphQL |
|----------|------|------|---------|
| Protocol | HTTP/2 | HTTP/1.1 or HTTP/2 | HTTP/1.1 or HTTP/2 |
| Payload Format | Protobuf (binary) | JSON/XML (text) | JSON (text) |
| Contract | .proto file (strict) | OpenAPI/Swagger (optional) | Schema (strict) |
| Streaming | Native (4 patterns) | SSE/WebSocket (add-on) | Subscriptions (add-on) |
| Browser Support | Limited (needs proxy) | Native | Native |
| Code Generation | Built-in | Third-party tools | Third-party tools |
| Performance | Highest | Good | Good |
| Learning Curve | Steep | Low | Medium |
| Debugging | Harder (binary) | Easy (curl, Postman) | Medium (GraphiQL) |
| Caching | Custom (no HTTP caching) | HTTP caching built-in | Custom |
| API Evolution | Proto schema evolution | Versioning (v1, v2) | Additive changes |

**When to Use gRPC:**
- Internal microservice-to-microservice communication
- Low-latency, high-throughput requirements (real-time data pipelines)
- Polyglot environments (Go server, Node.js client, Python ML service)
- Streaming data (live feeds, IoT sensor data, chat)
- Strict API contracts enforced at compile time

**When NOT to Use gRPC:**
- Browser-facing APIs (limited browser support, need gRPC-Web proxy)
- Simple CRUD APIs where REST is sufficient
- Public APIs (developers expect REST/GraphQL, better tooling)
- Teams unfamiliar with Protobuf (learning curve overhead)
- When HTTP caching is critical (gRPC bypasses standard HTTP caches)

**Real-World Usage:**
- **Google**: Internal microservice communication (Stubby, predecessor to gRPC)
- **Netflix**: Inter-service communication in their microservice mesh
- **Uber**: Communication between thousands of internal services
- **Slack**: Backend service communication
- **Square**: Payment processing services

> **Interview Tip:** When asked "When would you choose gRPC over REST for a new microservice?" — frame your answer around internal vs external APIs. A strong answer: "For service-to-service communication within our infrastructure, gRPC gives us strong typing, streaming, and significantly better performance. For public-facing APIs, I'd keep REST or GraphQL for broad client compatibility, and use an API gateway that translates REST to gRPC internally."

**Follow-up Questions to Expect:**
- "How would you handle a scenario where some services use REST and others use gRPC?"
- "What's the cost of adopting gRPC for an existing REST-based system?"
- "How does gRPC handle backward compatibility?"

---

## Q2: Protocol Buffers (Protobuf) Deep Dive

### Q: Explain Protocol Buffers, their syntax, and how they compare to JSON for serialization.

**Answer:**

Protocol Buffers (Protobuf) is Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data. It serves as both the **Interface Definition Language (IDL)** for gRPC services and the **serialization format** for the data exchanged.

**How Protobuf Works:**

```
┌─────────────┐     protoc      ┌──────────────────┐
│  .proto file │ ──────────────► │ Generated Code    │
│  (Schema)    │   compiler      │ (TS, Go, Python)  │
└─────────────┘                 └──────────┬───────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
                ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                │  TypeScript   │  │  Go structs   │  │  Python      │
                │  interfaces   │  │  + methods    │  │  classes     │
                │  + encode/    │  │               │  │              │
                │    decode     │  │               │  │              │
                └──────────────┘  └──────────────┘  └──────────────┘
```

**Complete .proto File Example — User Service:**

```protobuf
// user.proto
syntax = "proto3";

package user.v1;

option java_package = "com.example.user.v1";
option go_package = "github.com/example/user/v1;userv1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// ──────────────────────────────────────
// Enums
// ──────────────────────────────────────
enum UserRole {
  USER_ROLE_UNSPECIFIED = 0;   // Always have a zero value as default
  USER_ROLE_ADMIN = 1;
  USER_ROLE_EDITOR = 2;
  USER_ROLE_VIEWER = 3;
}

enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_SUSPENDED = 2;
  USER_STATUS_DELETED = 3;
}

// ──────────────────────────────────────
// Messages
// ──────────────────────────────────────
message Address {
  string street = 1;
  string city = 2;
  string state = 3;
  string zip_code = 4;
  string country = 5;
}

message User {
  string id = 1;                              // UUID as string
  string email = 2;
  string first_name = 3;
  string last_name = 4;
  UserRole role = 5;
  UserStatus status = 6;
  Address address = 7;                        // Nested message
  repeated string tags = 8;                   // Array of strings
  map<string, string> metadata = 9;           // Key-value pairs
  google.protobuf.Timestamp created_at = 10;
  google.protobuf.Timestamp updated_at = 11;

  // Oneof — only one of these can be set at a time
  oneof notification_preference {
    string email_address = 12;
    string phone_number = 13;
    string slack_webhook = 14;
  }
}

// ──────────────────────────────────────
// Request / Response Messages
// ──────────────────────────────────────
message CreateUserRequest {
  string email = 1;
  string first_name = 2;
  string last_name = 3;
  UserRole role = 4;
  Address address = 5;
}

message CreateUserResponse {
  User user = 1;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message ListUsersRequest {
  int32 page_size = 1;       // Max 100
  string page_token = 2;     // Cursor for pagination
  string filter = 3;         // e.g., "role=ADMIN"
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
  int32 total_count = 3;
}

message UpdateUserRequest {
  string id = 1;
  string email = 2;
  string first_name = 3;
  string last_name = 4;
  UserRole role = 5;
}

message DeleteUserRequest {
  string id = 1;
}

// ──────────────────────────────────────
// Service Definition
// ──────────────────────────────────────
service UserService {
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (google.protobuf.Empty);

  // Streaming RPCs
  rpc WatchUser(GetUserRequest) returns (stream User);       // Server streaming
  rpc BulkCreateUsers(stream CreateUserRequest) returns (ListUsersResponse); // Client streaming
}
```

**Protobuf Scalar Types:**

| Protobuf Type | TypeScript Type | Default Value | Notes |
|---------------|----------------|---------------|-------|
| `double` | `number` | 0 | 64-bit float |
| `float` | `number` | 0 | 32-bit float |
| `int32` | `number` | 0 | Variable-length, inefficient for negatives |
| `int64` | `string` / `Long` | 0 | Too large for JS number, use string |
| `uint32` | `number` | 0 | Unsigned integer |
| `sint32` | `number` | 0 | More efficient for negative values |
| `bool` | `boolean` | false | |
| `string` | `string` | "" | UTF-8 or 7-bit ASCII |
| `bytes` | `Uint8Array` | empty | Arbitrary binary data |
| `fixed32` | `number` | 0 | Always 4 bytes, faster if values > 2^28 |
| `fixed64` | `string` / `Long` | 0 | Always 8 bytes |

**Field Numbering Rules:**

```protobuf
message Example {
  // Field numbers 1-15 use 1 byte in encoding — use for frequently set fields
  string name = 1;          // 1 byte tag
  int32 age = 2;            // 1 byte tag

  // Field numbers 16-2047 use 2 bytes
  string description = 16;  // 2 byte tag

  // Field numbers 19000-19999 are RESERVED by protobuf implementation
  // string bad_field = 19000;  // ERROR: reserved range

  // Maximum field number: 2^29 - 1 = 536,870,911
}
```

**Proto2 vs Proto3 Key Differences:**

| Feature | Proto2 | Proto3 |
|---------|--------|--------|
| Field presence | `required`, `optional` keywords | All fields optional by default |
| Default values | Custom defaults allowed | Language-defined defaults only |
| Unknown fields | Preserved | Preserved (since 3.5+) |
| Enums | Can start at any value | Must have 0 as first value |
| Maps | Not supported | Supported |
| JSON mapping | Not built-in | Built-in |
| `optional` keyword | Yes | Re-added in proto3 (v3.15+) |

> **Interview Tip:** Always mention that Proto3 is the current standard. Proto2 is legacy. If asked about the `optional` keyword in Proto3, note that it was re-added to allow explicit presence tracking — distinguishing "field was set to default value" from "field was not set."

**Protobuf vs JSON Serialization:**

```typescript
// Size comparison: same data encoded in JSON vs Protobuf

// JSON (154 bytes as UTF-8)
const jsonPayload = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "ADMIN",
  tags: ["backend", "senior"],
};

// Protobuf (approximately 80-90 bytes as binary)
// ~45-50% smaller for this example
// Difference grows with larger, more structured payloads
```

**Follow-up Questions to Expect:**
- "How does Protobuf handle optional fields in Proto3?"
- "Why do field numbers matter — what happens if you change them?"
- "How do you handle Protobuf types that don't map cleanly to JavaScript (e.g., int64)?"

---

## Q3: Protobuf Schema Evolution & Compatibility

### Q: How do you safely evolve a Protobuf schema over time without breaking existing clients?

**Answer:**

Schema evolution is one of Protobuf's greatest strengths. Because the wire format uses field **numbers** (not names), many changes are backward and forward compatible. The key rule: **never change the field number of an existing field, and never reuse a field number that was previously assigned.**

**Safe Changes (Backward + Forward Compatible):**

```protobuf
// ──────────────────────────────────────
// Version 1 — Original schema
// ──────────────────────────────────────
syntax = "proto3";

message UserProfile {
  string id = 1;
  string name = 2;
  string email = 3;
}

// ──────────────────────────────────────
// Version 2 — Adding new fields (SAFE)
// ──────────────────────────────────────
// Old clients will simply ignore fields they don't know about.
// New clients will see default values for fields old servers don't send.

message UserProfile {
  string id = 1;
  string name = 2;
  string email = 3;
  string phone = 4;              // NEW: old clients ignore this
  int32 age = 5;                 // NEW: defaults to 0 if not sent
  repeated string tags = 6;      // NEW: defaults to empty list
}

// ──────────────────────────────────────
// Version 3 — Removing fields (use reserved)
// ──────────────────────────────────────
// NEVER delete a field and reuse its number.
// Mark removed fields and their numbers as reserved.

message UserProfile {
  string id = 1;
  string name = 2;
  string email = 3;
  // phone was removed — reserve the number and name
  reserved 4;
  reserved "phone";
  int32 age = 5;
  repeated string tags = 6;
  string avatar_url = 7;        // NEW field uses next available number
}

// ──────────────────────────────────────
// Version 4 — Renaming fields (SAFE)
// ──────────────────────────────────────
// Wire format uses numbers, not names.
// Renaming a field is safe for the binary protocol.
// WARNING: This DOES break JSON serialization (field names are used in JSON).

message UserProfile {
  string id = 1;
  string full_name = 2;         // Renamed from "name" — binary OK, JSON breaks
  string email_address = 3;     // Renamed from "email" — binary OK, JSON breaks
  reserved 4;
  reserved "phone";
  int32 age = 5;
  repeated string labels = 6;   // Renamed from "tags"
  string avatar_url = 7;
}
```

**Dangerous Changes (Breaking Compatibility):**

| Change | Why It Breaks | Workaround |
|--------|--------------|------------|
| Change field number | Old/new data maps to wrong fields | Add new field, deprecate old |
| Change field type (incompatible) | Deserialization corrupts data | Add new field with new type |
| Change `repeated` to scalar | Array vs single value mismatch | Add new field |
| Change `map` to `repeated` | Different wire encoding | Add new field |
| Reuse a deleted field number | Old data interpreted as new field | Use `reserved` |

**Compatible Type Changes (wire-compatible pairs):**

```protobuf
// These pairs share the same wire type and CAN be changed between:
// int32, uint32, int64, uint64, bool  (all varint)
// sint32, sint64                       (both zigzag varint)
// fixed32, sfixed32                    (both 32-bit)
// fixed64, sfixed64, double            (both 64-bit)
// string, bytes                        (both length-delimited, if valid UTF-8)

// WARNING: Just because the wire type matches doesn't mean the values
// will be correct. Changing int32 to bool will "work" but values > 1
// may have undefined behavior.
```

**Best Practices for Long-Lived Schemas:**

```protobuf
// 1. ALWAYS reserve removed field numbers and names
message Order {
  reserved 4, 8, 12 to 15;
  reserved "old_status", "legacy_amount";
}

// 2. Use wrapper types for optional semantics when needed
import "google/protobuf/wrappers.proto";

message SearchFilter {
  google.protobuf.Int32Value min_age = 1;    // Can distinguish 0 from "not set"
  google.protobuf.Int32Value max_age = 2;
  google.protobuf.StringValue name_prefix = 3;
}

// 3. Version your packages
package mycompany.users.v1;   // v1 namespace
package mycompany.users.v2;   // v2 can coexist

// 4. Use enums with UNSPECIFIED as 0
enum Priority {
  PRIORITY_UNSPECIFIED = 0;   // Can detect "not set"
  PRIORITY_LOW = 1;
  PRIORITY_MEDIUM = 2;
  PRIORITY_HIGH = 3;
}

// 5. Plan for field number allocation
// Reserve field numbers 1-15 for frequently used fields (1-byte encoding).
// Leave gaps for future fields in the same logical group.
message Product {
  // Identity fields: 1-5
  string id = 1;
  string sku = 2;
  string name = 3;
  // (4, 5 reserved for future identity fields)

  // Pricing fields: 6-10
  int64 price_cents = 6;
  string currency = 7;
  // (8-10 reserved for future pricing fields)

  // Metadata fields: 11-15
  google.protobuf.Timestamp created_at = 11;
  google.protobuf.Timestamp updated_at = 12;
}
```

> **Interview Tip:** When discussing schema evolution, emphasize the **field number** is the critical invariant. A common mistake junior engineers make is reusing field numbers after deleting fields. Always mention the `reserved` keyword — it prevents accidental reuse at compile time.

**Follow-up Questions to Expect:**
- "How would you handle a breaking schema change that must be deployed?"
- "What's the difference between backward and forward compatibility in Protobuf?"
- "How do you manage proto schemas across multiple teams?"

---

## Q4: gRPC Communication Patterns

### Q: Describe the four gRPC communication patterns and give real-world use cases for each.

**Answer:**

gRPC supports four communication patterns, all built on top of HTTP/2's bidirectional streaming capabilities.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    gRPC Communication Patterns                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. UNARY                          2. SERVER STREAMING                       │
│  ──────                            ────────────────                          │
│  Client ──[Request]──► Server      Client ──[Request]──► Server              │
│  Client ◄──[Response]── Server     Client ◄──[Response 1]── Server           │
│                                    Client ◄──[Response 2]── Server           │
│                                    Client ◄──[Response N]── Server           │
│                                                                              │
│  3. CLIENT STREAMING               4. BIDIRECTIONAL STREAMING                │
│  ────────────────                  ──────────────────────                    │
│  Client ──[Request 1]──► Server    Client ──[Req 1]──►  ◄──[Res 1]── Server │
│  Client ──[Request 2]──► Server    Client ──[Req 2]──►  ◄──[Res 2]── Server │
│  Client ──[Request N]──► Server    Client ──[Req N]──►  ◄──[Res N]── Server │
│  Client ◄──[Response]── Server     (independent streams, any order)          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Proto Definitions for All Four Patterns:**

```protobuf
syntax = "proto3";
package streaming.v1;

import "google/protobuf/timestamp.proto";

// Messages
message StockQuote {
  string symbol = 1;
  double price = 2;
  double change = 3;
  google.protobuf.Timestamp timestamp = 4;
}

message StockRequest {
  string symbol = 1;
}

message UploadChunk {
  string filename = 1;
  bytes data = 2;
  int32 chunk_number = 3;
}

message UploadResult {
  string file_id = 1;
  int64 total_bytes = 2;
  int32 chunks_received = 3;
}

message ChatMessage {
  string user_id = 1;
  string room_id = 2;
  string content = 3;
  google.protobuf.Timestamp timestamp = 4;
}

// Service with all four patterns
service TradingService {
  // 1. Unary: Get current stock price
  rpc GetQuote(StockRequest) returns (StockQuote);

  // 2. Server streaming: Subscribe to live price updates
  rpc WatchQuote(StockRequest) returns (stream StockQuote);

  // 3. Client streaming: Upload file in chunks
  rpc UploadFile(stream UploadChunk) returns (UploadResult);

  // 4. Bidirectional streaming: Real-time chat
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

### Pattern 1: Unary RPC

**Use cases:** Standard request-response, CRUD operations, authentication, single lookups.

```typescript
// Server implementation (NestJS)
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class TradingController {
  @GrpcMethod('TradingService', 'GetQuote')
  getQuote(request: StockRequest): StockQuote {
    return {
      symbol: request.symbol,
      price: 150.25,
      change: 2.5,
      timestamp: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
    };
  }
}

// Client usage (NestJS)
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';

interface TradingServiceClient {
  getQuote(request: StockRequest): Observable<StockQuote>;
}

@Injectable()
export class TradingClientService implements OnModuleInit {
  private tradingService: TradingServiceClient;

  constructor(@Inject('TRADING_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.tradingService = this.client.getService<TradingServiceClient>('TradingService');
  }

  async getCurrentPrice(symbol: string): Promise<StockQuote> {
    return firstValueFrom(this.tradingService.getQuote({ symbol }));
  }
}
```

### Pattern 2: Server Streaming

**Use cases:** Live price feeds, real-time notifications, log tailing, progress updates, database change streams.

```typescript
// Server implementation — Server Streaming
@Controller()
export class TradingController {
  @GrpcMethod('TradingService', 'WatchQuote')
  watchQuote(request: StockRequest): Observable<StockQuote> {
    // Return an Observable that emits stock quotes every second
    return new Observable<StockQuote>((subscriber) => {
      const interval = setInterval(() => {
        const quote: StockQuote = {
          symbol: request.symbol,
          price: 150 + Math.random() * 10,
          change: (Math.random() - 0.5) * 5,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
        };
        subscriber.next(quote);
      }, 1000);

      // Cleanup on client disconnect
      return () => {
        clearInterval(interval);
        console.log(`Client unsubscribed from ${request.symbol}`);
      };
    });
  }
}

// Client — consuming the stream
async watchStockPrice(symbol: string): Promise<void> {
  const stream$ = this.tradingService.watchQuote({ symbol });

  stream$.subscribe({
    next: (quote: StockQuote) => {
      console.log(`${quote.symbol}: $${quote.price.toFixed(2)} (${quote.change > 0 ? '+' : ''}${quote.change.toFixed(2)})`);
    },
    error: (err) => console.error('Stream error:', err),
    complete: () => console.log('Stream completed'),
  });
}
```

### Pattern 3: Client Streaming

**Use cases:** File upload in chunks, batch data ingestion, IoT sensor data collection, aggregation of client events.

```typescript
// Server implementation — Client Streaming
import { GrpcStreamMethod } from '@nestjs/microservices';
import { Subject } from 'rxjs';

@Controller()
export class TradingController {
  @GrpcStreamMethod('TradingService', 'UploadFile')
  uploadFile(messages$: Observable<UploadChunk>): Observable<UploadResult> {
    const result$ = new Subject<UploadResult>();

    let totalBytes = 0;
    let chunksReceived = 0;
    let filename = '';

    messages$.subscribe({
      next: (chunk: UploadChunk) => {
        filename = chunk.filename;
        totalBytes += chunk.data.length;
        chunksReceived++;
        console.log(`Received chunk ${chunk.chunkNumber} for ${chunk.filename}`);
      },
      error: (err) => {
        console.error('Upload error:', err);
        result$.error(err);
      },
      complete: () => {
        // All chunks received, send final response
        result$.next({
          fileId: `file_${Date.now()}`,
          totalBytes,
          chunksReceived,
        });
        result$.complete();
      },
    });

    return result$.asObservable();
  }
}

// Client — sending stream of chunks
async uploadFile(filePath: string): Promise<UploadResult> {
  const subject = new Subject<UploadChunk>();
  const result$ = this.tradingService.uploadFile(subject.asObservable());

  // Read file and send in chunks
  const fileBuffer = await fs.promises.readFile(filePath);
  const chunkSize = 64 * 1024; // 64KB chunks

  for (let i = 0; i < fileBuffer.length; i += chunkSize) {
    subject.next({
      filename: path.basename(filePath),
      data: fileBuffer.slice(i, i + chunkSize),
      chunkNumber: Math.floor(i / chunkSize),
    });
  }
  subject.complete();

  return firstValueFrom(result$);
}
```

### Pattern 4: Bidirectional Streaming

**Use cases:** Real-time chat, multiplayer game state sync, collaborative editing, real-time translation, interactive voice/video streams.

```typescript
// Server implementation — Bidirectional Streaming
@Controller()
export class TradingController {
  private chatRooms = new Map<string, Subject<ChatMessage>>();

  @GrpcStreamMethod('TradingService', 'Chat')
  chat(messages$: Observable<ChatMessage>): Observable<ChatMessage> {
    const outgoing$ = new Subject<ChatMessage>();

    messages$.subscribe({
      next: (message: ChatMessage) => {
        console.log(`[${message.roomId}] ${message.userId}: ${message.content}`);

        // Get or create room subject
        if (!this.chatRooms.has(message.roomId)) {
          this.chatRooms.set(message.roomId, new Subject<ChatMessage>());
        }
        const room = this.chatRooms.get(message.roomId)!;

        // Subscribe this client to the room (only once)
        room.subscribe((msg) => outgoing$.next(msg));

        // Broadcast the message to all subscribers
        room.next({
          ...message,
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
        });
      },
      error: (err) => outgoing$.error(err),
      complete: () => outgoing$.complete(),
    });

    return outgoing$.asObservable();
  }
}
```

**When to Use Each Pattern:**

| Pattern | Latency | Throughput | Use When |
|---------|---------|------------|----------|
| Unary | Single round-trip | One message | Standard request/response, CRUD |
| Server streaming | Continuous push | High (server to client) | Live feeds, notifications, progress |
| Client streaming | Batched | High (client to server) | File upload, bulk ingestion |
| Bidirectional | Real-time both ways | High (both directions) | Chat, sync, interactive |

> **Interview Tip:** When discussing streaming, emphasize that gRPC streaming operates on a single HTTP/2 connection. This is fundamentally different from WebSocket, which requires a separate connection. gRPC streams can be multiplexed alongside unary RPCs on the same connection.

---

## Q5: gRPC in NestJS

### Q: How do you set up and implement gRPC services in NestJS? Walk through both server and client configuration.

**Answer:**

NestJS provides first-class support for gRPC via the `@nestjs/microservices` package. It supports both **static code generation** (ts-proto, protobuf-ts) and **dynamic proto loading** (@grpc/proto-loader).

**Project Setup:**

```bash
# Install dependencies
npm install @nestjs/microservices @grpc/grpc-js @grpc/proto-loader

# For static code generation (recommended for type safety)
npm install ts-proto --save-dev
```

**Proto File Loading: Static vs Dynamic**

| Approach | Pros | Cons |
|----------|------|------|
| **Static** (ts-proto) | Full TypeScript types, IDE autocomplete, compile-time checks | Build step required, generated files in repo |
| **Dynamic** (proto-loader) | No build step, simpler setup | No TypeScript types, runtime errors only |

**Complete gRPC Service in NestJS — User Service:**

**Step 1: Proto file** (`proto/user.proto`)

```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc FindOne(UserById) returns (User);
  rpc FindAll(Empty) returns (UserList);
  rpc Create(CreateUserDto) returns (User);
  rpc Update(UpdateUserDto) returns (User);
  rpc Delete(UserById) returns (Empty);
  rpc StreamUsers(Empty) returns (stream User);
}

message UserById {
  string id = 1;
}

message CreateUserDto {
  string email = 1;
  string name = 2;
  string password = 3;
}

message UpdateUserDto {
  string id = 1;
  string email = 2;
  string name = 3;
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
  string created_at = 4;
}

message UserList {
  repeated User users = 1;
}

message Empty {}
```

**Step 2: Generate TypeScript types (static approach with ts-proto)**

```bash
# Generate TypeScript interfaces and service stubs
protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src/generated \
  --ts_proto_opt=nestJs=true \
  --ts_proto_opt=addGrpcMetadata=true \
  --ts_proto_opt=outputEncodeMethods=false \
  --ts_proto_opt=outputJsonMethods=false \
  --ts_proto_opt=outputClientImpl=false \
  ./proto/user.proto
```

**Step 3: gRPC Server (NestJS Microservice)**

```typescript
// main.ts — Bootstrap as gRPC server
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: join(__dirname, '../proto/user.proto'),
        url: '0.0.0.0:5000',
        loader: {
          keepCase: true,       // Don't convert to camelCase
          longs: String,        // Convert int64 to string
          enums: String,        // Convert enums to string
          defaults: true,       // Include default values
          oneofs: true,         // Include oneof fields
        },
        // Channel options for performance tuning
        channelOptions: {
          'grpc.max_receive_message_length': 10 * 1024 * 1024,   // 10MB
          'grpc.max_send_message_length': 10 * 1024 * 1024,       // 10MB
          'grpc.keepalive_time_ms': 120000,                        // 2 min
          'grpc.keepalive_timeout_ms': 20000,                      // 20 sec
          'grpc.keepalive_permit_without_calls': 1,
        },
      },
    },
  );

  await app.listen();
  console.log('gRPC UserService listening on port 5000');
}
bootstrap();
```

**Hybrid App (REST + gRPC on same NestJS instance):**

```typescript
// main.ts — Hybrid: HTTP + gRPC
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../proto/user.proto'),
      url: '0.0.0.0:5000',
    },
  });

  await app.startAllMicroservices();  // Start gRPC
  await app.listen(3000);            // Start HTTP
  console.log('HTTP on :3000, gRPC on :5000');
}
```

**Step 4: gRPC Controller (Server-side handler)**

```typescript
// user.controller.ts
import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { Observable, Subject } from 'rxjs';
import { UserService } from './user.service';

interface UserById {
  id: string;
}

interface CreateUserDto {
  email: string;
  name: string;
  password: string;
}

interface UpdateUserDto {
  id: string;
  email?: string;
  name?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Unary RPC
  @GrpcMethod('UserService', 'FindOne')
  async findOne(
    data: UserById,
    metadata: Metadata,
    call: ServerUnaryCall<UserById, User>,
  ): Promise<User> {
    // Access metadata (headers)
    const authToken = metadata.get('authorization')[0];
    console.log('Auth token:', authToken);

    const user = await this.userService.findById(data.id);
    if (!user) {
      throw new RpcException({
        code: 5,  // NOT_FOUND
        message: `User ${data.id} not found`,
      });
    }
    return user;
  }

  @GrpcMethod('UserService', 'FindAll')
  async findAll(): Promise<{ users: User[] }> {
    const users = await this.userService.findAll();
    return { users };
  }

  @GrpcMethod('UserService', 'Create')
  async create(data: CreateUserDto): Promise<User> {
    return this.userService.create(data);
  }

  @GrpcMethod('UserService', 'Update')
  async update(data: UpdateUserDto): Promise<User> {
    return this.userService.update(data.id, data);
  }

  @GrpcMethod('UserService', 'Delete')
  async delete(data: UserById): Promise<{}> {
    await this.userService.delete(data.id);
    return {};
  }

  // Server Streaming RPC
  @GrpcStreamMethod('TradingService', 'StreamUsers')
  streamUsers(): Observable<User> {
    const subject = new Subject<User>();

    // Simulate streaming users from a database cursor
    const streamFromDb = async () => {
      const users = await this.userService.findAll();
      for (const user of users) {
        subject.next(user);
        // Small delay to demonstrate streaming
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      subject.complete();
    };

    streamFromDb().catch((err) => subject.error(err));
    return subject.asObservable();
  }
}
```

**Step 5: gRPC Client (Consuming the service from another NestJS app)**

```typescript
// user-client.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { UserClientService } from './user-client.service';
import { UserClientController } from './user-client.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(__dirname, '../proto/user.proto'),
          url: 'user-service:5000',   // Service discovery / DNS
          channelOptions: {
            'grpc.max_receive_message_length': 10 * 1024 * 1024,
            'grpc.keepalive_time_ms': 120000,
          },
        },
      },
    ]),
  ],
  controllers: [UserClientController],
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}
```

```typescript
// user-client.service.ts
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom, lastValueFrom, toArray } from 'rxjs';

interface UserServiceGrpcClient {
  findOne(data: { id: string }): Observable<User>;
  findAll(data: {}): Observable<{ users: User[] }>;
  create(data: CreateUserDto): Observable<User>;
  update(data: UpdateUserDto): Observable<User>;
  delete(data: { id: string }): Observable<{}>;
  streamUsers(data: {}): Observable<User>;
}

@Injectable()
export class UserClientService implements OnModuleInit {
  private userService: UserServiceGrpcClient;

  constructor(@Inject('USER_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.userService = this.client.getService<UserServiceGrpcClient>('UserService');
  }

  // Unary calls — convert Observable to Promise
  async findUser(id: string): Promise<User> {
    return firstValueFrom(this.userService.findOne({ id }));
  }

  async listUsers(): Promise<User[]> {
    const result = await firstValueFrom(this.userService.findAll({}));
    return result.users;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    return firstValueFrom(this.userService.create(dto));
  }

  // Streaming call — collect all streamed items
  async getAllUsersViaStream(): Promise<User[]> {
    return lastValueFrom(
      this.userService.streamUsers({}).pipe(toArray()),
    );
  }

  // Streaming call — process each item as it arrives
  watchUsers(callback: (user: User) => void): void {
    this.userService.streamUsers({}).subscribe({
      next: callback,
      error: (err) => console.error('Stream error:', err),
      complete: () => console.log('Stream completed'),
    });
  }
}
```

```typescript
// user-client.controller.ts — REST gateway exposing gRPC service
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UserClientService } from './user-client.service';

@Controller('api/users')
export class UserClientController {
  constructor(private readonly userClient: UserClientService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userClient.findUser(id);
  }

  @Get()
  async findAll() {
    return this.userClient.listUsers();
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userClient.createUser(dto);
  }
}
```

> **Interview Tip:** Interviewers often ask about the REST-to-gRPC gateway pattern. In NestJS, you can create a hybrid app that exposes REST endpoints externally and calls gRPC services internally. This gives you the best of both worlds: REST for browser/mobile clients, gRPC for internal performance.

**Follow-up Questions to Expect:**
- "How do you share proto files across multiple NestJS services?"
- "Static vs dynamic proto loading — when would you choose each?"
- "How do you handle gRPC service versioning in NestJS?"

---

## Q6: gRPC Error Handling

### Q: How does gRPC handle errors? Explain status codes, error propagation, and retry strategies.

**Answer:**

gRPC uses a different error model than HTTP. Instead of HTTP status codes (200, 404, 500), gRPC defines its own set of **status codes** that are transported via HTTP/2 trailers.

**gRPC Status Codes:**

| Code | Name | HTTP Equivalent | When to Use |
|------|------|----------------|-------------|
| 0 | OK | 200 | Success |
| 1 | CANCELLED | 499 | Client cancelled the request |
| 2 | UNKNOWN | 500 | Unknown error (catch-all) |
| 3 | INVALID_ARGUMENT | 400 | Bad request data (validation) |
| 4 | DEADLINE_EXCEEDED | 504 | Timeout |
| 5 | NOT_FOUND | 404 | Resource doesn't exist |
| 6 | ALREADY_EXISTS | 409 | Resource already exists (duplicate) |
| 7 | PERMISSION_DENIED | 403 | Authenticated but not authorized |
| 8 | RESOURCE_EXHAUSTED | 429 | Rate limit / quota exceeded |
| 9 | FAILED_PRECONDITION | 400 | System not in required state (e.g., non-empty dir delete) |
| 10 | ABORTED | 409 | Concurrency conflict (optimistic lock) |
| 11 | OUT_OF_RANGE | 400 | Pagination out of range |
| 12 | UNIMPLEMENTED | 501 | RPC method not implemented |
| 13 | INTERNAL | 500 | Internal server error |
| 14 | UNAVAILABLE | 503 | Service temporarily unavailable (retry) |
| 15 | DATA_LOSS | 500 | Unrecoverable data loss |
| 16 | UNAUTHENTICATED | 401 | No valid auth credentials |

**Key Distinction:** `UNAUTHENTICATED` (16) = no credentials or invalid token. `PERMISSION_DENIED` (7) = valid credentials but insufficient permissions. Getting this right matters in interviews.

**Error Handling in gRPC Server (NestJS):**

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod('UserService', 'FindOne')
  async findOne(data: { id: string }): Promise<User> {
    // Validation error
    if (!data.id || data.id.trim() === '') {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'User ID is required and cannot be empty',
      });
    }

    try {
      const user = await this.userService.findById(data.id);

      // Not found
      if (!user) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: `User with ID "${data.id}" not found`,
        });
      }

      return user;
    } catch (error) {
      // Re-throw RpcException as-is
      if (error instanceof RpcException) {
        throw error;
      }

      // Wrap unexpected errors
      console.error('Unexpected error in FindOne:', error);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'An internal error occurred',
        // Never expose internal details to clients in production
      });
    }
  }

  @GrpcMethod('UserService', 'Create')
  async create(data: CreateUserDto): Promise<User> {
    // Validation
    const errors = this.validate(data);
    if (errors.length > 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: `Validation failed: ${errors.join(', ')}`,
      });
    }

    try {
      return await this.userService.create(data);
    } catch (error) {
      // Handle duplicate key (e.g., unique email constraint)
      if (error.code === '23505') {  // PostgreSQL unique violation
        throw new RpcException({
          code: GrpcStatus.ALREADY_EXISTS,
          message: `User with email "${data.email}" already exists`,
        });
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to create user',
      });
    }
  }

  private validate(dto: CreateUserDto): string[] {
    const errors: string[] = [];
    if (!dto.email) errors.push('email is required');
    if (!dto.name) errors.push('name is required');
    if (dto.email && !dto.email.includes('@')) errors.push('invalid email format');
    return errors;
  }
}
```

**Rich Error Model (Error Details with Metadata):**

```typescript
import { Metadata } from '@grpc/grpc-js';

// Server — sending rich error details via metadata
@GrpcMethod('UserService', 'Create')
async create(data: CreateUserDto, metadata: Metadata): Promise<User> {
  const errors = this.validate(data);

  if (errors.length > 0) {
    // Create metadata with error details
    const errorMetadata = new Metadata();
    errorMetadata.set('error-details', JSON.stringify({
      violations: errors.map((msg) => ({
        field: msg.split(' ')[0],
        description: msg,
      })),
      requestId: metadata.get('x-request-id')[0]?.toString() || 'unknown',
    }));

    // RpcException can include metadata
    throw new RpcException({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Validation failed: ${errors.length} error(s)`,
      metadata: errorMetadata,
    });
  }

  return this.userService.create(data);
}
```

**Client-Side Error Handling:**

```typescript
import { status as GrpcStatus } from '@grpc/grpc-js';
import { catchError, retry, timer } from 'rxjs';

@Injectable()
export class UserClientService implements OnModuleInit {
  private userService: UserServiceGrpcClient;

  constructor(@Inject('USER_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.userService = this.client.getService<UserServiceGrpcClient>('UserService');
  }

  async findUser(id: string): Promise<User | null> {
    try {
      return await firstValueFrom(
        this.userService.findOne({ id }).pipe(
          // Retry on transient errors only
          retry({
            count: 3,
            delay: (error, retryCount) => {
              const grpcCode = error?.code;

              // Only retry on transient errors
              const retryableCodes = [
                GrpcStatus.UNAVAILABLE,      // 14 — service down, retry
                GrpcStatus.DEADLINE_EXCEEDED, // 4 — timeout, maybe retry
                GrpcStatus.ABORTED,           // 10 — conflict, retry with backoff
              ];

              if (!retryableCodes.includes(grpcCode)) {
                throw error;  // Non-retryable, fail immediately
              }

              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, retryCount - 1) * 1000;
              console.log(`Retry ${retryCount}/3 after ${delay}ms (code: ${grpcCode})`);
              return timer(delay);
            },
          }),
          catchError((error) => {
            this.handleGrpcError(error);
            throw error;
          }),
        ),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) {
        return null;  // Graceful handling for not found
      }
      throw error;
    }
  }

  private handleGrpcError(error: any): void {
    const code = error?.code;
    const message = error?.message || 'Unknown error';
    const details = error?.metadata?.get('error-details')?.[0];

    switch (code) {
      case GrpcStatus.INVALID_ARGUMENT:
        console.error(`Validation error: ${message}`);
        if (details) {
          const parsed = JSON.parse(details.toString());
          console.error('Violations:', parsed.violations);
        }
        break;

      case GrpcStatus.NOT_FOUND:
        console.warn(`Resource not found: ${message}`);
        break;

      case GrpcStatus.UNAUTHENTICATED:
        console.error('Authentication required — token may be expired');
        // Trigger token refresh
        break;

      case GrpcStatus.PERMISSION_DENIED:
        console.error(`Access denied: ${message}`);
        break;

      case GrpcStatus.UNAVAILABLE:
        console.error('Service unavailable — will retry');
        break;

      default:
        console.error(`gRPC error [${code}]: ${message}`);
    }
  }
}
```

**Deadline Propagation:**

```typescript
// Setting deadlines (timeouts) on gRPC calls
import { Metadata } from '@grpc/grpc-js';

async findUserWithDeadline(id: string): Promise<User> {
  const metadata = new Metadata();
  // Deadline is absolute time, timeout is relative duration
  // gRPC uses deadline internally — "this call must complete by X"
  metadata.set('deadline', String(Date.now() + 5000)); // 5 second deadline

  return firstValueFrom(
    this.userService.findOne({ id }, metadata).pipe(
      timeout(5000),  // RxJS timeout as backup
      catchError((error) => {
        if (error?.code === GrpcStatus.DEADLINE_EXCEEDED) {
          console.error('Call timed out — check downstream service health');
        }
        throw error;
      }),
    ),
  );
}
```

> **Interview Tip:** Always mention deadline propagation as a critical best practice. If Service A calls Service B with a 5s deadline, and Service B calls Service C, Service B should propagate the remaining deadline (e.g., 3s left) to Service C. Without this, cascading calls can waste resources on doomed requests. This is a hallmark of a senior engineer's understanding of distributed systems.

**Follow-up Questions to Expect:**
- "What's the difference between FAILED_PRECONDITION and INVALID_ARGUMENT?"
- "How do you implement circuit breaking for gRPC calls?"
- "How do you propagate errors in a chain of gRPC calls across multiple services?"

---

## Q7: gRPC Authentication & Security

### Q: How do you secure gRPC services? Explain TLS, JWT authentication, and mutual TLS for service-to-service communication.

**Answer:**

gRPC security has two layers: **transport security** (TLS/mTLS) and **call-level authentication** (tokens, API keys). In production, you always want both.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     gRPC Security Layers                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Transport Security (TLS/mTLS)                                     │
│  ──────────────────────────────────────                                     │
│  ┌────────┐   TLS encrypted channel    ┌────────┐                           │
│  │ Client │ ◄══════════════════════════► │ Server │                           │
│  │        │  Server cert validates       │        │                           │
│  │        │  (mTLS: client cert too)     │        │                           │
│  └────────┘                             └────────┘                           │
│                                                                              │
│  Layer 2: Call-Level Auth (JWT / API Key in metadata)                       │
│  ──────────────────────────────────────────────────                         │
│  ┌────────┐   metadata: {               ┌────────┐                           │
│  │ Client │    "authorization":         │ Server │                           │
│  │        │    "Bearer eyJhbG..."       │        │                           │
│  │        │   }                          │        │                           │
│  └────────┘ ──────────────────────────► └────────┘                           │
│                                           │                                  │
│                                    ┌──────┴──────┐                           │
│                                    │ Interceptor │                           │
│                                    │ validates   │                           │
│                                    │ JWT token   │                           │
│                                    └─────────────┘                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**TLS Configuration (Server):**

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { readFileSync } from 'fs';
import { ServerCredentials } from '@grpc/grpc-js';
import { join } from 'path';

async function bootstrap() {
  // Read TLS certificates
  const rootCert = readFileSync(join(__dirname, '../certs/ca.pem'));
  const serverCert = readFileSync(join(__dirname, '../certs/server-cert.pem'));
  const serverKey = readFileSync(join(__dirname, '../certs/server-key.pem'));

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: join(__dirname, '../proto/user.proto'),
        url: '0.0.0.0:5000',
        credentials: ServerCredentials.createSsl(
          rootCert,                    // CA cert (for mTLS client verification)
          [{ cert_chain: serverCert, private_key: serverKey }],
          false,                       // Set true for mTLS (require client certs)
        ),
      },
    },
  );

  await app.listen();
}
```

**Mutual TLS (mTLS) — Service-to-Service Authentication:**

```typescript
// Client connecting with mTLS
import { ChannelCredentials } from '@grpc/grpc-js';
import { readFileSync } from 'fs';

// In NestJS module registration
ClientsModule.register([
  {
    name: 'USER_PACKAGE',
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../proto/user.proto'),
      url: 'user-service:5000',
      credentials: ChannelCredentials.createSsl(
        readFileSync(join(__dirname, '../certs/ca.pem')),           // CA cert
        readFileSync(join(__dirname, '../certs/client-key.pem')),    // Client key
        readFileSync(join(__dirname, '../certs/client-cert.pem')),   // Client cert
      ),
    },
  },
]);
```

**JWT Authentication via Interceptor:**

```typescript
// auth.interceptor.ts — Server-side gRPC interceptor for JWT
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class GrpcAuthInterceptor implements NestInterceptor {
  private readonly publicMethods = ['Login', 'Register', 'HealthCheck'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rpcContext = context.switchToRpc();
    const metadata: Metadata = context.getArgByIndex(1);
    const methodName = context.getHandler().name;

    // Skip auth for public methods
    if (this.publicMethods.includes(methodName)) {
      return next.handle();
    }

    // Extract token from metadata
    const authHeader = metadata.get('authorization');
    if (!authHeader || authHeader.length === 0) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Missing authorization metadata',
      });
    }

    const token = authHeader[0].toString().replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      // Check token expiration
      if (decoded.exp * 1000 < Date.now()) {
        throw new RpcException({
          code: GrpcStatus.UNAUTHENTICATED,
          message: 'Token has expired',
        });
      }

      // Attach user info to metadata for downstream handlers
      metadata.set('x-user-id', decoded.sub);
      metadata.set('x-user-email', decoded.email);
      metadata.set('x-user-roles', JSON.stringify(decoded.roles));

      return next.handle();
    } catch (error) {
      if (error instanceof RpcException) throw error;

      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Invalid or malformed token',
      });
    }
  }
}

// Role-based authorization interceptor
@Injectable()
export class GrpcRolesInterceptor implements NestInterceptor {
  constructor(private readonly requiredRoles: string[]) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata: Metadata = context.getArgByIndex(1);
    const rolesHeader = metadata.get('x-user-roles');

    if (!rolesHeader || rolesHeader.length === 0) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'No roles found for user',
      });
    }

    const userRoles: string[] = JSON.parse(rolesHeader[0].toString());
    const hasRole = this.requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: `Requires one of: ${this.requiredRoles.join(', ')}`,
      });
    }

    return next.handle();
  }
}
```

**Applying the Interceptor:**

```typescript
// user.controller.ts
import { UseInterceptors } from '@nestjs/common';

@Controller()
@UseInterceptors(GrpcAuthInterceptor)   // Apply to all methods in controller
export class UserController {
  @GrpcMethod('UserService', 'FindOne')
  async findOne(data: UserById, metadata: Metadata): Promise<User> {
    const userId = metadata.get('x-user-id')[0]?.toString();
    console.log(`Request from user: ${userId}`);
    return this.userService.findById(data.id);
  }

  @GrpcMethod('UserService', 'Delete')
  @UseInterceptors(new GrpcRolesInterceptor(['admin']))  // Admin only
  async delete(data: UserById): Promise<{}> {
    await this.userService.delete(data.id);
    return {};
  }
}
```

**Client-Side: Attaching JWT to Every gRPC Call:**

```typescript
// grpc-auth-client.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class GrpcClientAuthInterceptor implements NestInterceptor {
  constructor(private readonly tokenProvider: TokenProviderService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata: Metadata = context.getArgByIndex(1) || new Metadata();
    const token = this.tokenProvider.getAccessToken();
    metadata.set('authorization', `Bearer ${token}`);
    return next.handle();
  }
}

// Or attach metadata manually per-call
async findUser(id: string): Promise<User> {
  const metadata = new Metadata();
  metadata.set('authorization', `Bearer ${this.authService.getToken()}`);
  metadata.set('x-request-id', randomUUID());

  return firstValueFrom(this.userService.findOne({ id }, metadata));
}
```

> **Interview Tip:** For service-to-service auth in a microservices architecture, mTLS is the gold standard because it authenticates both sides without application-level tokens. In a service mesh (Istio, Linkerd), mTLS is typically handled automatically at the sidecar proxy level, so your application code doesn't need to manage certificates directly.

**Follow-up Questions to Expect:**
- "How do you rotate certificates for mTLS without downtime?"
- "How does a service mesh simplify gRPC security?"
- "What's the performance overhead of TLS on gRPC?"

---

## Q8: gRPC Performance & Optimization

### Q: What makes gRPC faster than REST, and how do you optimize gRPC for high-throughput production systems?

**Answer:**

gRPC achieves superior performance through three main mechanisms: binary serialization (Protobuf), HTTP/2 transport, and persistent connections.

**Why gRPC is Faster — Layer by Layer:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  REST (HTTP/1.1 + JSON) vs gRPC (HTTP/2 + Protobuf)         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REST Request:                                                               │
│  ┌──────────────────────────────────────────────────┐                       │
│  │ POST /api/users HTTP/1.1                         │  Text headers         │
│  │ Content-Type: application/json                   │  (~500-2000 bytes)    │
│  │ Authorization: Bearer eyJhbGci...                │                       │
│  │ Accept: application/json                         │                       │
│  │                                                  │                       │
│  │ {"email":"john@ex.com","name":"John","age":30}   │  JSON body (~50 B)    │
│  └──────────────────────────────────────────────────┘                       │
│  Total: ~550-2050 bytes (mostly headers!)                                   │
│                                                                              │
│  gRPC Request:                                                               │
│  ┌──────────────────────────────────────────────────┐                       │
│  │ HTTP/2 HEADERS frame (HPACK compressed)          │  ~20-50 bytes         │
│  │ HTTP/2 DATA frame (Protobuf binary)              │  ~25-30 bytes         │
│  └──────────────────────────────────────────────────┘                       │
│  Total: ~50-80 bytes                                                        │
│                                                                              │
│  HTTP/2 Multiplexing:                                                       │
│  ┌────────────────────────────────────────┐                                 │
│  │        Single TCP Connection           │                                 │
│  │  Stream 1: ▓▓▓░░▓▓▓░░▓▓              │  Multiple concurrent            │
│  │  Stream 2: ░▓▓▓░░▓▓▓░░▓              │  RPCs over one                  │
│  │  Stream 3: ░░▓▓▓░░▓▓▓░░              │  connection                     │
│  └────────────────────────────────────────┘                                 │
│                                                                              │
│  HTTP/1.1 Pipelining (broken in practice):                                  │
│  ┌────────────────────────────────────────┐                                 │
│  │  Connection 1: ▓▓▓▓▓░░░░▓▓▓▓▓░░░░    │  Head-of-line blocking          │
│  │  Connection 2: ▓▓▓▓▓░░░░▓▓▓▓▓░░░░    │  Need multiple connections      │
│  │  Connection 3: ▓▓▓▓▓░░░░              │  (browsers limit to 6)          │
│  └────────────────────────────────────────┘                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Typical Benchmarks (gRPC vs REST):**

| Metric | REST (JSON) | gRPC (Protobuf) | Improvement |
|--------|-------------|-----------------|-------------|
| Serialization speed | ~1x | ~3-10x faster | Protobuf binary encoding |
| Payload size | ~1x | ~2-5x smaller | No field names, varint encoding |
| Latency (P99, unary) | ~1x | ~1.5-3x lower | HTTP/2 + smaller payload |
| Throughput (RPS) | ~1x | ~2-5x higher | Connection reuse, multiplexing |
| Connection setup | Per request (or keep-alive) | Single persistent connection | HTTP/2 multiplexing |

**Connection Pooling and Keepalive Configuration:**

```typescript
// NestJS gRPC server — optimized channel options
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../proto/user.proto'),
      url: '0.0.0.0:5000',
      channelOptions: {
        // ── Message Size Limits ──
        'grpc.max_receive_message_length': 10 * 1024 * 1024,   // 10 MB (default 4 MB)
        'grpc.max_send_message_length': 10 * 1024 * 1024,

        // ── Keepalive Settings ──
        // Server sends pings to detect dead connections
        'grpc.keepalive_time_ms': 120_000,            // Ping every 2 minutes
        'grpc.keepalive_timeout_ms': 20_000,           // Wait 20s for pong
        'grpc.keepalive_permit_without_calls': 1,      // Ping even with no active RPCs

        // ── HTTP/2 Settings ──
        'grpc.http2.min_ping_interval_without_data_ms': 300_000,
        'grpc.http2.max_pings_without_data': 0,        // Unlimited pings

        // ── Connection Settings ──
        'grpc.max_concurrent_streams': 100,            // Max concurrent RPCs per connection
        'grpc.initial_reconnect_backoff_ms': 1000,     // 1s initial retry
        'grpc.max_reconnect_backoff_ms': 120_000,      // 2 min max retry
      },
    },
  },
);
```

**Message Compression:**

```typescript
// Enable gzip compression for large messages
import { compressionAlgorithms } from '@grpc/grpc-js';

// Server-side: accept compressed messages
const channelOptions = {
  'grpc.default_compression_algorithm': compressionAlgorithms.gzip,
  'grpc.default_compression_level': 2,  // 0=none, 1=low, 2=medium, 3=high
};

// Note: Protobuf is already compact. Compression helps most when:
// - Messages contain large string fields (logs, descriptions)
// - Messages contain repeated structures with similar data
// - Payloads exceed ~1KB (below this, compression overhead isn't worth it)
```

**Chunking Large Messages:**

```protobuf
// Instead of sending one giant message, stream chunks
service FileService {
  // BAD: Single large message (hits size limits)
  // rpc Upload(FileData) returns (UploadResult);

  // GOOD: Stream chunks
  rpc Upload(stream FileChunk) returns (UploadResult);
  rpc Download(FileRequest) returns (stream FileChunk);
}

message FileChunk {
  string file_id = 1;
  int32 chunk_index = 2;
  int32 total_chunks = 3;
  bytes data = 4;           // 64KB-256KB per chunk
}
```

**Load Balancing gRPC:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              gRPC Load Balancing Strategies                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ❌ L4 (TCP) Load Balancer — DOESN'T WORK WELL                              │
│  ────────────────────────────────────────────                               │
│  Client ──► [L4 LB] ──► Server A (gets ALL requests on this connection)     │
│                     ──► Server B (gets nothing — connection sticky)          │
│                                                                              │
│  Because HTTP/2 uses a single persistent connection, L4 balancers           │
│  route ALL RPCs to the same backend.                                        │
│                                                                              │
│  ✓ L7 (Application) Load Balancer — WORKS                                   │
│  ────────────────────────────────────────                                   │
│  Client ──► [L7 LB / Envoy] ──► Server A (RPC 1, RPC 3)                    │
│                              ──► Server B (RPC 2, RPC 4)                    │
│                                                                              │
│  L7 balancers understand HTTP/2 frames and can route individual             │
│  RPCs (streams) to different backends.                                      │
│                                                                              │
│  ✓ Client-Side Load Balancing — ALSO WORKS                                  │
│  ──────────────────────────────────────────                                 │
│  Client ──► Server A (round-robin or weighted)                              │
│         ──► Server B                                                        │
│         ──► Server C                                                        │
│                                                                              │
│  Options: L7 proxy (Envoy, Nginx), Service mesh (Istio, Linkerd),          │
│           Client-side (grpc-js pick_first, round_robin)                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Client-Side Load Balancing:**

```typescript
// NestJS gRPC client with round-robin load balancing
ClientsModule.register([
  {
    name: 'USER_PACKAGE',
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../proto/user.proto'),
      // Use dns:/// scheme for client-side LB with service discovery
      url: 'dns:///user-service:5000',
      channelOptions: {
        // Enable round-robin load balancing
        'grpc.service_config': JSON.stringify({
          loadBalancingConfig: [{ round_robin: {} }],
        }),
        // Connection pool size (one connection per resolved address)
        'grpc.dns_min_time_between_resolutions_ms': 10_000,
      },
    },
  },
]);
```

**Deadlines — Always Set Them:**

```typescript
// Without deadlines, a stalled downstream service can cascade failures
// across your entire system, consuming connections and threads.

// Per-RPC deadline in NestJS
async findUserWithDeadline(id: string): Promise<User> {
  const metadata = new Metadata();
  // This call MUST complete within 3 seconds
  metadata.set('grpc-timeout', '3S');

  return firstValueFrom(
    this.userService.findOne({ id }, metadata).pipe(
      // RxJS timeout as a safety net
      timeout(3500),
    ),
  );
}

// Service config with default deadline
const channelOptions = {
  'grpc.service_config': JSON.stringify({
    methodConfig: [
      {
        name: [{ service: 'user.UserService' }],
        timeout: '5s',                          // Default 5s for all methods
        retryPolicy: {
          maxAttempts: 3,
          initialBackoff: '0.1s',
          maxBackoff: '1s',
          backoffMultiplier: 2,
          retryableStatusCodes: ['UNAVAILABLE'],
        },
      },
      {
        name: [{ service: 'user.UserService', method: 'Delete' }],
        timeout: '10s',                         // 10s for Delete specifically
      },
    ],
  }),
};
```

> **Interview Tip:** The most common mistake with gRPC in production is forgetting that L4 load balancers don't distribute gRPC traffic properly. Always use L7 load balancing (Envoy, Nginx with grpc_pass, or a service mesh). If asked about gRPC performance tuning, hit these three points: (1) always set deadlines, (2) use L7 load balancing, (3) configure keepalive to detect dead connections early.

**Follow-up Questions to Expect:**
- "How would you handle a gRPC service that needs to return 100MB of data?"
- "Why doesn't a traditional Nginx/ELB work well with gRPC?"
- "How do you monitor gRPC performance — what metrics do you track?"

---

## Q9: gRPC-Web for Browser Clients

### Q: Why can't browsers use gRPC directly? How does gRPC-Web solve this, and what are the alternatives?

**Answer:**

Standard gRPC requires HTTP/2 with **trailers** — a feature that browser Fetch/XHR APIs do not expose. Browsers can initiate HTTP/2 connections, but they cannot access HTTP/2 trailers, which gRPC uses to send status codes and trailing metadata after the response body.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Browser to gRPC — The Problem                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Standard gRPC (HTTP/2):                                                    │
│  ┌─────────┐                              ┌──────────┐                      │
│  │ Browser │ ──── CANNOT ────────────────► │ gRPC     │                      │
│  │         │   (no trailer support in      │ Server   │                      │
│  │         │    browser HTTP APIs)         │          │                      │
│  └─────────┘                              └──────────┘                      │
│                                                                              │
│  gRPC-Web Solution:                                                         │
│  ┌─────────┐  HTTP/1.1     ┌────────────┐  HTTP/2    ┌──────────┐          │
│  │ Browser │ ────────────► │ Envoy      │ ─────────► │ gRPC     │          │
│  │ (grpc-  │  grpc-web     │ Proxy      │  native    │ Server   │          │
│  │  web)   │  protocol     │ (gateway)  │  gRPC      │          │          │
│  └─────────┘               └────────────┘            └──────────┘          │
│                                                                              │
│  Alternative — REST Gateway:                                                │
│  ┌─────────┐  REST/JSON    ┌────────────┐  gRPC      ┌──────────┐          │
│  │ Browser │ ────────────► │ API        │ ─────────► │ gRPC     │          │
│  │ (fetch/ │  HTTP/1.1     │ Gateway    │  native    │ Server   │          │
│  │  axios) │               │ (NestJS)   │            │          │          │
│  └─────────┘               └────────────┘            └──────────┘          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**gRPC-Web Protocol:**
- Encodes gRPC messages in a format compatible with HTTP/1.1
- Trailers are moved into the response body (as a special frame)
- Supports unary and server-streaming only (no client or bidi streaming)
- Two content types: `application/grpc-web` (binary) and `application/grpc-web-text` (base64)

**gRPC-Web Client Setup (Frontend):**

```typescript
// Install: npm install grpc-web google-protobuf

// Generated client from protoc with grpc-web plugin
import { UserServiceClient } from './generated/UserServiceClientPb';
import { GetUserRequest, User } from './generated/user_pb';

// Connect to Envoy proxy, NOT directly to gRPC server
const client = new UserServiceClient('https://api.example.com', null, null);

// Unary call
async function getUser(userId: string): Promise<User> {
  const request = new GetUserRequest();
  request.setId(userId);

  return new Promise((resolve, reject) => {
    client.getUser(request, {
      'authorization': `Bearer ${getToken()}`,
    }, (err, response) => {
      if (err) {
        console.error('gRPC-Web error:', err.code, err.message);
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

// Server streaming (supported in gRPC-Web)
function watchUserUpdates(userId: string): void {
  const request = new GetUserRequest();
  request.setId(userId);

  const stream = client.watchUser(request, {
    'authorization': `Bearer ${getToken()}`,
  });

  stream.on('data', (user: User) => {
    console.log('User updated:', user.toObject());
  });

  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });

  stream.on('end', () => {
    console.log('Stream ended');
  });
}
```

**Envoy Proxy Configuration for gRPC-Web:**

```yaml
# envoy.yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: auto
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route:
                            cluster: grpc_service
                            timeout: 30s
                            max_stream_duration:
                              grpc_timeout_header_max: 30s
                      cors:
                        allow_origin_string_match:
                          - prefix: "*"
                        allow_methods: GET, PUT, DELETE, POST, OPTIONS
                        allow_headers: authorization, content-type, x-grpc-web, grpc-timeout
                        expose_headers: grpc-status, grpc-message
                        max_age: "1728000"
                http_filters:
                  - name: envoy.filters.http.grpc_web    # gRPC-Web translation
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
                  - name: envoy.filters.http.cors
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: grpc_service
      connect_timeout: 5s
      type: LOGICAL_DNS
      lb_policy: ROUND_ROBIN
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}    # Connect to upstream via HTTP/2
      load_assignment:
        cluster_name: grpc_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: grpc-server, port_value: 5000 }
```

**gRPC-Web Limitations:**

| Feature | Native gRPC | gRPC-Web |
|---------|-------------|----------|
| Unary RPC | Yes | Yes |
| Server streaming | Yes | Yes |
| Client streaming | Yes | No |
| Bidirectional streaming | Yes | No |
| Binary transport | Yes | Yes (or base64) |
| No proxy needed | Yes | No (Envoy required) |
| Full HTTP/2 | Yes | HTTP/1.1 or HTTP/2 without trailers |

**Alternative: REST/GraphQL Gateway (often more practical):**

```typescript
// NestJS API Gateway — REST endpoints that call gRPC internally
// This is often simpler than gRPC-Web for browser clients

@Controller('api/users')
export class UserGatewayController {
  constructor(private readonly userGrpcClient: UserClientService) {}

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto> {
    const grpcUser = await this.userGrpcClient.findUser(id);
    return this.toDto(grpcUser);  // Transform protobuf → REST DTO
  }

  @Post()
  async createUser(@Body() dto: CreateUserRestDto): Promise<UserDto> {
    const grpcUser = await this.userGrpcClient.createUser({
      email: dto.email,
      name: dto.name,
      password: dto.password,
    });
    return this.toDto(grpcUser);
  }

  // For real-time, use SSE (Server-Sent Events) which browsers support natively
  @Sse('stream')
  streamUsers(): Observable<MessageEvent> {
    return this.userGrpcClient.watchUsersStream().pipe(
      map((user) => ({
        data: this.toDto(user),
      } as MessageEvent)),
    );
  }

  private toDto(user: any): UserDto {
    return { id: user.id, email: user.email, name: user.name };
  }
}
```

> **Interview Tip:** When asked about browser clients and gRPC, the practical answer is usually a **REST or GraphQL API gateway** in front of gRPC services. gRPC-Web works but adds operational complexity (Envoy proxy). The gateway pattern is widely used at companies like Google (Cloud APIs have REST + gRPC) and is easier for frontend teams who already know REST/GraphQL.

**Follow-up Questions to Expect:**
- "Would you use gRPC-Web or a REST gateway? What factors influence the decision?"
- "How do you handle real-time updates for browsers when your backend is gRPC?"
- "What about Connect protocol as an alternative to gRPC-Web?"

---

## Q10: gRPC in Microservices Architecture

### Q: How does gRPC fit into a microservices architecture? Walk through service contracts, code generation, and inter-service communication patterns.

**Answer:**

gRPC excels in microservices because it provides a strongly-typed contract (proto files) that can generate clients and servers in any language, enabling polyglot architectures with compile-time safety.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                gRPC Microservices Architecture                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  External Clients (Browser/Mobile)                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────┐                                           │
│  │      API Gateway (REST)       │  REST/GraphQL for external               │
│  │      (NestJS + Swagger)       │                                          │
│  └──────────┬──────┬────────────┘                                           │
│             │      │                                                         │
│          gRPC   gRPC                                                        │
│             │      │                                                         │
│    ┌────────▼──┐ ┌─▼──────────┐ ┌─────────────┐                            │
│    │  User     │ │  Order     │ │  Payment    │  Internal gRPC             │
│    │  Service  │◄│  Service   │►│  Service    │  communication             │
│    │  (NestJS) │ │  (NestJS)  │ │  (Go)       │                            │
│    └─────┬─────┘ └────┬───────┘ └──────┬──────┘                            │
│          │            │                │                                     │
│          │         gRPC             gRPC                                    │
│          │            │                │                                     │
│    ┌─────▼─────┐ ┌────▼───────┐ ┌─────▼───────┐                            │
│    │  Auth     │ │ Inventory  │ │ Notification│                             │
│    │  Service  │ │ Service    │ │ Service     │                             │
│    │  (NestJS) │ │ (Rust)     │ │ (Python)    │                             │
│    └───────────┘ └────────────┘ └─────────────┘                             │
│                                                                              │
│  Shared Proto Repository (source of truth for all service contracts)        │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │  proto-repo/                                                  │           │
│  │  ├── user/v1/user.proto                                       │           │
│  │  ├── order/v1/order.proto                                     │           │
│  │  ├── payment/v1/payment.proto                                 │           │
│  │  └── common/v1/pagination.proto                               │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Shared Proto Repository Pattern:**

```
proto-repo/
├── buf.yaml                    # Buf configuration (linting + breaking change detection)
├── buf.gen.yaml                # Code generation configuration
├── common/
│   └── v1/
│       ├── pagination.proto    # Shared pagination messages
│       └── error_details.proto # Shared error detail messages
├── user/
│   └── v1/
│       └── user.proto
├── order/
│   └── v1/
│       └── order.proto
├── payment/
│   └── v1/
│       └── payment.proto
└── notification/
    └── v1/
        └── notification.proto
```

```yaml
# buf.yaml — Linting and breaking change detection
version: v1
breaking:
  use:
    - FILE
lint:
  use:
    - DEFAULT
  enum_zero_value_suffix: _UNSPECIFIED
  rpc_allow_google_protobuf_empty_requests: true
  rpc_allow_google_protobuf_empty_responses: true
```

```yaml
# buf.gen.yaml — Code generation for multiple languages
version: v1
plugins:
  # TypeScript (for NestJS services)
  - plugin: buf.build/community/stephenh-ts-proto
    out: gen/ts
    opt:
      - nestJs=true
      - addGrpcMetadata=true
      - env=node

  # Go (for Go services)
  - plugin: buf.build/protocolbuffers/go
    out: gen/go
    opt:
      - paths=source_relative

  # Python (for ML/notification services)
  - plugin: buf.build/protocolbuffers/python
    out: gen/python
```

**Proto File with Cross-Service References:**

```protobuf
// order/v1/order.proto
syntax = "proto3";
package order.v1;

import "common/v1/pagination.proto";
import "user/v1/user.proto";
import "google/protobuf/timestamp.proto";

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}

message OrderItem {
  string product_id = 1;
  string product_name = 2;
  int32 quantity = 3;
  int64 price_cents = 4;
}

message Order {
  string id = 1;
  string user_id = 2;
  repeated OrderItem items = 3;
  int64 total_cents = 4;
  OrderStatus status = 5;
  google.protobuf.Timestamp created_at = 6;
}

message CreateOrderRequest {
  string user_id = 1;
  repeated OrderItem items = 2;
}

message GetOrderRequest {
  string id = 1;
}

message ListOrdersRequest {
  string user_id = 1;
  common.v1.PaginationRequest pagination = 2;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  common.v1.PaginationResponse pagination = 2;
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  rpc WatchOrderStatus(GetOrderRequest) returns (stream Order);
}
```

**Two NestJS Microservices Communicating via gRPC:**

```typescript
// ──────────────────────────────────────────────
// ORDER SERVICE (gRPC server + gRPC client to User Service)
// ──────────────────────────────────────────────

// order-service/src/main.ts
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'order.v1',
        protoPath: join(__dirname, '../proto/order/v1/order.proto'),
        url: '0.0.0.0:5001',
        loader: {
          includeDirs: [join(__dirname, '../proto')],  // For imports
        },
      },
    },
  );
  await app.listen();
}
```

```typescript
// order-service/src/order.module.ts
@Module({
  imports: [
    // Register gRPC client to call User Service
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'user.v1',
          protoPath: join(__dirname, '../proto/user/v1/user.proto'),
          url: 'user-service:5000',
          loader: {
            includeDirs: [join(__dirname, '../proto')],
          },
        },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'payment.v1',
          protoPath: join(__dirname, '../proto/payment/v1/payment.proto'),
          url: 'payment-service:5002',
        },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
```

```typescript
// order-service/src/order.controller.ts
@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @GrpcMethod('OrderService', 'CreateOrder')
  async createOrder(data: CreateOrderRequest, metadata: Metadata): Promise<Order> {
    return this.orderService.create(data, metadata);
  }

  @GrpcMethod('OrderService', 'GetOrder')
  async getOrder(data: GetOrderRequest): Promise<Order> {
    return this.orderService.findById(data.id);
  }
}
```

```typescript
// order-service/src/order.service.ts
@Injectable()
export class OrderService implements OnModuleInit {
  private userService: any;
  private paymentService: any;

  constructor(
    @Inject('USER_SERVICE') private userClient: ClientGrpc,
    @Inject('PAYMENT_SERVICE') private paymentClient: ClientGrpc,
    private readonly orderRepo: OrderRepository,
  ) {}

  onModuleInit() {
    this.userService = this.userClient.getService('UserService');
    this.paymentService = this.paymentClient.getService('PaymentService');
  }

  async create(data: CreateOrderRequest, metadata: Metadata): Promise<Order> {
    // Step 1: Validate user exists (call User Service via gRPC)
    const user = await firstValueFrom(
      this.userService.findOne({ id: data.userId }),
    ).catch((err) => {
      if (err.code === GrpcStatus.NOT_FOUND) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: `User ${data.userId} does not exist`,
        });
      }
      throw err;
    });

    // Step 2: Calculate total
    const totalCents = data.items.reduce(
      (sum, item) => sum + item.priceCents * item.quantity, 0,
    );

    // Step 3: Create order
    const order = await this.orderRepo.create({
      userId: data.userId,
      items: data.items,
      totalCents,
      status: 'ORDER_STATUS_PENDING',
    });

    // Step 4: Initiate payment (call Payment Service via gRPC)
    try {
      await firstValueFrom(
        this.paymentService.createCharge({
          orderId: order.id,
          userId: data.userId,
          amountCents: totalCents,
          currency: 'USD',
        }),
      );

      order.status = 'ORDER_STATUS_CONFIRMED';
      await this.orderRepo.update(order);
    } catch (err) {
      order.status = 'ORDER_STATUS_CANCELLED';
      await this.orderRepo.update(order);
      throw new RpcException({
        code: GrpcStatus.ABORTED,
        message: `Payment failed for order ${order.id}: ${err.message}`,
      });
    }

    return order;
  }
}
```

**gRPC Health Checking Protocol:**

```protobuf
// Standard health check proto (grpc.health.v1)
syntax = "proto3";
package grpc.health.v1;

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
    SERVICE_UNKNOWN = 3;
  }
  ServingStatus status = 1;
}

service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}
```

```typescript
// NestJS health check implementation
@Controller()
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @GrpcMethod('Health', 'Check')
  async check(data: { service: string }): Promise<{ status: string }> {
    try {
      // Check dependencies
      await this.db.ping();
      await this.redis.ping();

      return { status: 'SERVING' };
    } catch {
      return { status: 'NOT_SERVING' };
    }
  }
}
```

**gRPC Reflection (for debugging):**

```typescript
// Enable gRPC reflection so tools like grpcurl can discover services
// Install: npm install @grpc/reflection

import { ReflectionService } from '@grpc/reflection';

// In your main.ts, after creating the gRPC server
const server = app.getHttpServer();  // Get the underlying gRPC server
const reflection = new ReflectionService(packageDefinition);
reflection.addToServer(server);

// Now you can use grpcurl to inspect and call services:
// grpcurl -plaintext localhost:5000 list
// grpcurl -plaintext localhost:5000 describe user.v1.UserService
// grpcurl -plaintext -d '{"id":"123"}' localhost:5000 user.v1.UserService/FindOne
```

**Migration Strategy: REST to gRPC for Internal Services:**

```
Phase 1: Strangler Pattern
──────────────────────────
┌────────────┐  REST   ┌────────────┐
│ Service A  │ ──────► │ Service B  │  (existing)
└────────────┘         └────────────┘

Phase 2: Add gRPC alongside REST
─────────────────────────────────
┌────────────┐  REST   ┌────────────┐
│ Service A  │ ──────► │ Service B  │
│            │  gRPC   │ + gRPC     │  (B now serves both)
│ (feature   │ ──────► │   server   │
│   flag)    │         └────────────┘
└────────────┘

Phase 3: Switch traffic to gRPC
────────────────────────────────
┌────────────┐  gRPC   ┌────────────┐
│ Service A  │ ══════► │ Service B  │  (all traffic via gRPC)
│ (gRPC      │         │ (REST      │
│  client)   │         │  deprecated)│
└────────────┘         └────────────┘

Phase 4: Remove REST endpoint
─────────────────────────────
┌────────────┐  gRPC   ┌────────────┐
│ Service A  │ ══════► │ Service B  │  (REST removed)
└────────────┘         └────────────┘
```

> **Interview Tip:** When discussing gRPC in microservices, always mention the **shared proto repository** pattern. This is how companies like Google, Uber, and Lyft manage API contracts. The proto repo has CI/CD that: (1) lints protos, (2) checks for breaking changes, (3) auto-generates client libraries, (4) publishes them to package registries. This is a strong signal of senior-level architectural thinking.

**Follow-up Questions to Expect:**
- "How do you handle versioning when multiple teams own different proto files?"
- "What happens when the gRPC call between two services times out mid-transaction?"
- "How do you trace a request across multiple gRPC services? (distributed tracing)"

---

## Q11: gRPC vs REST — Interview Decision Framework

### Q: In a system design interview, how do you decide between gRPC and REST? Walk through your decision framework.

**Answer:**

This is a common interview question that tests architectural judgment. The answer is almost never "only gRPC" or "only REST" — it's about choosing the right tool for each layer.

**Decision Matrix:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    API Protocol Decision Framework                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WHO is the consumer?                                                       │
│  ┌────────────────────────────────────────────────────────┐                 │
│  │                                                        │                 │
│  │  Browser/Mobile App (external)                         │                 │
│  │  ├── Need flexible queries? ──► GraphQL                │                 │
│  │  ├── Simple CRUD? ──► REST                             │                 │
│  │  └── Real-time? ──► REST + WebSocket / SSE             │                 │
│  │                                                        │                 │
│  │  Internal Microservice                                 │                 │
│  │  ├── High performance needed? ──► gRPC                 │                 │
│  │  ├── Streaming needed? ──► gRPC                        │                 │
│  │  ├── Polyglot services? ──► gRPC                       │                 │
│  │  └── Simple, few services? ──► REST is fine            │                 │
│  │                                                        │                 │
│  │  Third-Party Developers (public API)                   │                 │
│  │  └── Always REST (or GraphQL) ──► widest compatibility │                 │
│  │                                                        │                 │
│  └────────────────────────────────────────────────────────┘                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Detailed Comparison:**

| Dimension | REST | gRPC | Winner |
|-----------|------|------|--------|
| **Performance** | Good (JSON + HTTP/1.1) | Excellent (Protobuf + HTTP/2) | gRPC |
| **Payload size** | Larger (text, field names) | Smaller (binary, field numbers) | gRPC |
| **Streaming** | SSE, WebSocket (add-on) | Native (4 patterns) | gRPC |
| **Type safety** | Optional (OpenAPI) | Built-in (.proto) | gRPC |
| **Code generation** | Third-party (OpenAPI gen) | Built-in (protoc) | gRPC |
| **Browser support** | Native | Requires proxy (gRPC-Web) | REST |
| **Tooling/debugging** | Excellent (curl, Postman) | Harder (grpcurl, Bloom) | REST |
| **Caching** | HTTP caching, CDN | Custom caching only | REST |
| **Learning curve** | Low | Medium-High | REST |
| **Documentation** | Swagger/OpenAPI (mature) | Proto files (less tooling) | REST |
| **Ecosystem** | Enormous | Growing | REST |
| **API evolution** | URL versioning (v1, v2) | Proto schema evolution | Tie |
| **Error handling** | HTTP status codes (well-known) | gRPC status codes (less known) | REST |
| **Rate limiting** | Standard HTTP headers | Custom metadata | REST |
| **Load balancing** | Any load balancer (L4/L7) | L7 only (or client-side) | REST |

**The Hybrid Architecture (Most Common in Production):**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                   Hybrid REST + gRPC Architecture                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     External World                Internal Infrastructure                   │
│  ┌──────────────────┐         ┌───────────────────────────────────┐         │
│  │                  │         │                                   │         │
│  │  Browser ─┐      │  REST   │   ┌────────┐  gRPC  ┌─────────┐ │         │
│  │           ├──────│────────►│   │  API   │ ═════► │ User    │ │         │
│  │  Mobile ──┘      │  JSON   │   │Gateway │ ═════► │ Service │ │         │
│  │                  │         │   │(NestJS)│        └─────────┘ │         │
│  │  Third-party ────│─ REST ─►│   │        │  gRPC  ┌─────────┐ │         │
│  │  developers      │  JSON   │   │        │ ═════► │ Order   │ │         │
│  │                  │         │   │        │        │ Service │ │         │
│  │                  │         │   └────────┘        └────┬────┘ │         │
│  │                  │         │                     gRPC │       │         │
│  │                  │         │                     ┌────▼────┐  │         │
│  │                  │         │                     │ Payment │  │         │
│  │                  │         │                     │ Service │  │         │
│  │                  │         │                     │ (Go)    │  │         │
│  │                  │         │                     └─────────┘  │         │
│  └──────────────────┘         └───────────────────────────────────┘         │
│                                                                              │
│  External: REST/GraphQL (broad compatibility, developer experience)         │
│  Internal: gRPC (performance, type safety, streaming)                       │
│  Gateway: Translates REST ↔ gRPC                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Sample Interview Answer:**

> "For this system design, I'd use a hybrid approach. External-facing APIs — the mobile app and third-party integrations — would use REST with OpenAPI docs, because that's what frontend teams and partners expect. Internally, between our microservices, I'd use gRPC for three reasons: (1) strong typing via proto files catches integration bugs at compile time rather than production, (2) the binary protocol gives us significantly lower latency for the hot path between Order and Payment services, and (3) we need server streaming for the live order tracking feature. The API gateway layer — built with NestJS — would translate REST to gRPC, so external clients get a familiar REST interface while we get gRPC performance internally."

**Common Design Interview Scenario:**

*"Design a real-time food delivery tracking system"*

```
┌─────────────────────────────────────────────────────────────────┐
│  Food Delivery System — Protocol Choices                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mobile App ──── REST/GraphQL ────► API Gateway                 │
│       │                                  │                       │
│       └── WebSocket ──► Tracking         │                       │
│           (live location)  Gateway        │                       │
│                               │    gRPC  │                       │
│                               ▼          ▼                       │
│                         ┌──────────┐ ┌──────────┐               │
│                         │ Location │ │ Order    │               │
│                         │ Service  │ │ Service  │               │
│                         └────┬─────┘ └────┬─────┘               │
│                              │            │                      │
│                         gRPC │       gRPC │                      │
│                              ▼            ▼                      │
│                         ┌──────────┐ ┌──────────┐               │
│                         │ Driver   │ │ Payment  │               │
│                         │ Service  │ │ Service  │               │
│                         └──────────┘ └──────────┘               │
│                                                                  │
│  Protocol rationale:                                            │
│  - Mobile → Gateway: REST (compatibility, caching)              │
│  - Live tracking: WebSocket (browser support, bidirectional)    │
│  - Internal services: gRPC (performance, streaming, typing)     │
│  - Location updates: gRPC server streaming (driver → service)   │
└─────────────────────────────────────────────────────────────────┘
```

> **Interview Tip:** Never say "I'd use gRPC for everything" or "I'd use REST for everything." The strongest answer demonstrates contextual judgment — choosing the right protocol for each boundary. External = REST/GraphQL, internal = gRPC, real-time to browser = WebSocket/SSE. Justify each choice with specific technical reasons.

**Follow-up Questions to Expect:**
- "What's the operational overhead of maintaining both REST and gRPC?"
- "How do you ensure consistency between the REST API and the underlying gRPC contracts?"
- "Would you use Connect (connectrpc.com) as a middle ground between REST and gRPC?"

---

## Quick Reference

### gRPC Status Codes

| Code | Name | HTTP | Retryable | Common Cause |
|------|------|------|-----------|--------------|
| 0 | OK | 200 | N/A | Success |
| 1 | CANCELLED | 499 | No | Client cancelled |
| 2 | UNKNOWN | 500 | Maybe | Unhandled error |
| 3 | INVALID_ARGUMENT | 400 | No | Bad input |
| 4 | DEADLINE_EXCEEDED | 504 | Yes | Timeout |
| 5 | NOT_FOUND | 404 | No | Missing resource |
| 6 | ALREADY_EXISTS | 409 | No | Duplicate create |
| 7 | PERMISSION_DENIED | 403 | No | Insufficient perms |
| 8 | RESOURCE_EXHAUSTED | 429 | Yes (backoff) | Rate limit |
| 9 | FAILED_PRECONDITION | 400 | No | Wrong state |
| 10 | ABORTED | 409 | Yes | Concurrency conflict |
| 11 | OUT_OF_RANGE | 400 | No | Past end of range |
| 12 | UNIMPLEMENTED | 501 | No | Not implemented |
| 13 | INTERNAL | 500 | Maybe | Server bug |
| 14 | UNAVAILABLE | 503 | Yes | Transient failure |
| 15 | DATA_LOSS | 500 | No | Unrecoverable |
| 16 | UNAUTHENTICATED | 401 | No (refresh token) | Bad/missing auth |

### Protobuf Scalar Types Quick Reference

| Type | Wire Type | Bytes | Best For |
|------|-----------|-------|----------|
| `int32` | Varint | 1-5 | Small positive integers |
| `int64` | Varint | 1-10 | Large positive integers |
| `sint32` | Varint (ZigZag) | 1-5 | Integers that may be negative |
| `sint64` | Varint (ZigZag) | 1-10 | Large integers that may be negative |
| `uint32` | Varint | 1-5 | Unsigned integers |
| `uint64` | Varint | 1-10 | Large unsigned integers |
| `fixed32` | 32-bit | 4 | Values often > 2^28 |
| `fixed64` | 64-bit | 8 | Values often > 2^56 |
| `float` | 32-bit | 4 | Floating point |
| `double` | 64-bit | 8 | High-precision float |
| `bool` | Varint | 1 | True/false |
| `string` | Length-delimited | varies | UTF-8 text |
| `bytes` | Length-delimited | varies | Raw binary data |

### Common Proto Patterns Cheat Sheet

```protobuf
// 1. Pagination
message PaginationRequest {
  int32 page_size = 1;
  string page_token = 2;
}
message PaginationResponse {
  string next_page_token = 1;
  int32 total_count = 2;
}

// 2. Field Mask (partial updates)
import "google/protobuf/field_mask.proto";
message UpdateUserRequest {
  User user = 1;
  google.protobuf.FieldMask update_mask = 2;
  // Client sets update_mask to {"paths": ["name", "email"]}
  // Server only updates those fields
}

// 3. Wrapper Types (nullable scalars)
import "google/protobuf/wrappers.proto";
message Filter {
  google.protobuf.StringValue name = 1;       // null = not set
  google.protobuf.Int32Value min_age = 2;      // null = no filter
}

// 4. Timestamp and Duration
import "google/protobuf/timestamp.proto";
import "google/protobuf/duration.proto";
message Session {
  google.protobuf.Timestamp started_at = 1;
  google.protobuf.Duration ttl = 2;
}

// 5. Any (dynamic typing — use sparingly)
import "google/protobuf/any.proto";
message Event {
  string type = 1;
  google.protobuf.Any payload = 2;
}

// 6. Oneof (mutually exclusive fields)
message NotificationTarget {
  oneof target {
    string email = 1;
    string phone = 2;
    string webhook_url = 3;
  }
}

// 7. Enum with prefix convention
enum TaskStatus {
  TASK_STATUS_UNSPECIFIED = 0;
  TASK_STATUS_PENDING = 1;
  TASK_STATUS_RUNNING = 2;
  TASK_STATUS_COMPLETED = 3;
  TASK_STATUS_FAILED = 4;
}
```

### NestJS gRPC Configuration Reference

```typescript
// Server Configuration
{
  transport: Transport.GRPC,
  options: {
    package: 'package.name',                   // Must match proto package
    protoPath: join(__dirname, 'path/to/file.proto'),
    url: '0.0.0.0:5000',                      // Listen address
    loader: {
      keepCase: true,                          // Don't camelCase fields
      longs: String,                           // int64 → string
      enums: String,                           // enum → string name
      defaults: true,                          // Include default values
      oneofs: true,                            // Include oneof info
      includeDirs: ['/path/to/proto/root'],    // For imports
    },
    credentials: ServerCredentials.createSsl(...),  // TLS
    channelOptions: {
      'grpc.max_receive_message_length': 10_485_760,
      'grpc.max_send_message_length': 10_485_760,
      'grpc.keepalive_time_ms': 120_000,
      'grpc.keepalive_timeout_ms': 20_000,
      'grpc.max_concurrent_streams': 100,
    },
  },
}

// Client Configuration
ClientsModule.register([{
  name: 'PACKAGE_TOKEN',
  transport: Transport.GRPC,
  options: {
    package: 'package.name',
    protoPath: join(__dirname, 'path/to/file.proto'),
    url: 'service-host:5000',
    credentials: ChannelCredentials.createSsl(...),  // TLS
    channelOptions: { ... },
  },
}])

// Key Decorators
@GrpcMethod('ServiceName', 'MethodName')      // Unary RPC handler
@GrpcStreamMethod('ServiceName', 'MethodName') // Streaming RPC handler
@Inject('PACKAGE_TOKEN')                       // Inject gRPC client

// Key Classes
ClientGrpc                // gRPC client proxy
RpcException              // gRPC error class
Metadata                  // gRPC metadata (headers/trailers)
```

---

*Guide prepared for Senior/Lead Backend Engineer interview preparation. Focus on the decision framework (Q11) for system design interviews and NestJS implementation details (Q5) for coding interviews.*
