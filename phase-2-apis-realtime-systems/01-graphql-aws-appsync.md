# GraphQL & AWS AppSync - Interview Q&A

## Table of Contents
1. [GraphQL Fundamentals](#graphql-fundamentals)
2. [Schema Design](#schema-design)
3. [Resolvers](#resolvers)
4. [Subscriptions](#subscriptions)
5. [Batching & DataLoader](#batching--dataloader)
6. [AWS AppSync](#aws-appsync)
7. [Authentication & Authorization](#authentication--authorization)
8. [Caching](#caching)
9. [Federation vs Standalone](#federation-vs-standalone)
10. [Best Practices](#best-practices)

---

## GraphQL Fundamentals

### Q1: What is GraphQL and how does it differ from REST?

**Answer:**
GraphQL is a query language for APIs and a runtime for executing those queries. It allows clients to request exactly the data they need.

| Aspect | GraphQL | REST |
|--------|---------|------|
| Data Fetching | Single endpoint, client specifies data | Multiple endpoints, server defines response |
| Over-fetching | No - get exactly what you ask | Yes - fixed response structure |
| Under-fetching | No - get all needed data in one request | Yes - may need multiple requests |
| Versioning | Typically not needed (schema evolution) | Version via URL or headers |
| Type System | Strongly typed schema | No inherent type system |
| Documentation | Self-documenting (introspection) | External documentation needed |
| Caching | Complex (POST requests) | Simple (HTTP caching) |

```graphql
# GraphQL Query - Get exactly what you need
query {
  user(id: "123") {
    name
    email
    orders(last: 5) {
      id
      total
      items {
        productName
        quantity
      }
    }
  }
}

# REST Equivalent - Multiple requests needed
# GET /users/123
# GET /users/123/orders?limit=5
# GET /orders/{orderId}/items (for each order)
```

### Q2: Explain the core operations in GraphQL: Query, Mutation, and Subscription.

**Answer:**

```graphql
# 1. QUERY - Read operations (like GET)
type Query {
  # Get single user
  user(id: ID!): User

  # Get list with filtering and pagination
  users(
    filter: UserFilter
    pagination: PaginationInput
  ): UserConnection!

  # Search across multiple types
  search(term: String!): [SearchResult!]!
}

# Example query
query GetUserWithOrders {
  user(id: "123") {
    id
    name
    email
    orders(status: COMPLETED) {
      id
      total
    }
  }
}

# 2. MUTATION - Write operations (like POST, PUT, DELETE)
type Mutation {
  # Create
  createUser(input: CreateUserInput!): CreateUserPayload!

  # Update
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!

  # Delete
  deleteUser(id: ID!): DeleteUserPayload!

  # Complex operation
  placeOrder(input: PlaceOrderInput!): PlaceOrderPayload!
}

# Example mutation
mutation CreateUser {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
    password: "securepass123"
  }) {
    user {
      id
      name
      email
    }
    errors {
      field
      message
    }
  }
}

# 3. SUBSCRIPTION - Real-time updates (WebSocket)
type Subscription {
  # Subscribe to new messages in a channel
  messageAdded(channelId: ID!): Message!

  # Subscribe to order status changes
  orderStatusChanged(orderId: ID!): Order!

  # Subscribe to user presence
  userPresenceChanged(roomId: ID!): PresenceUpdate!
}

# Example subscription
subscription OnNewMessage {
  messageAdded(channelId: "general") {
    id
    content
    sender {
      name
      avatar
    }
    createdAt
  }
}
```

---

## Schema Design

### Q3: How do you design a GraphQL schema? What are the best practices?

**Answer:**

```graphql
# 1. Define clear, domain-specific types
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  role: UserRole!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationships
  profile: Profile
  orders(
    first: Int
    after: String
    status: OrderStatus
  ): OrderConnection!

  # Computed fields
  totalSpent: Float!
  isVerified: Boolean!
}

# 2. Use enums for fixed sets of values
enum UserRole {
  ADMIN
  MANAGER
  CUSTOMER
  GUEST
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

# 3. Use input types for mutations
input CreateUserInput {
  email: String!
  name: String!
  password: String!
  role: UserRole = CUSTOMER
}

input UpdateUserInput {
  name: String
  avatar: String
}

# 4. Use interfaces for shared fields
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

type User implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  # ... other fields
}

# 5. Use unions for polymorphic types
union SearchResult = User | Product | Order | Article

type Query {
  search(term: String!): [SearchResult!]!
}

# Querying union
query Search {
  search(term: "phone") {
    ... on User {
      id
      name
      email
    }
    ... on Product {
      id
      name
      price
    }
    ... on Order {
      id
      total
      status
    }
  }
}

# 6. Implement Relay-style pagination
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type UserEdge {
  cursor: String!
  node: User!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# 7. Use payload types for mutations (allows returning errors)
type CreateUserPayload {
  user: User
  errors: [UserError!]!
  success: Boolean!
}

type UserError {
  field: String
  message: String!
  code: ErrorCode!
}

# 8. Custom scalars for special types
scalar DateTime
scalar Email
scalar URL
scalar JSON
scalar Upload

# 9. Directives for metadata
directive @deprecated(reason: String) on FIELD_DEFINITION
directive @auth(requires: UserRole!) on FIELD_DEFINITION
directive @rateLimit(max: Int!, window: Int!) on FIELD_DEFINITION

type Query {
  adminStats: Stats! @auth(requires: ADMIN)

  oldEndpoint: String @deprecated(reason: "Use newEndpoint instead")

  search(term: String!): [SearchResult!]! @rateLimit(max: 100, window: 60)
}
```

### Q4: How do you handle relationships and avoid N+1 queries?

**Answer:**

```graphql
# Schema with relationships
type User {
  id: ID!
  name: String!
  posts: [Post!]!
  followers: [User!]!
  following: [User!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  comments: [Comment!]!
  likes: Int!
}
```

```typescript
// N+1 Problem Example
// Query: Get all users with their posts
// Without optimization:
// 1 query for users
// N queries for each user's posts (where N = number of users)

// SOLUTION: DataLoader (batching + caching)
import DataLoader from 'dataloader';

// Create DataLoader for batching
const postsByUserLoader = new DataLoader<string, Post[]>(
  async (userIds: readonly string[]) => {
    // Single query for all users' posts
    const posts = await db.posts.findMany({
      where: { authorId: { in: [...userIds] } }
    });

    // Group posts by userId
    const postsByUser = userIds.map(userId =>
      posts.filter(post => post.authorId === userId)
    );

    return postsByUser;
  }
);

// Resolver using DataLoader
const resolvers = {
  User: {
    posts: (parent: User, args, context) => {
      return context.loaders.postsByUser.load(parent.id);
    }
  }
};

// Context factory - create new loaders per request
function createContext(req: Request) {
  return {
    loaders: {
      postsByUser: new DataLoader(batchPostsByUser),
      userById: new DataLoader(batchUsersById),
      commentsByPost: new DataLoader(batchCommentsByPost),
    }
  };
}

// Advanced: Nested batching
const userLoader = new DataLoader<string, User>(
  async (userIds: readonly string[]) => {
    const users = await db.users.findMany({
      where: { id: { in: [...userIds] } }
    });

    // Ensure order matches input
    const userMap = new Map(users.map(u => [u.id, u]));
    return userIds.map(id => userMap.get(id) || null);
  }
);

// Using DataLoader in nested resolvers
const resolvers = {
  Post: {
    author: (post, args, { loaders }) => {
      return loaders.userById.load(post.authorId);
    },
    comments: (post, args, { loaders }) => {
      return loaders.commentsByPost.load(post.id);
    }
  },
  Comment: {
    author: (comment, args, { loaders }) => {
      return loaders.userById.load(comment.authorId);
    }
  }
};

// Result: Complex nested query with minimal database calls
/*
query {
  posts {           # 1 query
    title
    author {        # 1 batched query (all authors)
      name
    }
    comments {      # 1 batched query (all comments)
      content
      author {      # 1 batched query (all comment authors)
        name
      }
    }
  }
}
Total: 4 queries instead of 1 + N + M + K
*/
```

---

## Resolvers

### Q5: Explain GraphQL resolvers and the resolver chain.

**Answer:**

```typescript
// Resolver signature
type Resolver = (
  parent: any,      // Result from parent resolver
  args: any,        // Arguments passed to field
  context: any,     // Shared context (auth, loaders, etc.)
  info: GraphQLResolveInfo  // Query AST information
) => any;

// Complete resolver example
const resolvers = {
  // Root Query resolvers
  Query: {
    user: async (_, { id }, { dataSources, currentUser }) => {
      // Authentication check
      if (!currentUser) {
        throw new AuthenticationError('Not authenticated');
      }

      return dataSources.userAPI.getUser(id);
    },

    users: async (_, { filter, pagination }, { dataSources }) => {
      const { first = 10, after } = pagination || {};

      return dataSources.userAPI.getUsers({
        filter,
        limit: first,
        cursor: after,
      });
    },

    // Field with complex arguments
    search: async (_, { term, types, limit = 10 }, { dataSources }) => {
      const results = await Promise.all([
        types?.includes('USER') && dataSources.userAPI.search(term, limit),
        types?.includes('POST') && dataSources.postAPI.search(term, limit),
        types?.includes('PRODUCT') && dataSources.productAPI.search(term, limit),
      ]);

      return results.flat().filter(Boolean);
    },
  },

  // Mutation resolvers
  Mutation: {
    createUser: async (_, { input }, { dataSources, currentUser }) => {
      try {
        // Validate input
        const errors = validateCreateUserInput(input);
        if (errors.length > 0) {
          return { user: null, errors, success: false };
        }

        // Create user
        const user = await dataSources.userAPI.create(input);

        // Emit event for other services
        await pubsub.publish('USER_CREATED', { userCreated: user });

        return { user, errors: [], success: true };
      } catch (error) {
        return {
          user: null,
          errors: [{ field: null, message: error.message, code: 'INTERNAL' }],
          success: false,
        };
      }
    },

    updateUser: async (_, { id, input }, { dataSources, currentUser }) => {
      // Authorization check
      if (currentUser.id !== id && currentUser.role !== 'ADMIN') {
        throw new ForbiddenError('Not authorized');
      }

      const user = await dataSources.userAPI.update(id, input);
      return { user, errors: [], success: true };
    },
  },

  // Type resolvers (field-level)
  User: {
    // Computed field
    fullName: (user) => `${user.firstName} ${user.lastName}`,

    // Async field with DataLoader
    posts: (user, { first, after }, { loaders }) => {
      return loaders.postsByUser.load({
        userId: user.id,
        first,
        after,
      });
    },

    // Field with authorization
    email: (user, _, { currentUser }) => {
      // Only show email to self or admin
      if (currentUser?.id === user.id || currentUser?.role === 'ADMIN') {
        return user.email;
      }
      return null;
    },

    // Field that requires another query
    orderStats: async (user, _, { dataSources }) => {
      const orders = await dataSources.orderAPI.getByUser(user.id);
      return {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, o) => sum + o.total, 0),
        averageOrderValue: orders.length > 0
          ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
          : 0,
      };
    },
  },

  // Union type resolver
  SearchResult: {
    __resolveType(obj) {
      if (obj.email) return 'User';
      if (obj.price) return 'Product';
      if (obj.total) return 'Order';
      return null;
    },
  },

  // Interface resolver
  Node: {
    __resolveType(obj) {
      if (obj.email) return 'User';
      if (obj.title) return 'Post';
      if (obj.name && obj.price) return 'Product';
      return null;
    },
  },

  // Custom scalar resolvers
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO-8601 DateTime',
    serialize(value: Date) {
      return value.toISOString();
    },
    parseValue(value: string) {
      return new Date(value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }
      return null;
    },
  }),

  // Subscription resolvers
  Subscription: {
    messageAdded: {
      subscribe: (_, { channelId }, { pubsub, currentUser }) => {
        // Verify user has access to channel
        return pubsub.asyncIterator(`MESSAGE_ADDED_${channelId}`);
      },
      resolve: (payload) => payload.messageAdded,
    },

    orderStatusChanged: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('ORDER_STATUS_CHANGED'),
        (payload, variables, { currentUser }) => {
          // Only send to order owner
          return payload.order.userId === currentUser.id;
        }
      ),
    },
  },
};

// Resolver composition with middleware
const authMiddleware = async (resolve, parent, args, context, info) => {
  if (!context.currentUser) {
    throw new AuthenticationError('Must be logged in');
  }
  return resolve(parent, args, context, info);
};

const loggingMiddleware = async (resolve, parent, args, context, info) => {
  const start = Date.now();
  const result = await resolve(parent, args, context, info);
  const duration = Date.now() - start;

  console.log(`${info.parentType.name}.${info.fieldName}: ${duration}ms`);
  return result;
};

// Apply middleware
const resolversWithMiddleware = applyMiddleware(
  resolvers,
  authMiddleware,
  loggingMiddleware
);
```

---

## Subscriptions

### Q6: How do you implement real-time subscriptions in GraphQL?

**Answer:**

```typescript
// 1. Setup PubSub (in-memory for development)
import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

// For production, use Redis PubSub
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const options = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

// 2. Define subscription schema
const typeDefs = gql`
  type Subscription {
    # Simple subscription
    messageAdded(channelId: ID!): Message!

    # Subscription with filter
    orderStatusChanged(userId: ID): Order!

    # Subscription with payload transformation
    newNotification: Notification!

    # Multiple event types
    chatEvent(roomId: ID!): ChatEvent!
  }

  union ChatEvent = Message | UserJoined | UserLeft | TypingIndicator
`;

// 3. Implement subscription resolvers
const resolvers = {
  Subscription: {
    // Basic subscription
    messageAdded: {
      subscribe: (_, { channelId }) => {
        return pubsub.asyncIterator(`CHANNEL_${channelId}_MESSAGES`);
      },
    },

    // With filtering
    orderStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('ORDER_STATUS_CHANGED'),
        (payload, variables, context) => {
          // Filter: only send to relevant user
          if (variables.userId) {
            return payload.orderStatusChanged.userId === variables.userId;
          }
          // Admin sees all
          if (context.currentUser?.role === 'ADMIN') {
            return true;
          }
          // User sees own orders
          return payload.orderStatusChanged.userId === context.currentUser?.id;
        }
      ),
    },

    // With transformation
    newNotification: {
      subscribe: (_, __, { currentUser }) => {
        if (!currentUser) {
          throw new AuthenticationError('Must be logged in');
        }
        return pubsub.asyncIterator(`USER_${currentUser.id}_NOTIFICATIONS`);
      },
      resolve: (payload, _, { currentUser }) => {
        // Transform payload before sending
        return {
          ...payload.notification,
          isRead: false,
          receivedAt: new Date(),
        };
      },
    },

    // Complex chat subscription
    chatEvent: {
      subscribe: async (_, { roomId }, { currentUser, dataSources }) => {
        // Verify user has access to room
        const hasAccess = await dataSources.chatAPI.userCanAccessRoom(
          currentUser.id,
          roomId
        );

        if (!hasAccess) {
          throw new ForbiddenError('No access to this room');
        }

        // Track user as online
        await dataSources.chatAPI.setUserOnline(currentUser.id, roomId);

        // Publish user joined event
        pubsub.publish(`ROOM_${roomId}_EVENTS`, {
          chatEvent: {
            __typename: 'UserJoined',
            user: currentUser,
            timestamp: new Date(),
          },
        });

        return pubsub.asyncIterator(`ROOM_${roomId}_EVENTS`);
      },
    },
  },
};

// 4. Publishing events from mutations
const mutationResolvers = {
  Mutation: {
    sendMessage: async (_, { input }, { currentUser, pubsub, dataSources }) => {
      const message = await dataSources.chatAPI.createMessage({
        channelId: input.channelId,
        content: input.content,
        senderId: currentUser.id,
      });

      // Publish to subscribers
      await pubsub.publish(`CHANNEL_${input.channelId}_MESSAGES`, {
        messageAdded: message,
      });

      return message;
    },

    updateOrderStatus: async (_, { orderId, status }, { pubsub, dataSources }) => {
      const order = await dataSources.orderAPI.updateStatus(orderId, status);

      // Publish status change
      await pubsub.publish('ORDER_STATUS_CHANGED', {
        orderStatusChanged: order,
      });

      // Also notify user
      await pubsub.publish(`USER_${order.userId}_NOTIFICATIONS`, {
        notification: {
          type: 'ORDER_UPDATE',
          title: 'Order Status Updated',
          body: `Your order #${order.id} is now ${status}`,
          data: { orderId: order.id, status },
        },
      });

      return order;
    },
  },
};

// 5. Server setup with subscriptions
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Setup graphql-ws
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Authenticate WebSocket connection
        const token = ctx.connectionParams?.authorization;
        const currentUser = await validateToken(token);

        return {
          currentUser,
          pubsub,
          dataSources: createDataSources(),
        };
      },
      onConnect: async (ctx) => {
        console.log('Client connected');
        // Can reject connection by returning false
        if (!ctx.connectionParams?.authorization) {
          return false;
        }
        return true;
      },
      onDisconnect: async (ctx) => {
        console.log('Client disconnected');
        // Cleanup user presence
        if (ctx.context?.currentUser) {
          await setUserOffline(ctx.context.currentUser.id);
        }
      },
      onSubscribe: async (ctx, msg) => {
        console.log('Subscription started:', msg.payload.operationName);
      },
      onComplete: async (ctx, msg) => {
        console.log('Subscription completed');
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        currentUser: await getCurrentUser(req),
        pubsub,
        dataSources: createDataSources(),
      }),
    })
  );

  httpServer.listen(4000);
}
```

---

## Batching & DataLoader

### Q7: Explain DataLoader and query batching in detail.

**Answer:**

```typescript
import DataLoader from 'dataloader';

