# Project 3: GraphQL Subscription-Based Real-Time Chat

> **Stack**: NestJS + GraphQL (Apollo) + Redis Pub/Sub + PostgreSQL + WebSocket
> **Relevance**: Common system design question. Demonstrates GraphQL subscriptions, real-time patterns, presence system.
> **Estimated Build Time**: 6-8 hours

---

## What You'll Learn

- GraphQL subscriptions over WebSocket (graphql-ws protocol)
- Redis Pub/Sub for distributed subscription delivery across multiple server instances
- Message persistence and cursor-based pagination
- User presence system (online/offline/typing indicators)
- Read receipts and unread counts
- Horizontal scaling of GraphQL subscription servers

---

## System Architecture

```
┌──────────┐  GraphQL WS   ┌────────────────┐    ┌─────────┐
│  Client  │◀─────────────▶│  NestJS API    │───▶│ Postgres│
│  (React) │  Subscription  │  + Apollo WS   │    │  (msgs) │
└──────────┘               └───────┬────────┘    └─────────┘
                                   │
                              ┌────▼────┐
                              │  Redis  │
                              │ Pub/Sub │ (cross-instance delivery)
                              └─────────┘
```

**Data flow summary**:
- Clients connect to NestJS via WebSocket for subscriptions and HTTP for queries/mutations.
- Messages are persisted to PostgreSQL, then broadcast via Redis Pub/Sub.
- Redis also holds ephemeral state: presence, typing indicators, unread counts.
- Every NestJS instance subscribes to relevant Redis channels and pushes updates to its locally connected WebSocket clients.

---

## Core Features

1. **Direct Messages (1:1 chat)** - private conversations between two users
2. **Group Channels (many-to-many)** - shared rooms with membership management
3. **Typing indicators** - ephemeral, TTL-based via Redis
4. **Online/offline presence** - real-time status broadcast
5. **Read receipts** - per-user, per-channel read cursors
6. **Unread message counts** - maintained in Redis for fast retrieval
7. **Message search** - full-text search across channels a user belongs to
8. **File attachments** - S3 presigned URLs, never proxied through the API

---

## GraphQL Schema

```graphql
# ──────────── Types ────────────

type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  status: PresenceStatus!
  lastSeenAt: DateTime
}

enum PresenceStatus {
  ONLINE
  AWAY
  OFFLINE
}

type Channel {
  id: ID!
  name: String
  type: ChannelType!
  members: [User!]!
  lastMessage: Message
  createdAt: DateTime!
}

enum ChannelType {
  DIRECT
  GROUP
}

type Message {
  id: ID!
  channel: Channel!
  sender: User!
  content: String!
  type: MessageType!
  replyTo: Message
  attachments: [Attachment!]
  editedAt: DateTime
  createdAt: DateTime!
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}

type Attachment {
  id: ID!
  url: String!
  filename: String!
  size: Int!
  mimeType: String!
}

# Cursor-based pagination wrapper
type MessageConnection {
  edges: [MessageEdge!]!
  pageInfo: PageInfo!
}

type MessageEdge {
  node: Message!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type TypingIndicator {
  channelId: ID!
  user: User!
  isTyping: Boolean!
}

type PresenceChange {
  user: User!
  status: PresenceStatus!
}

type ReadReceipt {
  channelId: ID!
  userId: ID!
  readAt: DateTime!
}

type UnreadCount {
  channelId: ID!
  count: Int!
}

# ──────────── Queries ────────────

type Query {
  channels: [Channel!]!
  messages(channelId: ID!, cursor: String, limit: Int = 20): MessageConnection!
  searchMessages(query: String!, channelId: ID): [Message!]!
  unreadCounts: [UnreadCount!]!
}

# ──────────── Mutations ────────────

type Mutation {
  sendMessage(channelId: ID!, content: String!, type: MessageType = TEXT, replyToId: ID): Message!
  createChannel(name: String, type: ChannelType!, memberIds: [ID!]!): Channel!
  joinChannel(channelId: ID!): Channel!
  leaveChannel(channelId: ID!): Boolean!
  markAsRead(channelId: ID!): Boolean!
  startTyping(channelId: ID!): Boolean!
  stopTyping(channelId: ID!): Boolean!
}

# ──────────── Subscriptions ────────────

type Subscription {
  onNewMessage(channelId: ID!): Message!
  onTyping(channelId: ID!): TypingIndicator!
  onPresenceChange: PresenceChange!
  onMessageRead(channelId: ID!): ReadReceipt!
}
```

---

## Subscription Flow (Step by Step)

