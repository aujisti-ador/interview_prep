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