// 1. Basic DataLoader pattern
const userLoader = new DataLoader<string, User>(async (userIds) => {
  console.log('Batched user IDs:', userIds);
  // userIds: ['1', '2', '3'] - batched from multiple resolvers

  const users = await db.users.findMany({
    where: { id: { in: [...userIds] } }
  });

  // IMPORTANT: Return in same order as input
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id) || new Error(`User ${id} not found`));
});

// 2. DataLoader with cache key function
const userByEmailLoader = new DataLoader<string, User>(
  async (emails) => {
    const users = await db.users.findMany({
      where: { email: { in: [...emails] } }
    });
    const userMap = new Map(users.map(u => [u.email, u]));
    return emails.map(email => userMap.get(email) || null);
  },
  {
    // Custom cache key
    cacheKeyFn: (email) => email.toLowerCase(),
  }
);

// 3. DataLoader with complex keys
interface PostLoaderKey {
  userId: string;
  status?: string;
  first?: number;
}

const postsByUserLoader = new DataLoader<PostLoaderKey, Post[]>(
  async (keys) => {
    // Group by unique combinations
    const userIds = [...new Set(keys.map(k => k.userId))];

    const posts = await db.posts.findMany({
      where: {
        authorId: { in: userIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter and limit per key
    return keys.map(key => {
      let userPosts = posts.filter(p => p.authorId === key.userId);
      if (key.status) {
        userPosts = userPosts.filter(p => p.status === key.status);
      }
      if (key.first) {
        userPosts = userPosts.slice(0, key.first);
      }
      return userPosts;
    });
  },
  {
    // Must stringify complex keys for caching
    cacheKeyFn: (key) => JSON.stringify(key),
  }
);

// 4. DataLoader factory (create per request)
function createLoaders(db: Database) {
  return {
    user: new DataLoader<string, User>(async (ids) => {
      const users = await db.users.findByIds([...ids]);
      const map = new Map(users.map(u => [u.id, u]));
      return ids.map(id => map.get(id));
    }),

    postsByUser: new DataLoader<string, Post[]>(async (userIds) => {
      const posts = await db.posts.findByUserIds([...userIds]);
      const map = new Map<string, Post[]>();

      for (const post of posts) {
        if (!map.has(post.authorId)) {
          map.set(post.authorId, []);
        }
        map.get(post.authorId)!.push(post);
      }

      return userIds.map(id => map.get(id) || []);
    }),

    commentsByPost: new DataLoader<string, Comment[]>(async (postIds) => {
      const comments = await db.comments.findByPostIds([...postIds]);
      const map = new Map<string, Comment[]>();

      for (const comment of comments) {
        if (!map.has(comment.postId)) {
          map.set(comment.postId, []);
        }
        map.get(comment.postId)!.push(comment);
      }

      return postIds.map(id => map.get(id) || []);
    }),

    // With count
    postCountByUser: new DataLoader<string, number>(async (userIds) => {
      const counts = await db.posts.countByUserIds([...userIds]);
      return userIds.map(id => counts[id] || 0);
    }),
  };
}

// 5. Using loaders in context
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    currentUser: req.user,
    loaders: createLoaders(db), // Fresh loaders per request
  }),
});

// 6. Resolvers using DataLoader
const resolvers = {
  Query: {
    posts: async (_, { first = 10 }, { loaders }) => {
      const posts = await db.posts.findMany({ take: first });

      // Prime the user loader for optimization
      const authorIds = posts.map(p => p.authorId);
      const authors = await loaders.user.loadMany(authorIds);

      return posts;
    },
  },

  Post: {
    author: (post, _, { loaders }) => {
      return loaders.user.load(post.authorId);
    },
    comments: (post, { first = 10 }, { loaders }) => {
      return loaders.commentsByPost.load(post.id);
    },
    commentCount: async (post, _, { loaders }) => {
      const comments = await loaders.commentsByPost.load(post.id);
      return comments.length;
    },
  },

  Comment: {
    author: (comment, _, { loaders }) => {
      return loaders.user.load(comment.authorId);
    },
  },

  User: {
    posts: (user, { first = 10 }, { loaders }) => {
      return loaders.postsByUser.load(user.id);
    },
    postCount: (user, _, { loaders }) => {
      return loaders.postCountByUser.load(user.id);
    },
  },
};

// 7. Query batching (Apollo Client)
// Client-side: batch multiple queries into single HTTP request
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const link = new BatchHttpLink({
  uri: '/graphql',
  batchMax: 10,        // Max queries per batch
  batchInterval: 20,   // Wait 20ms to batch
});