```
1. Client connects via WebSocket using the graphql-ws protocol.
   → Connection includes JWT in connectionParams for authentication.

2. Client subscribes:
   subscription {
     onNewMessage(channelId: "ch-1") {
       id
       content
       sender { name }
       createdAt
     }
   }

3. Server-side handling:
   a. Apollo validates the subscription operation.
   b. NestJS resolver registers a listener on Redis Pub/Sub channel "chat:ch-1".
   c. Subscription is now "active" — waiting for events.

4. User B sends a message (mutation → sendMessage):
   a. Message is validated and saved to PostgreSQL.
   b. Server publishes to Redis Pub/Sub channel "chat:ch-1" with the message payload.
   c. ALL NestJS instances subscribed to "chat:ch-1" receive the Redis message.
   d. Each instance iterates its locally connected WebSocket clients subscribed
      to onNewMessage(channelId: "ch-1") and pushes the message.

5. Client A (subscribed) receives the message in real-time via WebSocket.
```

**Why Redis Pub/Sub here?** Without it, only the server instance that processed the mutation would know about the new message. Redis Pub/Sub acts as the cross-instance broadcast bus.

---

## Database Schema

```sql
-- ──── Users ────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    avatar_url  TEXT,
    last_seen_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──── Channels ────
CREATE TABLE channels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100),
    type        VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group')),
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──── Channel Members ────
CREATE TABLE channel_members (
    channel_id  UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    role        VARCHAR(10) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    PRIMARY KEY (channel_id, user_id)
);

-- ──── Messages ────
CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id   UUID REFERENCES users(id),
    content     TEXT NOT NULL,
    type        VARCHAR(10) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    reply_to_id UUID REFERENCES messages(id),
    edited_at   TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Critical index for message pagination (newest first per channel)
CREATE INDEX idx_messages_channel_time ON messages (channel_id, created_at DESC);

-- Full-text search index
CREATE INDEX idx_messages_search ON messages USING GIN (to_tsvector('english', content));

-- ──── Attachments ────
CREATE TABLE attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    filename    VARCHAR(255) NOT NULL,
    size        BIGINT NOT NULL,
    mime_type   VARCHAR(100) NOT NULL
);
```

---

## Directory Structure

```
chat-app/
├── src/
│   ├── app.module.ts            # Root module — imports all feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── jwt.strategy.ts      # HTTP JWT validation
│   │   ├── ws-auth.guard.ts     # WebSocket connection auth (extracts JWT from connectionParams)
│   │   └── auth.guard.ts        # Standard HTTP guard
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.resolver.ts    # User queries
│   │   ├── users.service.ts
│   │   └── presence.service.ts  # Online/offline tracking via Redis
│   ├── channels/
│   │   ├── channels.module.ts
│   │   ├── channels.resolver.ts # CRUD + membership mutations
│   │   └── channels.service.ts
│   ├── messages/
│   │   ├── messages.module.ts
│   │   ├── messages.resolver.ts # sendMessage mutation, messages query (cursor pagination)
│   │   ├── messages.service.ts  # Persistence + search logic
│   │   └── unread.service.ts    # Redis-backed unread counts
│   ├── subscriptions/
│   │   ├── subscriptions.module.ts
│   │   ├── pubsub.provider.ts   # Redis-backed PubSub instance (graphql-redis-subscriptions)
│   │   ├── chat.resolver.ts     # @Subscription() handlers for messages, typing, presence
│   │   └── events.constants.ts  # Event name constants (MESSAGE_ADDED, TYPING, etc.)
│   └── uploads/
│       ├── uploads.module.ts
│       └── uploads.service.ts   # S3 presigned URL generation
├── docker-compose.yml           # PostgreSQL, Redis, NestJS app
├── schema.gql                   # Full GraphQL schema (generated or hand-written)
└── .env                         # DB URL, Redis URL, JWT secret, S3 config
```

---

## Redis Data Structures