// Server receives:
// [
//   { query: "{ user(id: 1) { name } }" },
//   { query: "{ posts { title } }" },
//   { query: "{ comments { content } }" }
// ]
```

---

## AWS AppSync

### Q8: What is AWS AppSync and how does it differ from self-hosted GraphQL?

**Answer:**

```yaml
# AWS AppSync Features:
# - Fully managed GraphQL service
# - Built-in real-time subscriptions via WebSocket
# - Offline support with Amplify client
# - Direct integration with AWS services (DynamoDB, Lambda, RDS, etc.)
# - Built-in caching
# - Fine-grained authorization with multiple auth modes
```

```typescript
// 1. AppSync Schema Definition (schema.graphql)
type User @model @auth(rules: [
  { allow: owner },
  { allow: groups, groups: ["Admin"] }
]) {
  id: ID!
  email: String!
  name: String!
  posts: [Post] @hasMany
}

type Post @model @auth(rules: [
  { allow: owner },
  { allow: public, operations: [read] }
]) {
  id: ID!
  title: String!
  content: String!
  author: User @belongsTo
}

// 2. VTL (Velocity Template Language) Resolver
// GetUser resolver - Request mapping template
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  }
}

// Response mapping template
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end
$util.toJson($ctx.result)

// 3. JavaScript Resolver (newer approach)
// resolver.js
export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id: ctx.args.id }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}

// 4. Pipeline Resolver (multiple data sources)
// First function: Validate user
export function validateRequest(ctx) {
  if (!ctx.identity.sub) {
    util.unauthorized();
  }
  return { userId: ctx.identity.sub };
}

// Second function: Get user data
export function getUserRequest(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id: ctx.prev.result.userId }),
  };
}

// Third function: Get user's posts
export function getPostsRequest(ctx) {
  return {
    operation: 'Query',
    query: {
      expression: 'authorId = :authorId',
      expressionValues: util.dynamodb.toMapValues({
        ':authorId': ctx.prev.result.id,
      }),
    },
  };
}

// 5. Lambda Resolver
// handler.js
exports.handler = async (event) => {
  const { fieldName, arguments: args, identity } = event;

  switch (fieldName) {
    case 'getUser':
      return await getUser(args.id);
    case 'createUser':
      return await createUser(args.input, identity);
    case 'searchUsers':
      return await searchUsers(args.term);
    default:
      throw new Error(`Unknown field: ${fieldName}`);
  }
};

async function getUser(id) {
  const params = {
    TableName: process.env.USERS_TABLE,
    Key: { id },
  };

  const result = await dynamodb.get(params).promise();
  return result.Item;
}

// 6. Direct Lambda Resolver (AppSync calls Lambda directly)
// With batch invocation for N+1 optimization
exports.handler = async (event) => {
  // event can be single item or batch
  if (Array.isArray(event)) {
    // Batch mode
    const ids = event.map(e => e.arguments.id);
    const users = await batchGetUsers(ids);
    return event.map(e => users.find(u => u.id === e.arguments.id));
  }

  // Single mode
  return await getUser(event.arguments.id);
};

// 7. HTTP Data Source
// Calling external REST API
{
  "version": "2018-05-29",
  "method": "GET",
  "resourcePath": "/users/${ctx.args.id}",
  "params": {
    "headers": {
      "Authorization": "Bearer ${ctx.request.headers.authorization}"
    }
  }
}

// 8. Real-time Subscriptions in AppSync
type Subscription {
  onCreatePost(authorId: ID): Post
    @aws_subscribe(mutations: ["createPost"])

  onUpdateOrder(userId: ID!): Order
    @aws_subscribe(mutations: ["updateOrder"])
}

// Client subscription
import { API, graphqlOperation } from 'aws-amplify';

const subscription = API.graphql(
  graphqlOperation(onCreatePost, { authorId: userId })
).subscribe({
  next: ({ provider, value }) => {
    console.log('New post:', value.data.onCreatePost);
  },
  error: (error) => console.error(error),
});

// Cleanup
subscription.unsubscribe();
```

### Q9: How do you implement caching in AppSync?

**Answer:**

```typescript
// 1. AppSync Caching Configuration (CDK/CloudFormation)
const api = new appsync.GraphqlApi(this, 'Api', {
  name: 'my-api',
  schema: appsync.SchemaFile.fromAsset('schema.graphql'),

  // Enable caching
  xrayEnabled: true,
});

// Add caching behavior
const cachingConfig: appsync.CachingConfig = {
  // Cache at resolver level
  cachingKeys: ['$context.arguments.id'],
  ttl: cdk.Duration.minutes(5),
};

// 2. Resolver-level caching (VTL)
// Request mapping with caching
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  },
  "caching": {
    "keys": [
      "$context.arguments.id"
    ],
    "ttl": 300
  }
}

// 3. Client-side caching with Apollo
import { InMemoryCache, ApolloClient } from '@apollo/client';
import { createAuthLink, createSubscriptionHandshakeLink } from 'aws-appsync-auth-link';

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        user: {
          read(existing, { args, toReference }) {
            return existing || toReference({ __typename: 'User', id: args.id });
          },
        },
        posts: {
          keyArgs: ['status'],
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    User: {
      keyFields: ['id'],
      fields: {
        posts: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

const client = new ApolloClient({
  link: ApolloLink.from([
    createAuthLink({ url, region, auth }),
    createSubscriptionHandshakeLink({ url, region, auth }),
  ]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

// 4. Offline support with Amplify DataStore
import { DataStore } from '@aws-amplify/datastore';
import { User, Post } from './models';

// Automatically syncs with AppSync when online
const user = await DataStore.save(
  new User({
    email: 'john@example.com',
    name: 'John Doe',
  })
);

// Works offline, syncs when back online
const posts = await DataStore.query(Post, (p) =>
  p.authorId.eq(user.id)
);

// Real-time subscription
const subscription = DataStore.observe(Post).subscribe((msg) => {
  console.log(msg.model, msg.opType, msg.element);
});
```

---

## Authentication & Authorization

### Q10: How do you implement authentication and authorization in AppSync?

**Answer:**

```graphql
# 1. Multiple auth modes in schema
type Query {
  # Public access
  getPublicPosts: [Post] @aws_api_key

  # Authenticated users only
  getMyProfile: User @aws_cognito_user_pools

  # IAM authenticated (for Lambda/EC2)
  internalData: InternalData @aws_iam

  # Multiple auth modes
  getPosts: [Post] @aws_api_key @aws_cognito_user_pools
}

# 2. Fine-grained authorization
type Post @aws_cognito_user_pools {
  id: ID!
  title: String!
  content: String!
  authorId: String!

  # Only author can see draft
  draft: String @aws_auth(cognito_groups: ["Authors"])

  # Admin-only field
  analytics: PostAnalytics @aws_auth(cognito_groups: ["Admins"])
}

# 3. Owner-based authorization (Amplify directive)
type Todo @model @auth(rules: [
  # Owner can do everything
  { allow: owner },

  # Admins can do everything
  { allow: groups, groups: ["Admin"] },

  # Authenticated users can read
  { allow: private, operations: [read] },

  # Public can only read
  { allow: public, operations: [read], provider: apiKey }
]) {
  id: ID!
  content: String!
  owner: String
}
```

```typescript
// 4. Cognito User Pool configuration
const api = new appsync.GraphqlApi(this, 'Api', {
  name: 'MyApi',
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: appsync.AuthorizationType.USER_POOL,
      userPoolConfig: {
        userPool,
        appIdClientRegex: 'web-client-.*',
        defaultAction: appsync.UserPoolDefaultAction.ALLOW,
      },
    },
    additionalAuthorizationModes: [
      {
        authorizationType: appsync.AuthorizationType.API_KEY,
        apiKeyConfig: {
          expires: cdk.Expiration.after(cdk.Duration.days(365)),
        },
      },
      {
        authorizationType: appsync.AuthorizationType.IAM,
      },
    ],
  },
});

// 5. Lambda authorizer for custom auth
exports.handler = async (event) => {
  const { authorizationToken, requestContext } = event;

  try {
    // Validate token (JWT, API key, etc.)
    const decodedToken = await validateToken(authorizationToken);

    return {
      isAuthorized: true,
      resolverContext: {
        userId: decodedToken.sub,
        roles: decodedToken.roles,
        permissions: decodedToken.permissions,
      },
      deniedFields: getDeniedFields(decodedToken.roles),
      ttlOverride: 300, // Cache authorization for 5 minutes
    };
  } catch (error) {
    return {
      isAuthorized: false,
    };
  }
};

function getDeniedFields(roles) {
  if (!roles.includes('admin')) {
    return [
      'Query.adminDashboard',
      'Mutation.deleteUser',
      'User.sensitiveData',
    ];
  }
  return [];
}

// 6. Authorization in VTL resolver
// Check ownership
#if($ctx.identity.sub != $ctx.source.ownerId)
  #if(!$ctx.identity.claims.get("cognito:groups").contains("Admin"))
    $util.unauthorized()
  #end
#end

// Check custom claims
#set($roles = $ctx.identity.claims.get("custom:roles"))
#if(!$roles.contains("editor"))
  $util.error("Not authorized to edit", "Unauthorized")
#end

// 7. Authorization in JavaScript resolver
export function request(ctx) {
  const { sub, groups } = ctx.identity;
  const { id } = ctx.args;

  // Get the item first
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id }),
  };
}

export function response(ctx) {
  const item = ctx.result;
  const { sub, groups } = ctx.identity;

  // Check ownership
  if (item.ownerId !== sub && !groups?.includes('Admin')) {
    util.unauthorized();
  }

  // Filter sensitive fields
  if (!groups?.includes('Admin')) {
    delete item.internalNotes;
    delete item.costPrice;
  }

  return item;
}

// 8. Row-level security with DynamoDB
// Use a GSI with userId as partition key
export function request(ctx) {
  const userId = ctx.identity.sub;

  return {
    operation: 'Query',
    index: 'byOwner',
    query: {
      expression: 'ownerId = :ownerId',
      expressionValues: util.dynamodb.toMapValues({
        ':ownerId': userId,
      }),
    },
  };
}
```

---

## Federation vs Standalone

### Q11: Explain GraphQL Federation and when to use it vs standalone.

**Answer:**

```graphql
# STANDALONE GRAPHQL
# - Single schema, single service
# - Simpler to develop and deploy
# - Best for: Small/medium apps, single team

# FEDERATED GRAPHQL (Apollo Federation)
# - Multiple services, unified schema
# - Each service owns part of the graph
# - Best for: Large organizations, multiple teams, microservices

# ===== Federation Example =====

# 1. Users Service (users-service/schema.graphql)
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

# 2. Products Service (products-service/schema.graphql)
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  description: String
}

type Query {
  product(id: ID!): Product
  products(category: String): [Product!]!
}

# 3. Reviews Service (reviews-service/schema.graphql)
# Extends User and Product types!
extend type User @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
  averageRating: Float
}

type Review @key(fields: "id") {
  id: ID!
  body: String!
  rating: Int!
  author: User!
  product: Product!
}