```
1. PRESENCE — Who is online right now

   Structure: Redis SET "online-users"
   Operations:
     SADD "online-users" "user-1"       → user comes online
     SREM "online-users" "user-1"       → user goes offline
     SISMEMBER "online-users" "user-1"  → check if online
     SMEMBERS "online-users"            → list all online users

   Why a SET? O(1) add/remove, easy membership check, no duplicates.


2. TYPING INDICATORS — Ephemeral, self-expiring

   Structure: Redis KEY with TTL
   Key pattern: "typing:{channelId}:{userId}"
   Operations:
     SET "typing:ch-1:user-1" "1" EX 3  → user is typing (expires in 3s)
     DEL "typing:ch-1:user-1"           → user explicitly stopped typing
     KEYS "typing:ch-1:*"               → list who is typing in ch-1

   Why TTL? If client disconnects mid-typing, the indicator auto-clears.
   No stale "User is typing..." forever.


3. UNREAD COUNTS — Fast per-user, per-channel counters

   Structure: Redis HASH
   Key: "unread:{userId}"
   Operations:
     HINCRBY "unread:user-1" "ch-1" 1   → new message arrived in ch-1
     HSET "unread:user-1" "ch-1" 0      → user read channel ch-1
     HGETALL "unread:user-1"            → fetch all unread counts for sidebar

   Why Redis HASH? Single key per user, O(1) per channel, avoids DB round-trips
   for a value that changes on every single message.


4. PUB/SUB CHANNELS — Cross-instance message delivery

   "chat:{channelId}"        → message delivery for a specific channel
   "presence"                → online/offline status broadcasts
   "typing:{channelId}"      → typing indicator broadcasts

   These are Redis Pub/Sub channels (not data structures).
   Messages are fire-and-forget — not persisted in Redis.
```

---

## Cursor-Based Pagination (Messages)

```
WHY CURSOR, NOT OFFSET?

Chat messages are inserted constantly. With offset pagination:
  - Page 1: messages 1-20, user scrolls up
  - New message arrives (shifts everything by 1)
  - Page 2: messages 20-39 → message 20 is duplicated!

With cursor pagination, the cursor points to a specific message,
so new insertions don't affect the next page fetch.


QUERY EXAMPLE:

  messages(channelId: "ch-1", cursor: "msg-50", limit: 20)

  Translates to SQL:
    SELECT * FROM messages
    WHERE channel_id = 'ch-1'
      AND created_at < (SELECT created_at FROM messages WHERE id = 'msg-50')
    ORDER BY created_at DESC
    LIMIT 21   -- fetch limit+1 to determine hasNextPage


RESPONSE SHAPE:

  {
    "edges": [
      { "node": { "id": "msg-49", "content": "..." }, "cursor": "msg-49" },
      { "node": { "id": "msg-48", "content": "..." }, "cursor": "msg-48" },
      ...
    ],
    "pageInfo": {
      "hasNextPage": true,
      "endCursor": "msg-30"
    }
  }

  Client uses endCursor as the cursor for the next page.
  If hasNextPage is false, all older messages have been loaded.


CURSOR ENCODING:

  The cursor is typically Base64-encoded: btoa("msg-50") → "bXNnLTUw"
  This prevents clients from guessing cursor structure or tampering with it.
  Server decodes: atob("bXNnLTUw") → "msg-50"
```

---

## Presence System

```
USER COMES ONLINE
─────────────────
1. Client opens WebSocket connection to NestJS.
2. WS auth guard extracts JWT from connectionParams, validates it.
3. On successful connection:
   a. SADD "online-users" "{userId}"
   b. Publish to Redis "presence" channel: { userId, status: ONLINE }
4. All clients subscribed to onPresenceChange receive the update.
5. Sidebar shows green dot next to user's name.


USER GOES OFFLINE
─────────────────
1. WebSocket disconnects (tab close, network drop, etc.).
2. NestJS onDisconnect handler fires:
   a. SREM "online-users" "{userId}"
   b. UPDATE users SET last_seen_at = NOW() WHERE id = '{userId}'
   c. Publish to Redis "presence" channel: { userId, status: OFFLINE }
3. Other clients receive presence update.


HEARTBEAT / STALE CONNECTION HANDLING
─────────────────────────────────────
- graphql-ws protocol includes built-in ping/pong.
- Server pings every 15 seconds; if no pong within 30 seconds → force disconnect.
- This prevents ghost "online" users whose connections silently died.


TYPING INDICATOR FLOW
─────────────────────
1. Client detects keystrokes in message input.
2. Debounce: send startTyping mutation at most once every 2 seconds.
3. Server:
   a. SET "typing:ch-1:user-1" "1" EX 3
   b. Publish to Redis "typing:ch-1": { userId: "user-1", isTyping: true }
4. Subscribed clients show "User 1 is typing..."
5. Key expires after 3 seconds → user "stopped typing" (no explicit call needed).
6. If user sends the message, call stopTyping to clear immediately.
```

---

## Read Receipts