type Query {
  review(id: ID!): Review
}

type Mutation {
  createReview(input: CreateReviewInput!): Review!
}

# 4. Orders Service (orders-service/schema.graphql)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
}

type Order @key(fields: "id") {
  id: ID!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
  user: User!
}

type OrderItem {
  product: Product!
  quantity: Int!
  price: Float!
}
```

```typescript
// 5. Implementing a Federated Service
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@requires", "@provides"])

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const resolvers = {
  Query: {
    user: (_, { id }) => users.find(u => u.id === id),
    users: () => users,
  },
  User: {
    // Reference resolver - called by gateway when another service needs User
    __resolveReference: (reference) => {
      return users.find(u => u.id === reference.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

// 6. Reviews Service extending User
const typeDefs = gql`
  extend type User @key(fields: "id") {
    id: ID! @external
    reviews: [Review!]!
  }

  extend type Product @key(fields: "id") {
    id: ID! @external
    reviews: [Review!]!
    averageRating: Float @requires(fields: "id")
  }

  type Review @key(fields: "id") {
    id: ID!
    body: String!
    rating: Int!
    author: User!
    product: Product!
  }
`;

const resolvers = {
  User: {
    reviews: (user) => reviews.filter(r => r.authorId === user.id),
  },
  Product: {
    reviews: (product) => reviews.filter(r => r.productId === product.id),
    averageRating: (product) => {
      const productReviews = reviews.filter(r => r.productId === product.id);
      if (productReviews.length === 0) return null;
      return productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    },
  },
  Review: {
    author: (review) => ({ __typename: 'User', id: review.authorId }),
    product: (review) => ({ __typename: 'Product', id: review.productId }),
  },
};

// 7. Apollo Gateway (Router)
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://users-service:4001/graphql' },
      { name: 'products', url: 'http://products-service:4002/graphql' },
      { name: 'reviews', url: 'http://reviews-service:4003/graphql' },
      { name: 'orders', url: 'http://orders-service:4004/graphql' },
    ],
  }),
});

const server = new ApolloServer({
  gateway,
});

// 8. Federated Query Example
/*
query GetUserWithEverything {
  user(id: "123") {
    id
    name                    # From users service
    email                   # From users service
    reviews {               # From reviews service
      rating
      body
      product {             # Reference to products service
        name
        price
      }
    }
    orders {                # From orders service
      id
      total
      status
      items {
        quantity
        product {           # Reference to products service
          name
          price
        }
      }
    }
  }
}
*/
```

**When to use Federation vs Standalone:**

| Aspect | Standalone | Federation |
|--------|------------|------------|
| Team Size | Small (1-3 devs) | Large (multiple teams) |
| Deployment | Single deployment | Independent deployments |
| Schema Size | Manageable | Large/complex |
| Domains | Single domain | Multiple bounded contexts |
| Latency | Lower | Higher (gateway overhead) |
| Complexity | Lower | Higher |
| Scaling | Vertical | Horizontal per service |

---

## Best Practices

### Q12: What are GraphQL best practices for production?

**Answer:**

```typescript
// 1. Query Complexity & Depth Limiting
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(10), // Max query depth
    createComplexityLimitRule(1000, {
      // Field complexity costs
      scalarCost: 1,
      objectCost: 10,
      listFactor: 20,
    }),
  ],
});

// 2. Persisted Queries (security + performance)
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { createHash } from 'crypto';

// Client sends hash instead of full query
// POST /graphql
// { "extensions": { "persistedQuery": { "sha256Hash": "abc123..." } } }

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new RedisCache({ host: 'redis' }),
  },
  plugins: [
    ApolloServerPluginLandingPageDisabled(), // Disable in production
  ],
});

// 3. Error Handling
const resolvers = {
  Mutation: {
    createUser: async (_, { input }, { dataSources }) => {
      try {
        const user = await dataSources.userAPI.create(input);
        return {
          __typename: 'CreateUserSuccess',
          user,
        };
      } catch (error) {
        if (error.code === 'DUPLICATE_EMAIL') {
          return {
            __typename: 'DuplicateEmailError',
            message: 'Email already exists',
            email: input.email,
          };
        }
        if (error.code === 'VALIDATION_ERROR') {
          return {
            __typename: 'ValidationError',
            message: 'Validation failed',
            errors: error.errors,
          };
        }
        throw error; // Unknown error
      }
    },
  },
};

// Schema with union for errors
const typeDefs = gql`
  union CreateUserResult = CreateUserSuccess | DuplicateEmailError | ValidationError

  type CreateUserSuccess {
    user: User!
  }

  type DuplicateEmailError {
    message: String!
    email: String!
  }

  type ValidationError {
    message: String!
    errors: [FieldError!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): CreateUserResult!
  }
`;

// 4. Logging & Monitoring
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart(requestContext) {
        const start = Date.now();

        return {
          async didResolveOperation(ctx) {
            logger.info({
              operationName: ctx.operationName,
              query: ctx.request.query,
              variables: ctx.request.variables,
            });
          },

          async willSendResponse(ctx) {
            const duration = Date.now() - start;

            logger.info({
              operationName: ctx.operationName,
              duration,
              errors: ctx.errors?.length || 0,
            });

            // Send to metrics
            metrics.histogram('graphql.request.duration', duration, {
              operation: ctx.operationName,
            });
          },

          async didEncounterErrors(ctx) {
            for (const error of ctx.errors) {
              logger.error({
                message: error.message,
                path: error.path,
                stack: error.originalError?.stack,
              });
            }
          },
        };
      },
    },
  ],
});

// 5. Schema Documentation
const typeDefs = gql`
  """
  Represents a user in the system.
  Users can have multiple orders and reviews.
  """
  type User {
    "Unique identifier"
    id: ID!

    "User's email address (unique)"
    email: String!

    "User's display name"
    name: String!

    """
    User's orders with optional filtering.
    Returns the most recent orders first.
    """
    orders(
      "Maximum number of orders to return"
      first: Int = 10

      "Filter by order status"
      status: OrderStatus
    ): [Order!]!
  }
`;

// 6. Input Validation
import { UserInputError } from '@apollo/server';
import * as yup from 'yup';

const createUserSchema = yup.object({
  email: yup.string().email().required(),
  name: yup.string().min(2).max(100).required(),
  password: yup.string().min(8).required(),
});

const resolvers = {
  Mutation: {
    createUser: async (_, { input }) => {
      try {
        await createUserSchema.validate(input, { abortEarly: false });
      } catch (error) {
        throw new UserInputError('Validation failed', {
          validationErrors: error.errors,
        });
      }

      // Proceed with creation...
    },
  },
};

// 7. N+1 Prevention with query planning
const resolvers = {
  Query: {
    posts: async (_, args, { dataSources, info }) => {
      // Check if author is requested
      const requestedFields = getRequestedFields(info);

      const options = {
        include: [],
      };

      if (requestedFields.includes('author')) {
        options.include.push('author');
      }

      if (requestedFields.includes('comments')) {
        options.include.push('comments');
      }

      return dataSources.postAPI.findAll(options);
    },
  },
};
```

---

## Quick Reference

| Concept | Key Points |
|---------|------------|
| Query | Read data, can be cached |
| Mutation | Write data, sequential execution |
| Subscription | Real-time updates via WebSocket |
| DataLoader | Batch + cache for N+1 prevention |
| Federation | Distributed schema, multiple services |
| AppSync | AWS managed, VTL/JS resolvers |
| Auth | Cognito, API Key, IAM, Lambda authorizer |
| Caching | Server (AppSync), Client (Apollo) |

---

## Common Interview Questions

1. How do you prevent N+1 queries in GraphQL?
2. Explain the difference between Query, Mutation, and Subscription.
3. When would you use Federation over a monolithic schema?
4. How do you handle authentication in AppSync?
5. What are the trade-offs between VTL and Lambda resolvers?
6. How do you implement pagination in GraphQL?
7. What is schema stitching vs federation?
8. How do you handle errors in GraphQL?
9. Explain the resolver execution order.
10. How do you secure a GraphQL API against malicious queries?
11. Explain query depth and complexity limiting strategies.
12. How do you implement the Result pattern for error handling in GraphQL?
13. Compare schema stitching vs federation in depth.
14. Implement Relay-style cursor pagination.

---

## GraphQL Security

### Q13: GraphQL Security — Query Depth & Complexity Limiting

**Answer:**

GraphQL APIs are vulnerable to abuse because clients control the shape of queries. Without limits, attackers can craft deeply nested or highly complex queries that overwhelm your server.

**Why unlimited queries are dangerous:**

| Attack Type | Description | Example |
|-------------|-------------|---------|
| Nested Query Attack | Deeply nested relationships cause exponential DB calls | `user { posts { author { posts { author { ... } } } } }` |
| Alias Attack | Same field requested many times via aliases | `a1: user(id:1) { ... } a2: user(id:2) { ... }` (x1000) |
| Circular Fragments | Fragments referencing each other | Fragment A spreads B, B spreads A |
| Field Duplication | Repeating expensive fields | Requesting computed fields hundreds of times |

```typescript
// 1. Query Depth Limiting
// Install: npm install graphql-depth-limit
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(7, { ignore: ['__schema', '__type'] }),
    // Queries deeper than 7 levels are rejected
  ],
});

// Example: This query has depth 5
// query {                      # depth 0
//   user(id: "1") {            # depth 1
//     posts {                  # depth 2
//       comments {             # depth 3
//         author {             # depth 4
//           name               # depth 5
//         }
//       }
//     }
//   }
// }

// 2. Query Complexity Analysis
// Install: npm install graphql-query-complexity
import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
} from 'graphql-query-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart: () => ({
        async didResolveOperation({ request, document, schema }) {
          const complexity = getComplexity({
            schema,
            operationName: request.operationName,
            query: document,
            variables: request.variables,
            estimators: [
              // Use field extensions first (custom costs)
              fieldExtensionsEstimator(),
              // Fallback to simple estimator
              simpleEstimator({ defaultComplexity: 1 }),
            ],
          });

          const MAX_COMPLEXITY = 1000;

          if (complexity > MAX_COMPLEXITY) {
            throw new GraphQLError(
              `Query complexity ${complexity} exceeds maximum ${MAX_COMPLEXITY}`,
              { extensions: { code: 'QUERY_TOO_COMPLEX', complexity } },
            );
          }

          // Log complexity for monitoring
          console.log(`Query complexity: ${complexity}`);
        },
      }),
    },
  ],
});

// 3. Define per-field complexity in schema
const typeDefs = gql`
  type Query {
    users(first: Int = 10): [User!]!
      @complexity(value: 5, multipliers: ["first"])
    # Cost = 5 * first (e.g., first=10 => cost=50)

    expensiveReport: Report!
      @complexity(value: 100)
  }

  type User {
    id: ID!            # cost: 1 (default)
    name: String!      # cost: 1 (default)
    posts(first: Int = 10): [Post!]!
      @complexity(value: 3, multipliers: ["first"])
    # Nested cost = 3 * first
  }
`;

// Custom complexity in resolvers with field extensions
const resolvers = {
  Query: {
    users: {
      extensions: {
        complexity: ({ args, childComplexity }) => {
          // childComplexity = sum of requested child field costs
          return (args.first || 10) * childComplexity;
        },
      },
      resolve: (_, args) => fetchUsers(args),
    },
  },
};

// 4. Persisted Queries / Allowlisted Queries
// Only allow pre-registered queries in production

// Step 1: Extract queries at build time
// queries.json generated from client code
const allowedQueries = new Map<string, string>([
  ['abc123hash', 'query GetUser($id: ID!) { user(id: $id) { id name email } }'],
  ['def456hash', 'query ListPosts($first: Int) { posts(first: $first) { id title } }'],
]);

// Step 2: Server plugin to enforce allowlist
const persistedQueriesPlugin = {
  requestDidStart: () => ({
    async didResolveOperation({ request }) {
      const hash = request.extensions?.persistedQuery?.sha256Hash;

      if (process.env.NODE_ENV === 'production') {
        if (!hash || !allowedQueries.has(hash)) {
          throw new GraphQLError('Only persisted queries allowed in production', {
            extensions: { code: 'PERSISTED_QUERY_REQUIRED' },
          });
        }
      }
    },
  }),
};

// Using Apollo Automatic Persisted Queries (APQ)
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new KeyValueCache(), // Redis-backed cache
    ttl: 900, // 15 minutes
  },
});

// 5. Disabling Introspection in Production
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    // Also disable landing page in production
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault(),
  ],
});

// 6. Rate Limiting per Query Complexity
import { RateLimiterRedis } from 'rate-limiter-flexible';

const complexityRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'gql_complexity',
  points: 10000,     // 10,000 complexity points
  duration: 60,       // Per 60 seconds
});

const rateLimitPlugin = {
  requestDidStart: () => ({
    async didResolveOperation({ request, document, schema, contextValue }) {
      const complexity = getComplexity({
        schema,
        query: document,
        variables: request.variables,
        estimators: [simpleEstimator({ defaultComplexity: 1 })],
      });

      const userId = contextValue.currentUser?.id || contextValue.ip;

      try {
        await complexityRateLimiter.consume(userId, complexity);
      } catch (rateLimitError) {
        throw new GraphQLError('Rate limit exceeded — query too complex', {
          extensions: {
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil(rateLimitError.msBeforeNext / 1000),
          },
        });
      }
    },
  }),
};
```

> **Interview Tip:** When asked "How do you secure a GraphQL API?", always mention multiple layers: depth limiting, complexity analysis, persisted queries, disabled introspection, and rate limiting. Explain that GraphQL requires more security thought than REST because clients control query shape. A strong answer covers both prevention (persisted queries) and mitigation (complexity limits).

---

## GraphQL Error Handling

### Q14: GraphQL Error Handling Strategies

**Answer:**

GraphQL error handling differs from REST because a single request can partially succeed — some fields resolve while others error. Understanding the error format and strategies is critical.

**GraphQL error format (per spec):**

```json
{
  "data": {
    "user": {
      "name": "John",
      "email": null
    }
  },
  "errors": [
    {
      "message": "Not authorized to view email",
      "locations": [{ "line": 4, "column": 5 }],
      "path": ["user", "email"],
      "extensions": {
        "code": "FORBIDDEN",
        "timestamp": "2026-03-13T10:00:00Z"
      }
    }
  ]
}
```

```typescript
// 1. Error Classification: User Errors vs System Errors
// User errors: Bad input, not found, permission denied
// System errors: DB failure, service timeout, bugs

import { GraphQLError } from 'graphql';

// Custom error classes
class NotFoundError extends GraphQLError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        resource,
        id,
      },
    });
  }
}

class ValidationError extends GraphQLError {
  constructor(message: string, fields: Record<string, string>) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        fields,
      },
    });
  }
}

class AuthorizationError extends GraphQLError {
  constructor(message = 'You are not authorized to perform this action') {
    super(message, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

class RateLimitError extends GraphQLError {
  constructor(retryAfter: number) {
    super('Too many requests', {
      extensions: {
        code: 'RATE_LIMITED',
        retryAfter,
      },
    });
  }
}

// 2. Partial Success Responses
// Some fields resolve, others return null with errors
const resolvers = {
  User: {
    email: (user, _, { currentUser }) => {
      // This field errors but other fields still resolve
      if (currentUser.id !== user.id && !currentUser.isAdmin) {
        throw new AuthorizationError('Cannot view other users\' email');
      }
      return user.email;
    },
    posts: async (user, _, { loaders }) => {
      try {
        return await loaders.postsByUser.load(user.id);
      } catch (error) {
        // Log but don't crash the whole query
        logger.error('Failed to load posts', { userId: user.id, error });
        throw new GraphQLError('Failed to load posts', {
          extensions: { code: 'INTERNAL_ERROR' },
        });
      }
    },
  },
};

// 3. Custom Error Formatter — mask internal errors in production
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Log the full error internally
    logger.error('GraphQL Error', {
      message: formattedError.message,
      code: formattedError.extensions?.code,
      path: formattedError.path,
      originalError: error,
    });

    // In production, hide internal error details
    if (process.env.NODE_ENV === 'production') {
      // Known/expected errors — return as-is
      const safeErrorCodes = [
        'NOT_FOUND',
        'VALIDATION_ERROR',
        'FORBIDDEN',
        'UNAUTHENTICATED',
        'BAD_USER_INPUT',
        'RATE_LIMITED',
      ];

      if (safeErrorCodes.includes(formattedError.extensions?.code as string)) {
        return formattedError;
      }

      // Unknown/system errors — mask the details
      return {
        message: 'An unexpected error occurred',
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          // Include requestId for debugging
          requestId: formattedError.extensions?.requestId,
        },
      };
    }

    // In development, return full error details
    return formattedError;
  },
});

// 4. Union Types for Result Handling (Result Pattern)
// Instead of throwing errors, return typed error objects
const typeDefs = gql`
  # Success type
  type CreateOrderSuccess {
    order: Order!
  }

  # Error types
  type InsufficientStockError {
    message: String!
    productId: ID!
    availableQuantity: Int!
    requestedQuantity: Int!
  }

  type InvalidCouponError {
    message: String!
    couponCode: String!
    reason: String!
  }

  type PaymentFailedError {
    message: String!
    paymentProvider: String!
    declineCode: String
  }

  # Union result type
  union CreateOrderResult =
    | CreateOrderSuccess
    | InsufficientStockError
    | InvalidCouponError
    | PaymentFailedError

  type Mutation {
    createOrder(input: CreateOrderInput!): CreateOrderResult!
  }
`;

const resolvers = {
  Mutation: {
    createOrder: async (_, { input }, { dataSources, currentUser }) => {
      // Validate stock
      for (const item of input.items) {
        const product = await dataSources.productAPI.findById(item.productId);
        if (product.stock < item.quantity) {
          return {
            __typename: 'InsufficientStockError',
            message: `Not enough stock for ${product.name}`,
            productId: product.id,
            availableQuantity: product.stock,
            requestedQuantity: item.quantity,
          };
        }
      }

      // Validate coupon
      if (input.couponCode) {
        const coupon = await dataSources.couponAPI.validate(input.couponCode);
        if (!coupon.valid) {
          return {
            __typename: 'InvalidCouponError',
            message: 'Coupon is not valid',
            couponCode: input.couponCode,
            reason: coupon.reason,
          };
        }
      }

      // Process payment
      try {
        const payment = await dataSources.paymentAPI.charge({
          amount: input.total,
          method: input.paymentMethod,
        });

        const order = await dataSources.orderAPI.create({
          ...input,
          userId: currentUser.id,
          paymentId: payment.id,
        });

        return {
          __typename: 'CreateOrderSuccess',
          order,
        };
      } catch (error) {
        if (error.type === 'payment_declined') {
          return {
            __typename: 'PaymentFailedError',
            message: 'Payment was declined',
            paymentProvider: error.provider,
            declineCode: error.declineCode,
          };
        }
        throw error; // Re-throw unexpected errors
      }
    },
  },

  CreateOrderResult: {
    __resolveType: (obj) => obj.__typename,
  },
};

// Client-side handling of union result
/*
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    ... on CreateOrderSuccess {
      order {
        id
        total
        status
      }
    }
    ... on InsufficientStockError {
      message
      productId
      availableQuantity
    }
    ... on InvalidCouponError {
      message
      couponCode
      reason
    }
    ... on PaymentFailedError {
      message
      declineCode
    }
  }
}
*/

// 5. Error Handling Plugin — attach requestId to all errors
const errorTrackingPlugin = {
  requestDidStart: async (requestContext) => {
    const requestId = requestContext.request.http?.headers.get('x-request-id')
      || crypto.randomUUID();

    return {
      async didEncounterErrors(ctx) {
        for (const error of ctx.errors) {
          // Attach requestId to every error
          error.extensions = {
            ...error.extensions,
            requestId,
          };

          // Report to error tracking service (Sentry, Datadog, etc.)
          Sentry.captureException(error.originalError || error, {
            tags: {
              operationName: ctx.operationName,
              requestId,
            },
            extra: {
              query: ctx.request.query,
              variables: ctx.request.variables,
              path: error.path,
            },
          });
        }
      },
    };
  },
};
```

> **Interview Tip:** The union-based Result pattern is the gold standard for GraphQL error handling in mutations. It makes errors part of the schema (typed and discoverable) instead of relying on the error array. Mention that the error array is better for unexpected/system errors, while union types handle expected business logic errors. This shows deep understanding of GraphQL API design.

---

## Schema Stitching vs Federation

### Q15: Schema Stitching vs Federation — Deep Comparison

**Answer:**

Both approaches solve the same problem: composing a single GraphQL API from multiple sources. They differ fundamentally in where composition happens and how schemas are owned.

| Aspect | Schema Stitching | Apollo Federation |
|--------|-----------------|-------------------|
| Composition | At the gateway (merge schemas) | At build time (supergraph) |
| Type Ownership | Gateway resolves conflicts | Each service owns its types |
| Extending Types | Manual delegation | `@key`, `@extends` directives |
| Service Awareness | Services don't know about each other | Services declare relationships |
| Gateway Complexity | High (custom resolvers for cross-schema) | Lower (automated query planning) |
| Tooling | `@graphql-tools/stitch` | Apollo Router / Gateway |
| Maturity | Older approach | Modern, actively maintained |

```typescript
// ===== SCHEMA STITCHING =====
// Using @graphql-tools/stitch

import { stitchSchemas } from '@graphql-tools/stitch';
import { delegateToSchema } from '@graphql-tools/delegate';
import { RenameTypes, FilterRootFields } from '@graphql-tools/wrap';

// 1. Basic Schema Stitching
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: usersSchema,          // Remote or local schema
      executor: usersExecutor,       // How to call the service
      transforms: [
        // Rename types to avoid conflicts
        new RenameTypes((name) => `Users_${name}`),
      ],
    },
    {
      schema: productsSchema,
      executor: productsExecutor,
    },
    {
      schema: ordersSchema,
      executor: ordersExecutor,
      // Only expose certain root fields
      transforms: [
        new FilterRootFields(
          (operation, fieldName) =>
            operation === 'Query' && ['order', 'orders'].includes(fieldName),
        ),
      ],
    },
  ],
  // Type merging configuration
  typeMergingOptions: {
    // Automatically merge types with the same name
    typeCandidateMerger: (candidates) => candidates[0],
  },
});