```
USER OPENS CHANNEL ch-1
───────────────────────
1. Client sends mutation: markAsRead(channelId: "ch-1")

2. Server-side:
   a. UPDATE channel_members
      SET last_read_at = NOW()
      WHERE channel_id = 'ch-1' AND user_id = '{userId}'

   b. HSET "unread:{userId}" "ch-1" 0
      (Reset Redis unread counter)

   c. Publish to Redis "chat:ch-1":
      { type: "READ_RECEIPT", userId: "user-1", readAt: timestamp }

3. Other channel members subscribed to onMessageRead(channelId: "ch-1")
   receive the read receipt.

4. UI updates:
   - Sender sees "Read by User A" under their messages.
   - Message list shows double-check marks (or similar indicator).


UNREAD COUNT ON NEW MESSAGE
───────────────────────────
When sendMessage is processed:
  For each member of the channel who is NOT the sender:
    HINCRBY "unread:{memberId}" "ch-1" 1

  Client sidebar polls or subscribes to unread counts to show badge numbers.
```

---

## Horizontal Scaling

```
                    ┌─ WS Server 1 (users A, C) ─┐
Client A ──▶ ALB ──┤                              ├──▶ Redis Pub/Sub
Client B ──▶ ALB ──┤                              │    (broadcasts to all)
Client C ──▶ ALB ──└─ WS Server 2 (user B)   ────┘


THE PROBLEM WITHOUT REDIS PUB/SUB:
  User A is on Server 1, User B is on Server 2.
  User B sends a message → Server 2 processes it.
  Server 2 only knows about its own WebSocket connections.
  User A (on Server 1) never receives the message.


THE SOLUTION — REDIS AS A MESSAGE BUS:
  1. Server 2 saves the message to PostgreSQL.
  2. Server 2 publishes to Redis "chat:ch-1".
  3. Server 1 AND Server 2 both subscribe to "chat:ch-1".
  4. Server 1 receives the Redis message → pushes to User A via WebSocket.
  5. Server 2 receives the Redis message → pushes to User B via WebSocket.


LOAD BALANCER CONFIGURATION:
  - WebSocket connections are long-lived → needs sticky sessions or
    connection-level routing (not round-robin per request).
  - ALB supports WebSocket natively — just enable stickiness on the target group.
  - Alternative: use a separate WebSocket endpoint with its own ALB rules.


KEY PACKAGE: graphql-redis-subscriptions
  - Drop-in replacement for Apollo's default in-memory PubSub.
  - Same API: pubSub.publish() and pubSub.asyncIterator().
  - Under the hood: publishes to Redis instead of in-process EventEmitter.
```

---

## NestJS Pseudo Config

### GraphQL Module Setup

```
GraphQLModule.forRoot({
  driver: ApolloDriver
  autoSchemaFile: 'schema.gql'         → code-first schema generation
  subscriptions: {
    'graphql-ws': {                    → modern WebSocket protocol
      onConnect: (context) => {
        extract JWT from context.connectionParams.authToken
        validate token, attach user to context
        if invalid → throw and reject connection
      }
      onDisconnect: (context) => {
        trigger presence.setOffline(userId)
      }
    }
  }
  context: ({ req, connection }) => {
    if connection → return { user: connection.context.user }  (WS)
    if req → return { user: req.user }                        (HTTP)
  }
})
```

### Redis PubSub Provider

```
Provider: 'PUB_SUB'
Factory: () => {
  return new RedisPubSub({
    publisher: new Redis({ host: REDIS_HOST, port: 6379 })
    subscriber: new Redis({ host: REDIS_HOST, port: 6379 })
  })
}
Scope: Singleton (one instance shared across the app)

Note: RedisPubSub requires TWO Redis connections —
one for publishing, one for subscribing. This is a Redis protocol requirement.
```

### Subscription Resolver

```
@Resolver()
ChatSubscriptionResolver {

  inject: PUB_SUB as pubSub

  @Subscription(() => Message, {
    filter: (payload, variables) => {
      return payload.onNewMessage.channelId === variables.channelId
    }
  })
  onNewMessage(@Args('channelId') channelId: string) {
    // Verify user is a member of this channel (authorization)
    return pubSub.asyncIterator('MESSAGE_ADDED')
  }

  @Subscription(() => TypingIndicator)
  onTyping(@Args('channelId') channelId: string) {
    return pubSub.asyncIterator(`TYPING_${channelId}`)
  }

  @Subscription(() => PresenceChange)
  onPresenceChange() {
    return pubSub.asyncIterator('PRESENCE_CHANGE')
  }
}
```

### WebSocket Auth Guard