// 2. Cross-schema Type Merging (the hard part of stitching)
const gatewaySchema = stitchSchemas({
  subschemas: [
    {
      schema: usersSchema,
      executor: usersExecutor,
      merge: {
        User: {
          // How to fetch a User from this service
          fieldName: 'user',
          selectionSet: '{ id }',
          args: (originalObject) => ({ id: originalObject.id }),
        },
      },
    },
    {
      schema: ordersSchema,
      executor: ordersExecutor,
      merge: {
        User: {
          // Orders service also contributes to User type
          fieldName: '_users',
          selectionSet: '{ id }',
          args: (originalObject) => ({ ids: [originalObject.id] }),
          key: ({ id }) => id,
          argsFromKeys: (ids) => ({ ids }),
        },
      },
    },
  ],
});

// 3. Manual Delegation (stitching requires manual wiring)
const gatewayResolvers = {
  Order: {
    customer: {
      selectionSet: '{ customerId }',
      resolve: (order, args, context, info) => {
        return delegateToSchema({
          schema: usersSubschema,
          operation: 'query',
          fieldName: 'user',
          args: { id: order.customerId },
          context,
          info,
        });
      },
    },
  },
  User: {
    orders: {
      selectionSet: '{ id }',
      resolve: (user, args, context, info) => {
        return delegateToSchema({
          schema: ordersSubschema,
          operation: 'query',
          fieldName: 'ordersByUser',
          args: { userId: user.id },
          context,
          info,
        });
      },
    },
  },
};

// ===== APOLLO FEDERATION =====

// 4. Federation Subgraph — Users Service
// Each service declares which types it owns and how to reference them
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';

const usersTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3",
          import: ["@key", "@shareable"])

  type User @key(fields: "id") @key(fields: "email") {
    id: ID!
    email: String!
    name: String!
    department: String
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const usersResolvers = {
  Query: {
    user: (_, { id }) => usersDB.findById(id),
    users: () => usersDB.findAll(),
  },
  User: {
    __resolveReference: (reference) => {
      // Called when another service references a User
      // reference contains the @key fields (id or email)
      if (reference.id) return usersDB.findById(reference.id);
      if (reference.email) return usersDB.findByEmail(reference.email);
    },
  },
};

// 5. Federation Subgraph — Orders Service (extends User)
const ordersTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3",
          import: ["@key", "@external", "@requires", "@provides"])

  # Extend User type owned by users service
  type User @key(fields: "id") {
    id: ID!               # Only the key field is needed
    orders: [Order!]!     # Orders service adds this field to User
  }

  type Order @key(fields: "id") {
    id: ID!
    userId: ID!
    items: [OrderItem!]!
    total: Float!
    status: OrderStatus!
    user: User!
  }

  type OrderItem {
    productId: ID!
    quantity: Int!
    price: Float!
    product: Product!     # Reference to product from products service
  }

  # Extend Product to reference it
  type Product @key(fields: "id") {
    id: ID!
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
  }

  type Query {
    order(id: ID!): Order
    ordersByUser(userId: ID!): [Order!]!
  }
`;

const ordersResolvers = {
  User: {
    orders: (user) => ordersDB.findByUserId(user.id),
  },
  Order: {
    user: (order) => ({ __typename: 'User', id: order.userId }),
  },
  OrderItem: {
    product: (item) => ({ __typename: 'Product', id: item.productId }),
  },
};

// 6. Federation 2.0 Improvements
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3",
          import: [
            "@key",
            "@shareable",       # Multiple services can resolve same field
            "@inaccessible",    # Hide field from public API
            "@override",        # Migrate field ownership between services
            "@provides",        # Service can resolve field when returning entity
            "@requires",        # Field needs data from another service
            "@tag",             # Label elements for filtering
            "@composeDirective" # Custom directives in supergraph
          ])

  type Product @key(fields: "id") {
    id: ID!
    name: String! @shareable    # Both services can resolve this
    price: Float!
    internalCost: Float @inaccessible  # Hidden from client
    weight: Float @external
    shippingCost: Float @requires(fields: "weight")
    # shippingCost needs weight from another service to compute
  }
`;

// 7. Apollo Router Configuration (Federation 2.0 gateway)
// router.yaml
/*
supergraph:
  listen: 0.0.0.0:4000
  introspection: false    # Disable in production

cors:
  origins:
    - https://myapp.com
  allow_headers:
    - Authorization
    - Content-Type

headers:
  all:
    request:
      - propagate:
          named: Authorization
      - propagate:
          named: X-Request-ID

limits:
  max_depth: 15
  max_height: 200
  max_aliases: 30

telemetry:
  tracing:
    propagation:
      jaeger: true
*/
```

**When to use stitching vs federation:**

| Scenario | Recommendation |
|----------|---------------|
| Aggregating third-party APIs | Schema Stitching |
| Microservices with team ownership | Apollo Federation |
| Migrating from monolith | Start with stitching, migrate to federation |
| Need @requires / @provides | Apollo Federation |
| Services in different languages | Either works, federation has broader SDK support |
| Want minimal gateway logic | Apollo Federation (automated query planning) |
| Complex cross-service transforms | Schema Stitching (more control) |

**Migration path from monolithic schema to federated:**

1. **Identify bounded contexts** — group types by domain (users, orders, products)
2. **Extract one subgraph** — move one domain to its own service with `@key` directives
3. **Run both in parallel** — gateway serves the monolith + new subgraph
4. **Migrate remaining domains** — extract one at a time, validate with schema checks
5. **Decommission the monolith** — once all domains are extracted

> **Interview Tip:** Schema stitching is the older approach and still valid for aggregating external APIs. Apollo Federation is the modern standard for microservices. The key distinction: in stitching, the gateway owns the composition logic; in federation, each service declares its own relationships. Always mention Federation 2.0 improvements like `@shareable` and `@override` — they solve real pain points from v1.

---

## Advanced Pagination

### Q16: Advanced Pagination — Relay Cursor Specification

**Answer:**

The Relay cursor specification is the industry standard for GraphQL pagination. It provides a consistent, performant way to paginate that works well with infinite scroll and real-time updates.

**Relay Connection Specification:**

```graphql
# The standard connection types
type Query {
  users(
    first: Int        # Forward pagination: get first N items
    after: String     # Forward pagination: after this cursor
    last: Int         # Backward pagination: get last N items
    before: String    # Backward pagination: before this cursor
    filter: UserFilter
    orderBy: UserOrderBy
  ): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!         # Optional but useful
}

type UserEdge {
  node: User!              # The actual data
  cursor: String!          # Opaque cursor for this item
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

input UserFilter {
  status: UserStatus
  search: String
  createdAfter: DateTime
}

input UserOrderBy {
  field: UserSortField!
  direction: SortDirection!
}

enum UserSortField {
  CREATED_AT
  NAME
  EMAIL
}

enum SortDirection {
  ASC
  DESC
}
```

```typescript
// 1. Cursor Encoding Strategies
// Cursors should be opaque — clients should not parse them

// Strategy A: Base64-encoded JSON (most flexible)
function encodeCursor(data: Record<string, any>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): Record<string, any> {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
}

// Example cursor: eyJpZCI6MTIzLCJjcmVhdGVkQXQiOiIyMDI2LTAxLTAxIn0
// Decodes to: { id: 123, createdAt: "2026-01-01" }

// Strategy B: Composite key for multi-column sort
function encodeCompositeCursor(item: any, sortFields: string[]): string {
  const cursorData = sortFields.reduce((acc, field) => {
    acc[field] = item[field];
    return acc;
  }, {} as Record<string, any>);
  cursorData.__id = item.id; // Always include unique ID for tiebreaker
  return encodeCursor(cursorData);
}

// 2. Relay-Style Pagination Resolver
interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: any;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' };
}

async function paginateWithCursor<T>(
  queryBuilder: SelectQueryBuilder<T>,
  args: PaginationArgs,
  defaultLimit = 20,
  maxLimit = 100,
): Promise<{
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}> {
  const { first, after, last, before, orderBy } = args;

  // Validate: must provide first/after OR last/before, not both
  if (first != null && last != null) {
    throw new Error('Cannot use both "first" and "last"');
  }

  const limit = Math.min(first || last || defaultLimit, maxLimit);
  const isBackward = last != null;
  const sortField = orderBy?.field || 'createdAt';
  const sortDirection = orderBy?.direction || 'DESC';

  // Get total count (can be cached or skipped for performance)
  const totalCount = await queryBuilder.clone().getCount();

  // Apply cursor condition
  if (after) {
    const cursorData = decodeCursor(after);
    const operator = sortDirection === 'ASC' ? '>' : '<';
    queryBuilder.andWhere(
      `(${sortField} ${operator} :cursorValue OR (${sortField} = :cursorValue AND id > :cursorId))`,
      { cursorValue: cursorData[sortField], cursorId: cursorData.__id },
    );
  }

  if (before) {
    const cursorData = decodeCursor(before);
    const operator = sortDirection === 'ASC' ? '<' : '>';
    queryBuilder.andWhere(
      `(${sortField} ${operator} :cursorValue OR (${sortField} = :cursorValue AND id < :cursorId))`,
      { cursorValue: cursorData[sortField], cursorId: cursorData.__id },
    );
  }

  // Apply ordering
  if (isBackward) {
    // Reverse order for backward pagination, then reverse results
    const reverseDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(sortField, reverseDirection).addOrderBy('id', 'DESC');
  } else {
    queryBuilder.orderBy(sortField, sortDirection).addOrderBy('id', 'ASC');
  }

  // Fetch one extra to determine hasNextPage/hasPreviousPage
  queryBuilder.take(limit + 1);

  let items = await queryBuilder.getMany();

  // Determine if there are more pages
  const hasExtra = items.length > limit;
  if (hasExtra) {
    items = items.slice(0, limit);
  }

  // Reverse results for backward pagination
  if (isBackward) {
    items.reverse();
  }

  // Build edges with cursors
  const edges = items.map((item) => ({
    node: item,
    cursor: encodeCompositeCursor(item, [sortField]),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: isBackward ? !!before : hasExtra,
      hasPreviousPage: isBackward ? hasExtra : !!after,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    },
    totalCount,
  };
}

// 3. Using the Pagination Helper in Resolvers
const resolvers = {
  Query: {
    users: async (_, args, { db }) => {
      const qb = db.getRepository(User).createQueryBuilder('user');

      // Apply filters
      if (args.filter?.status) {
        qb.andWhere('user.status = :status', { status: args.filter.status });
      }

      if (args.filter?.search) {
        qb.andWhere(
          '(user.name ILIKE :search OR user.email ILIKE :search)',
          { search: `%${args.filter.search}%` },
        );
      }

      return paginateWithCursor(qb, args);
    },
  },
};

// 4. Client-Side Query Example
/*
# First page
query {
  users(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {
    edges {
      node {
        id
        name
        email
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

# Next page
query {
  users(first: 10, after: "eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTAxIiwiX19pZCI6MTIzfQ") {
    edges {
      node { id name email }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
*/

// 5. Performance Comparison
/*
┌─────────────────┬──────────────────────┬────────────────────┬─────────────────────┐
│ Strategy        │ Offset-based         │ Cursor-based       │ Keyset              │
│                 │ (LIMIT/OFFSET)       │ (Relay spec)       │ (WHERE + ORDER)     │
├─────────────────┼──────────────────────┼────────────────────┼─────────────────────┤
│ Performance     │ Degrades with offset │ Consistent O(1)    │ Consistent O(1)     │
│ Jump to page    │ Yes (page=5)         │ No (sequential)    │ No (sequential)     │
│ Real-time safe  │ No (items shift)     │ Yes (stable cursor)│ Yes (stable cursor) │
│ Implementation  │ Simple               │ Moderate           │ Simple              │
│ Total count     │ Easy                 │ Extra query needed │ Extra query needed  │
│ Backward paging │ Easy                 │ Built-in           │ Manual              │
│ Sort stability  │ Needs unique column  │ Cursor includes ID │ Needs unique column │
│ Best for        │ Small datasets,      │ Infinite scroll,   │ Large datasets,     │
│                 │ admin pages          │ mobile apps        │ APIs                │
└─────────────────┴──────────────────────┴────────────────────┴─────────────────────┘
*/
```

> **Interview Tip:** When asked about pagination in GraphQL, lead with the Relay cursor specification — it is the widely adopted standard. Explain that cursors are opaque (clients never parse them), and always include a unique tiebreaker field (like `id`) alongside the sort column. Mention the key advantage over offset pagination: cursor-based is stable when items are inserted or deleted, making it ideal for real-time feeds and infinite scroll.

---

## Q13: GraphQL Security — Query Depth & Complexity Analysis

**Q: How do you prevent malicious or expensive queries in GraphQL?**

**A:**

GraphQL's flexibility is also its biggest security risk. Unlike REST where each endpoint has predictable cost, a single GraphQL query can request deeply nested data causing server overload.

### The Problem: Malicious Queries
```graphql
# This could bring down your server
query MaliciousQuery {
  users {
    posts {
      comments {
        author {
          posts {
            comments {
              author {
                posts { # ... infinitely deep
                  title
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Solution 1: Query Depth Limiting
```typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)], // Max 5 levels deep
});
```
- Rule of thumb: max depth of 5-7 for most apps
- Rejects queries exceeding the depth limit before execution

### Solution 2: Query Complexity Analysis
```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

// Assign costs to fields
const complexityRule = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 10,
  listFactor: 20,
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [complexityRule],
});
```

### Solution 3: Persisted Queries (Allowlisting)
```typescript
// Only allow pre-registered queries (best for production)
import { createHash } from 'crypto';

const allowedQueries = new Map<string, string>();

// Register queries at build time
function registerQuery(query: string): string {
  const hash = createHash('sha256').update(query).digest('hex');
  allowedQueries.set(hash, query);
  return hash;
}

// At runtime, only accept query hashes
app.use('/graphql', (req, res, next) => {
  if (req.body.query) {
    // Reject raw queries in production
    return res.status(400).json({ error: 'Only persisted queries allowed' });
  }
  const query = allowedQueries.get(req.body.extensions?.persistedQuery?.sha256Hash);
  if (!query) return res.status(400).json({ error: 'Unknown query' });
  req.body.query = query;
  next();
});
```

### Solution 4: Disable Introspection in Production
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});
```

### Solution 5: Rate Limiting per Query
- Track query cost and apply rate limits based on total cost, not just request count
- Token bucket algorithm where tokens = query complexity cost

### Additional Protections
| Protection | What It Prevents | Implementation |
|-----------|-----------------|----------------|
| Depth limiting | Deeply nested queries | graphql-depth-limit |
| Complexity analysis | Expensive wide queries | graphql-validation-complexity |
| Persisted queries | Unknown/arbitrary queries | Apollo persisted queries |
| Disable introspection | Schema discovery attacks | Apollo Server config |
| Timeout | Slow resolvers | Apollo Server plugins |
| Rate limiting | Brute force | Per-user query cost tracking |

**Interview Tip:** "In production, I use a layered approach — depth limiting + complexity analysis + persisted queries. For AppSync, AWS provides built-in throttling at the resolver level."

---

## Q14: GraphQL Error Handling Patterns

**Q: How do you handle errors gracefully in GraphQL?**

**A:**

GraphQL always returns HTTP 200 (even with errors). Errors go in the `errors` array alongside partial `data`. This is fundamentally different from REST.

### Error Response Structure
```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404
      }
    }
  ]
}
```

### Custom Error Classes
```typescript
import { GraphQLError } from 'graphql';

export class NotFoundError extends GraphQLError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        statusCode: 404,
        resource,
        id,
      },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(field: string, message: string) {
    super(`Validation failed: ${message}`, {
      extensions: {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        field,
      },
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(action: string) {
    super(`Not authorized to ${action}`, {
      extensions: {
        code: 'FORBIDDEN',
        statusCode: 403,
      },
    });
  }
}
```

### Using in Resolvers
```typescript
const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const user = await userService.findById(id);
      if (!user) {
        throw new NotFoundError('User', id);
      }
      return user;
    },
  },
  Mutation: {
    createUser: async (_, { input }) => {
      if (!input.email.includes('@')) {
        throw new ValidationError('email', 'Invalid email format');
      }
      return userService.create(input);
    },
  },
};
```

### Partial Failure Handling
```typescript
// GraphQL can return partial data + errors
const resolvers = {
  Query: {
    dashboard: async () => ({
      // This resolver returns what it can, individual fields may fail
    }),
  },
  Dashboard: {
    stats: async () => {
      try {
        return await analyticsService.getStats();
      } catch (err) {
        // Return null + error instead of failing entire query
        throw new GraphQLError('Stats temporarily unavailable', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
    },
    recentOrders: async () => {
      return orderService.getRecent(); // This still works even if stats failed
    },
  },
};
```

### Error Formatting Plugin (Apollo)
```typescript
const server = new ApolloServer({
  formatError: (formattedError, error) => {
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'An unexpected error occurred',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }
    }
    // Log all errors
    logger.error('GraphQL Error:', { error: formattedError, originalError: error });
    return formattedError;
  },
});
```

### Union-Based Error Handling (Type-Safe Errors)
```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type NotFoundError {
  message: String!
  resourceId: ID!
}

type ValidationError {
  message: String!
  field: String!
}

union UserResult = User | NotFoundError | ValidationError

type Query {
  user(id: ID!): UserResult!
}
```
```typescript
// Client can handle errors type-safely
const USER_QUERY = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      ... on User {
        id
        name
        email
      }
      ... on NotFoundError {
        message
        resourceId
      }
      ... on ValidationError {
        message
        field
      }
    }
  }
`;
```

**Interview Tip:** "I prefer union-based errors for critical mutations where the client needs to handle different failure modes differently. For queries, I use the standard errors array with extensions."

---

## Q15: Relay-Style Cursor Pagination

**Q: How do you implement efficient pagination in GraphQL?**

**A:**

### Three Approaches Compared
| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| Offset-based | Simple, familiar | Slow for large offsets, inconsistent with inserts | Small datasets |
| Cursor-based (Relay) | Consistent, performant | More complex, no random page access | Large datasets, real-time |
| Keyset | Very fast, stable | Requires sortable unique field | Sorted lists |

### Relay Connection Specification
```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type UserEdge {
  cursor: String!
  node: User!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### Implementation
```typescript
import { encode, decode } from 'base64-url';

interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

function encodeCursor(id: string): string {
  return encode(`cursor:${id}`);
}

function decodeCursor(cursor: string): string {
  const decoded = decode(cursor);
  return decoded.replace('cursor:', '');
}

async function paginateUsers(args: PaginationArgs) {
  const { first = 10, after, last, before } = args;
  const limit = first || last;

  let query = userRepository.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');

  if (after) {
    const afterId = decodeCursor(after);
    const afterRecord = await userRepository.findOne({ where: { id: afterId } });
    if (afterRecord) {
      query = query.where('user.createdAt < :cursor', { cursor: afterRecord.createdAt });
    }
  }

  // Fetch one extra to determine hasNextPage
  const items = await query.limit(limit + 1).getMany();
  const hasNextPage = items.length > limit;
  const edges = items.slice(0, limit).map(user => ({
    cursor: encodeCursor(user.id),
    node: user,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: !!after,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
    },
    totalCount: await userRepository.count(),
  };
}
```

**Interview Tip:** "For DynamoDB with AppSync, I use the LastEvaluatedKey as the cursor — it maps naturally to Relay's after/before model."

---

## Q16: Schema Stitching vs Federation

**Q: When would you use schema stitching vs Apollo Federation?**

**A:**

### Schema Stitching (Legacy Approach)
- Merges multiple GraphQL schemas into one at the gateway level
- Gateway downloads schemas from subgraphs and merges them
- Conflict resolution is manual and error-prone
- Tight coupling: gateway must understand all schemas

### Apollo Federation (Modern Approach)
- Each service owns its part of the graph
- Services declare which types they extend
- Gateway composes schemas automatically using `@key`, `@extends`, `@external`
- Loose coupling: services are independently deployable

### Federation Example
```graphql
# User Service
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
}

# Order Service (extends User from User Service)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  total: Float!
  status: OrderStatus!
}
```

### When to Use Which
| Factor | Schema Stitching | Federation |
|--------|-----------------|------------|
| Team ownership | Centralized | Distributed |
| Independent deployment | No | Yes |
| Type extension | Manual | Built-in (@extends) |
| Performance | Gateway does work | Optimized query planning |
| Complexity | Simpler for 2-3 services | Better for 5+ services |
| Recommendation | Legacy / migration | New projects |

### AppSync Alternative
- AppSync supports merged APIs (similar concept to Federation)
- Each team owns an AppSync API, merged into a single endpoint
- Uses AWS-native auth and data source management

**Interview Tip:** "For a greenfield project with 3+ backend teams, I'd choose Apollo Federation. For a small team with AppSync, merged APIs work well without the overhead of a separate gateway."

---

## Q13: GraphQL Security — Query Complexity & Depth Limiting

**Q: How do you prevent malicious or expensive GraphQL queries?**

**A:**

Unlike REST where each endpoint has a predictable cost, GraphQL lets clients write arbitrarily complex queries.

### The Problem: Deeply Nested Queries
```graphql
# A malicious query — exponential data fetching
query MaliciousQuery {
  users {            # 100 users
    posts {          # 100 posts each = 10,000
      comments {     # 50 comments each = 500,000
        author {     # 1 author each = 500,000
          posts {    # 100 posts each = 50,000,000
            comments {  # ...and so on
              author { name }
            }
          }
        }
      }
    }
  }
}
```

### Solution 1: Query Depth Limiting
```typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)], // Max 5 levels deep
});
```

### Solution 2: Query Complexity Analysis
```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