```
WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    extract the GQL context from the execution context
    get the user object (attached during onConnect)
    if no user → throw UnauthorizedException
    return true
  }
}

Applied via @UseGuards(WsAuthGuard) on subscription resolvers.
```

---

## Docker Compose (Pseudo Config)

```yaml
services:

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: chat
      POSTGRES_USER: chat_user
      POSTGRES_PASSWORD: chat_pass
    ports: "5432:5432"
    volumes: pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: "6379:6379"

  app:
    build: .
    ports: "3000:3000"
    environment:
      DATABASE_URL: postgresql://chat_user:chat_pass@postgres:5432/chat
      REDIS_HOST: redis
      JWT_SECRET: your-secret
      AWS_S3_BUCKET: chat-uploads
    depends_on: [postgres, redis]

volumes:
  pgdata:
```

---

## Scaling and Production Considerations

| Concern | Approach |
|---|---|
| **WebSocket connection limits** | ~10K concurrent connections per server instance. Scale horizontally behind ALB. |
| **Redis Pub/Sub throughput** | Handles millions of messages/sec. Not the bottleneck until extreme scale. |
| **Message table growth** | Partition by channel_id or by created_at (monthly). Archive old messages to cold storage. |
| **Message search** | Start with PostgreSQL GIN index + to_tsvector. Graduate to Elasticsearch for advanced search (fuzzy, filters). |
| **File uploads** | Generate S3 presigned URLs. Client uploads directly to S3. Never proxy file bytes through the API server. |
| **Push notifications** | Offline users need FCM/APNs. When publishing a message, check if recipients are in the "online-users" set. If not, queue a push notification (integrate with Project 1's notification system). |
| **Message ordering** | Use created_at from the server (not client timestamps). For strict ordering within a channel, consider a per-channel sequence number. |
| **Rate limiting** | Limit sendMessage to ~10 msgs/sec per user. Limit typing mutations to 1 per 2 seconds. |

---

## Interview Talking Points

**"Why GraphQL subscriptions instead of raw WebSocket?"**
- Type safety — subscriptions use the same schema as queries/mutations.
- Client specifies exactly which fields it needs (no over-fetching).
- Built-in authentication via connectionParams.
- Easier to maintain one protocol (GraphQL) than two (REST + raw WS).
- Trade-off: more overhead per message compared to raw WS. For ultra-low-latency use cases (gaming), raw WS may be better.

**"Why Redis Pub/Sub for horizontal scaling?"**
- In-memory PubSub only works for a single server instance.
- Redis Pub/Sub is fire-and-forget — no persistence, minimal overhead.
- Every server subscribes to the channels it cares about.
- Alternative: Redis Streams (if you need message durability), Kafka (if you need replay).

**"Cursor vs offset pagination for chat?"**
- Offset breaks when new messages arrive (duplicate or skipped items).
- Cursor-based is stable — always fetches relative to a known message.
- Chat is append-heavy and always paginated backwards (oldest first) — perfect fit for cursors.

**"How would you handle message ordering?"**
- Server-assigned timestamps (not client) for the source of truth.
- Within a channel, messages are ordered by created_at DESC.
- For distributed writes, a per-channel atomic counter (Redis INCR) guarantees strict ordering.

**"How would you scale this to 1M concurrent users?"**
- 100 WebSocket server instances behind ALB (10K connections each).
- Redis Pub/Sub for cross-instance delivery.
- PostgreSQL read replicas for message queries.
- Partition messages table by channel_id.
- Cache hot channels in Redis (recent messages).
- CDN for static assets and file attachments.
- Push notifications for offline users to reduce persistent connections.

---

## What to Practice

- **Whiteboard the subscription flow**: Client connects → subscribes → mutation triggers → Redis broadcasts → client receives. Draw every hop.
- **Explain cursor-based pagination**: Be ready to write the SQL and describe the response shape with edges/pageInfo.
- **Discuss trade-offs**: Polling unread counts vs subscribing? (Polling is simpler, subscribing is real-time but more connections.)
- **Handle follow-up questions**:
  - "What about end-to-end encryption?" — Signal protocol, keys exchanged out-of-band, server stores only ciphertext.
  - "How do you handle 10K-member group channels?" — Fan-out on write becomes expensive. Consider fan-out on read (clients poll for large groups) or dedicated message queues per large channel.
  - "What if Redis goes down?" — Subscription delivery fails, but messages are still persisted in PostgreSQL. Clients can fall back to polling. Redis Sentinel or Cluster for HA.
  - "How do you test subscriptions?" — Integration tests with graphql-ws client, mock Redis in unit tests, load test with k6 or Artillery for WebSocket connections.