// Assign costs to fields
const complexityLimit = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 10,
  listFactor: 20, // Lists multiply the cost
  formatErrorMessage: (cost: number) =>
    `Query cost ${cost} exceeds maximum of 1000`,
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [complexityLimit],
});
```

### Solution 3: Field-Level Cost Directives
```graphql
type Query {
  users(limit: Int = 10): [User!]! @cost(complexity: 10, multiplier: "limit")
  user(id: ID!): User @cost(complexity: 1)
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]! @cost(complexity: 5)        # Costs 5 per user
  followers: [User!]! @cost(complexity: 20)    # Expensive — another user list
}
```

### Solution 4: Persisted Queries (Whitelist Approach)
```typescript
// Only allow pre-registered queries (strongest security)
import { ApolloServerPluginPersistedQueries } from '@apollo/server/plugin/persistedQueries';

// Client sends a hash instead of the full query
// POST { "extensions": { "persistedQuery": { "sha256Hash": "abc123..." } } }

// Server looks up hash → finds the query → executes
// Unknown hashes are rejected
```

### Solution 5: Rate Limiting per Query Complexity
```typescript
// Instead of rate limiting by request count,
// rate limit by total query cost per time window
@Injectable()
export class GraphQLComplexityPlugin implements ApolloServerPlugin {
  async requestDidStart(requestContext) {
    const userId = requestContext.context.userId;

    return {
      async didResolveOperation(ctx) {
        const complexity = getComplexity(ctx.document, ctx.schema);

        // Check user's remaining budget
        const remaining = await redis.get(`complexity:${userId}`);
        if (remaining !== null && parseInt(remaining) < complexity) {
          throw new GraphQLError('Query complexity budget exceeded. Try again later.');
        }

        // Deduct from budget
        await redis.decrby(`complexity:${userId}`, complexity);
      },
    };
  }
}
```

### Solution 6: Disable Introspection in Production
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  // Prevents attackers from discovering your full schema
});
```

### Security Checklist
| Measure | What It Prevents |
|---------|-----------------|
| Depth limiting (5-7 max) | Deeply nested abuse queries |
| Complexity analysis (cost-based) | Wide/expensive queries |
| Persisted queries | Arbitrary query injection |
| Rate limiting | Brute force / DDoS |
| Disable introspection (prod) | Schema discovery |
| Timeout per query (10-30s) | Slow query resource exhaustion |
| Input validation | Injection attacks |

**Interview Tip:** "For a public GraphQL API, I layer three defenses: depth limiting (max 5), complexity budgets (max 1000 per query), and per-user rate limiting. For internal APIs, persisted queries give the strongest guarantee since we control both client and server."

---

## Q14: GraphQL Error Handling Strategies

**Q: How do you handle errors properly in a GraphQL API?**

**A:**

GraphQL always returns HTTP 200 (even with errors), so error handling works differently from REST.

### Error Response Structure
```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404,
        "timestamp": "2026-03-13T10:00:00Z"
      }
    }
  ]
}
```

### Custom Error Classes
```typescript
import { GraphQLError } from 'graphql';

export class NotFoundError extends GraphQLError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        statusCode: 404,
        resource,
        id,
      },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(field: string, message: string) {
    super(`Validation failed: ${message}`, {
      extensions: {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        field,
      },
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(action: string) {
    super(`You don't have permission to ${action}`, {
      extensions: {
        code: 'FORBIDDEN',
        statusCode: 403,
      },
    });
  }
}
```

### Using Custom Errors in Resolvers
```typescript
@Resolver(() => User)
export class UserResolver {
  @Query(() => User)
  async user(@Args('id') id: string): Promise<User> {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  @Mutation(() => User)
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
    @Context() ctx: GqlContext,
  ): Promise<User> {
    if (ctx.user.id !== id && ctx.user.role !== 'ADMIN') {
      throw new ForbiddenError('update this user');
    }
    return this.userService.update(id, input);
  }
}
```

### Partial Success (Union Types for Errors)
```graphql
# Instead of throwing, return errors as part of the data
type CreateOrderResult = Order | ValidationErrors | OutOfStockError

type ValidationErrors {
  errors: [FieldError!]!
}

type FieldError {
  field: String!
  message: String!
}

type OutOfStockError {
  productId: ID!
  message: String!
  availableQuantity: Int!
}

type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderResult!
}
```

```typescript
// Resolver returns union type
@Mutation(() => CreateOrderResult)
async createOrder(@Args('input') input: CreateOrderInput) {
  const validationErrors = this.validate(input);
  if (validationErrors.length > 0) {
    return { __typename: 'ValidationErrors', errors: validationErrors };
  }

  const stockCheck = await this.inventoryService.checkStock(input.items);
  if (!stockCheck.available) {
    return {
      __typename: 'OutOfStockError',
      productId: stockCheck.productId,
      message: `Only ${stockCheck.available} items available`,
      availableQuantity: stockCheck.available,
    };
  }

  const order = await this.orderService.create(input);
  return { __typename: 'Order', ...order };
}
```

### NestJS Global Error Formatting
```typescript
// Format all errors consistently
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      formatError: (error: GraphQLError) => {
        // Don't expose internal errors to clients
        if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          logger.error('Internal GraphQL error', error);
          return {
            message: 'An internal error occurred',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          };
        }

        return {
          message: error.message,
          extensions: {
            code: error.extensions?.code || 'UNKNOWN_ERROR',
            ...(process.env.NODE_ENV !== 'production' && {
              stacktrace: error.extensions?.stacktrace
            }),
          },
        };
      },
    }),
  ],
})
```

### Error Handling Best Practices
| Practice | Why |
|----------|-----|
| Use extensions.code for machine-readable errors | Clients can switch on error codes |
| Don't expose stack traces in production | Security |
| Use union types for expected errors | Type-safe error handling on client |
| Log internal errors server-side | Debugging without exposing to clients |
| Include field path in validation errors | Client knows which field to highlight |
| Return partial data when possible | GraphQL strength — return what you can |

**Interview Tip:** "I prefer the union type approach for expected business errors (validation, not found, out of stock) because it's type-safe — the client can handle each case explicitly. For unexpected errors, I use the errors array with formatted extensions."

---

## Q15: Relay-Style Cursor Pagination

**Q: How do you implement efficient pagination in GraphQL?**

**A:**

### Three Approaches Compared
| Approach | Pros | Cons |
|----------|------|------|
| Offset/Limit | Simple, random access | Slow on large tables, inconsistent with inserts/deletes |
| Cursor-based (Relay) | Efficient, consistent, works with real-time data | No random page access, more complex |
| Keyset | Very fast, scalable | Requires sortable unique column |

### Relay Connection Spec
```graphql
type Query {
  users(
    first: Int          # Forward pagination: "give me first N"
    after: String       # Cursor: "after this item"
    last: Int           # Backward pagination: "give me last N"
    before: String      # Cursor: "before this item"
  ): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  cursor: String!       # Opaque cursor for this item
  node: User!           # The actual data
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### NestJS Implementation
```typescript
import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  first?: number;

  @Field({ nullable: true })
  after?: string;
}

// Cursor encoding/decoding (opaque to client)
function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt })).toString('base64');
}

function decodeCursor(cursor: string): { id: string; createdAt: Date } {
  return JSON.parse(Buffer.from(cursor, 'base64').toString());
}

// Resolver
@Resolver(() => User)
export class UserResolver {
  @Query(() => UserConnection)
  async users(@Args() { first, after }: PaginationArgs): Promise<UserConnection> {
    const limit = Math.min(first || 10, 50); // Cap at 50

    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .take(limit + 1); // Fetch one extra to determine hasNextPage

    if (after) {
      const { id, createdAt } = decodeCursor(after);
      queryBuilder.where(
        '(user.createdAt < :createdAt) OR (user.createdAt = :createdAt AND user.id < :id)',
        { createdAt, id },
      );
    }

    const users = await queryBuilder.getMany();
    const hasNextPage = users.length > limit;
    const nodes = hasNextPage ? users.slice(0, limit) : users;

    return {
      edges: nodes.map(user => ({
        cursor: encodeCursor(user.id, user.createdAt),
        node: user,
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: nodes.length > 0 ? encodeCursor(nodes[0].id, nodes[0].createdAt) : null,
        endCursor: nodes.length > 0 ? encodeCursor(nodes[nodes.length - 1].id, nodes[nodes.length - 1].createdAt) : null,
      },
      totalCount: await this.userRepo.count(),
    };
  }
}
```

### Client Usage
```graphql
# First page
query { users(first: 10) { edges { cursor node { id name } } pageInfo { hasNextPage endCursor } } }

# Next page — use endCursor from previous response
query { users(first: 10, after: "eyJpZCI6Ijl...") { edges { cursor node { id name } } pageInfo { hasNextPage endCursor } } }
```

### Performance: Why Cursor > Offset
```sql
-- Offset pagination (SLOW on large tables):
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 100000;
-- Database must scan and skip 100,000 rows

-- Cursor pagination (FAST regardless of position):
SELECT * FROM users
WHERE (created_at < '2026-01-01' OR (created_at = '2026-01-01' AND id < 'abc'))
ORDER BY created_at DESC, id DESC
LIMIT 11;
-- Uses index directly, no row skipping
```

**Interview Tip:** "I always use cursor-based pagination for GraphQL APIs. It's consistent with real-time data, scales well with large datasets, and follows the Relay spec which most GraphQL clients expect. I encode cursors as base64 to keep them opaque."

---

## Q16: Schema Stitching vs Federation

**Q: How do you compose multiple GraphQL schemas in a microservices architecture?**

**A:**

### Schema Stitching (Legacy Approach)
```
Service A (User Schema) ─┐
Service B (Order Schema) ─┼─→ Gateway stitches schemas together
Service C (Product Schema)┘
```
- Gateway fetches schemas from each service
- Manually defines how types relate across services
- Gateway owns the combined schema logic
- **Problem**: Gateway becomes a bottleneck and single point of failure

### Apollo Federation (Modern Approach)
```
Service A (User Subgraph)   ─┐
Service B (Order Subgraph)  ─┼─→ Apollo Router/Gateway (automatic composition)
Service C (Product Subgraph) ┘
```
- Each service declares its OWN schema + how it extends others
- Gateway auto-composes schemas
- No manual stitching — services are independent

### Federation Implementation
```graphql
# User subgraph
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
}
```

```graphql
# Order subgraph — extends User from user service
type User @key(fields: "id") {
  id: ID!
  orders: [Order!]!    # Adds orders field to User
}

type Order @key(fields: "id") {
  id: ID!
  total: Float!
  user: User!
}
```

### When to Use Each
| Criteria | Schema Stitching | Apollo Federation |
|----------|-----------------|-------------------|
| Team independence | Low (gateway team controls) | High (each team owns subgraph) |
| Schema conflicts | Manual resolution | @key/@requires directives |
| Performance | Type merging overhead | Optimized query plans |
| Maturity | Older, less maintained | Actively developed |
| Best for | Small teams, <3 services | Large orgs, many teams |

### Recommendation
"For most microservice architectures, use Apollo Federation v2. Schema stitching was the original solution but has been superseded. Federation gives each team autonomy over their subgraph while the gateway handles composition automatically."

**Interview Tip:** "I'd use Federation v2 for a multi-team setup where each team owns their domain. For a small team with 2-3 services, a simpler monolithic GraphQL schema or lightweight stitching might be more practical — don't over-engineer."
