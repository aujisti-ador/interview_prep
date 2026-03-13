# AWS Serverless Deep Dive — Interview Preparation Guide

> **Target:** Senior/Lead Backend Engineer (BD + International Remote)
> **Stack:** TypeScript, Node.js, NestJS, AWS (Lambda, AppSync, Cognito, API Gateway, S3, CDK)
> **Real Experience:** Banglalink (41M users), Right Tracks (live streaming)

---

## Q1: AWS Lambda Fundamentals & Execution Model

### Q: What is AWS Lambda and how does its execution model work?

**A:** AWS Lambda is an event-driven, pay-per-invocation compute service. You upload code, define a trigger, and AWS handles provisioning, scaling, and infrastructure. You pay only for the compute time consumed — no idle costs.

**Execution Model:**

```
Request → Cold Start (if needed) → INIT Phase → INVOKE Phase → Response → (idle) → SHUTDOWN Phase
```

**The three phases of the Lambda runtime lifecycle:**

1. **INIT Phase:** Downloads code, starts the runtime, runs initialization code (module-level code outside the handler). This is where SDK clients and DB connections should be created — they persist across invocations.
2. **INVOKE Phase:** Runs the handler function. This repeats for each invocation on a warm container.
3. **SHUTDOWN Phase:** Runtime shuts down after a period of inactivity (typically 5-15 minutes, not guaranteed). Extension hooks can run cleanup logic here.

### Q: What causes Lambda cold starts and how do you mitigate them?

**A:** A cold start occurs when Lambda must provision a new execution environment. This adds 100ms to several seconds of latency.

**What causes cold starts:**
- First invocation after deployment
- Scaling up to handle concurrent requests (each new concurrent execution = new container)
- Container recycled after inactivity
- VPC-attached Lambdas (ENI attachment adds delay, though this has improved significantly with VPC improvements in 2019+)

**Mitigation strategies:**

| Strategy | Effect | Cost |
|----------|--------|------|
| Provisioned Concurrency | Keeps N containers pre-warmed | ~$0.015/GB-hour always-on |
| SnapStart (Java) | Snapshots INIT phase, restores from cache | Free |
| Smaller deployment packages | Faster code download & initialization | Free |
| Avoid VPC unless needed | Removes ENI attachment time | Free |
| Keep-warm pings (CloudWatch Events) | Prevents idle shutdown | Minimal |
| ARM64 (Graviton2) | 20% faster startup, 20% cheaper | Negative cost |
| Lazy-load SDK clients | Load only what you need | Free |
| Lambda Layers | Cached separately, faster updates | Free |

### Q: Explain Lambda resource allocation, limits, and concurrency.

**A:**

**Resource Allocation:**
- **Memory:** 128 MB to 10,240 MB (10 GB), in 1 MB increments
- **CPU:** Scales proportionally with memory. At 1,769 MB you get 1 full vCPU. At 10 GB you get ~6 vCPUs.
- **Timeout:** Max 15 minutes (900 seconds)
- **/tmp storage:** Up to 10 GB ephemeral storage (persists across warm invocations on same container, but unreliable for state)
- **Payload:** 6 MB synchronous, 256 KB asynchronous
- **Environment variables:** 4 KB total
- **Deployment package:** 50 MB zipped, 250 MB unzipped

**Concurrency:**
- **Account-level default:** 1,000 concurrent executions per region (soft limit, can request increase)
- **Reserved concurrency:** Guarantees a function gets N concurrent executions, but also caps it at N. Other functions cannot consume these.
- **Provisioned concurrency:** Pre-initializes N execution environments. Eliminates cold starts for those N. Costs money whether invoked or not.

```
Total Account Concurrency (1000)
├── Function A: Reserved = 200 (guaranteed 200, max 200)
├── Function B: Reserved = 100 (guaranteed 100, max 100)
└── Unreserved Pool: 700 (shared by all other functions)
    └── Function C: Provisioned = 50 (50 of unreserved are pre-warmed)
```

### Q: What are Lambda Layers and when would you use them?

**A:** Lambda Layers are ZIP archives containing libraries, custom runtimes, or other dependencies that can be shared across multiple functions. Each function can use up to 5 layers.

**Use cases:**
- Shared utility libraries across microservices
- Common node_modules (AWS SDK, database drivers)
- Shared business logic
- Custom runtimes

**Benefits:** Smaller deployment packages, shared dependency management, separation of concerns.

### Q: Compare Lambda@Edge vs CloudFront Functions.

**A:**

| Feature | Lambda@Edge | CloudFront Functions |
|---------|-------------|---------------------|
| Runtime | Node.js, Python | JavaScript only |
| Execution time | Up to 30s (origin) / 5s (viewer) | < 1ms |
| Memory | Up to 10 GB | 2 MB |
| Network access | Yes | No |
| File system | Yes (/tmp) | No |
| Triggers | Viewer request/response, Origin request/response | Viewer request/response only |
| Price | $0.60/million | $0.10/million |
| Use case | Complex logic, A/B testing, auth at edge | URL rewrites, header manipulation, simple redirects |

### Q: Show a code example of running a NestJS app on Lambda.

**A:**

```typescript
// src/lambda.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';

let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

// Handler reuses the server across warm invocations
export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  // Reuse server across warm invocations (INIT phase optimization)
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
```

```typescript
// tsconfig.json — ensure esModuleInterop is true
// package.json — bundle with esbuild or webpack for smaller package size
```

**Key points:**
- `bootstrap()` runs once during INIT phase, result is cached in module scope
- `@vendia/serverless-express` translates API Gateway events to Express requests
- NestJS on Lambda is a "Lambda-lith" pattern — one function handles all routes
- Trade-off: simpler deployment vs. losing per-route scaling and per-route IAM

### Q: Walk through a Lambda cost calculation for Banglalink's notification service.

**A:** Scenario: Banglalink sends 10M push notifications per day via Lambda.

**Assumptions:**
- Each Lambda invocation: 200ms average duration, 256 MB memory
- 10,000,000 invocations/day = 300,000,000 invocations/month

**Request cost:**
```
300M requests × $0.20 / 1M = $60/month
```

**Duration cost:**
```
Duration per invocation = 200ms = 0.2 seconds
Memory = 256 MB = 0.25 GB
GB-seconds per invocation = 0.25 × 0.2 = 0.05 GB-s

Total GB-seconds = 300M × 0.05 = 15,000,000 GB-s
Free tier = 400,000 GB-s
Billable = 14,600,000 GB-s

Cost = 14,600,000 × $0.0000166667 = ~$243/month
```

**Total Lambda cost: ~$303/month** for 300M invocations.

Compare to running 24/7 EC2 instances with auto-scaling — the serverless model is significantly cheaper for bursty workloads like notifications that spike during campaigns and drop at night.

---

## Q2: API Gateway — REST vs HTTP APIs

### Q: Compare REST API and HTTP API in API Gateway. When would you choose each?

**A:**

| Feature | REST API | HTTP API |
|---------|----------|----------|
| **Cost** | $3.50/million requests | $1.00/million requests |
| **Latency** | Higher (~30ms overhead) | ~60% lower (~10ms overhead) |
| **Auth** | API keys, IAM, Cognito, Lambda authorizer | JWT authorizer, IAM, Lambda authorizer |
| **Caching** | Built-in (0.5 GB - 237 GB) | No built-in caching |
| **WAF** | Yes | No |
| **Request validation** | Yes (JSON Schema) | No |
| **Request/Response transformation** | Yes (VTL mapping templates) | No (parameter mapping only) |
| **Throttling** | Per-stage, per-method | Per-route |
| **WebSocket** | Separate WebSocket API type | No |
| **Usage plans & API keys** | Yes | No |
| **Private endpoints** | Yes | No |
| **Custom domain** | Yes | Yes |
| **OpenAPI import** | Yes | Yes |

**Decision framework:**
- **Choose HTTP API** when you need simple proxying to Lambda/HTTP backends, JWT auth is sufficient, and you want lowest cost and latency. This is the default for most new APIs.
- **Choose REST API** when you need built-in caching, WAF, request validation, API keys/usage plans (B2B APIs), or VTL transformations.
- **BD context:** For Banglalink's internal APIs, HTTP API saves 70% on gateway costs. For B2B partner APIs requiring rate limiting and API keys, use REST API.

### Q: Explain API Gateway throttling and how it works.

**A:** API Gateway uses a **token bucket algorithm** for throttling.

- **Account-level default:** 10,000 requests/second, 5,000 burst
- **Per-stage/per-method limits** (REST API) or **per-route limits** (HTTP API) can be configured lower
- Exceeding limits returns **429 Too Many Requests**

```
Token bucket:
- Bucket fills at "rate" tokens per second (steady-state rate)
- Bucket max size = "burst" limit
- Each request consumes one token
- If bucket is empty → 429 throttled
```

**Usage plans** (REST API only) allow different throttling per API key:
```
Partner A: 1,000 RPS, 500 burst
Partner B: 100 RPS, 50 burst
Free tier: 10 RPS, 5 burst
```

### Q: How does API Gateway caching work?

**A:** REST API only. Caches responses at the stage level.

- **TTL:** 0-3600 seconds (default 300s)
- **Cache size:** 0.5 GB to 237 GB
- **Cache key:** method + resource path + query strings + headers (configurable)
- **Invalidation:** Client sends `Cache-Control: max-age=0` header (requires IAM authorization to invalidate)
- **Cost:** $0.02/hour for 0.5 GB to $4.68/hour for 237 GB
- **Per-key caching:** Only specific parameters contribute to cache key

### Q: How do Lambda authorizers work?

**A:** Lambda authorizers run a Lambda function to authorize API requests before they reach the backend.

**Two types:**
1. **Token-based (REQUEST type with token):** Receives the authorization token (e.g., Bearer token). Returns an IAM policy.
2. **Request parameter-based:** Receives headers, query strings, stage variables, context. More flexible.

```typescript
// Lambda Authorizer — validates JWT and returns IAM policy
import { APIGatewayTokenAuthorizerHandler } from 'aws-lambda';
import jwt from 'jsonwebtoken';

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  const token = event.authorizationToken.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role: string;
    };

    return {
      principalId: decoded.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            // Allow all methods on this API, or restrict per role
            Resource: decoded.role === 'admin'
              ? event.methodArn.split('/').slice(0, 2).join('/') + '/*'
              : event.methodArn,
          },
        ],
      },
      context: {
        userId: decoded.sub,
        role: decoded.role,
      },
    };
  } catch {
    throw new Error('Unauthorized');
  }
};
```

**Caching:** Authorizer responses can be cached (up to 3600s) to avoid running the Lambda on every request. Cache key is the token or specified identity sources.

### Q: Show a CDK example for API Gateway + Lambda.

**A:**

```typescript
// lib/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function bundled with esbuild
    const handler = new nodejs.NodejsFunction(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'src/lambda.ts',
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(29), // API Gateway has 29s hard limit
      architecture: lambda.Architecture.ARM_64, // 20% cheaper
      environment: {
        NODE_ENV: 'production',
        TABLE_NAME: 'users',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // SDK v3 included in runtime
      },
    });

    // REST API with deployment stages
    const api = new apigw.RestApi(this, 'BanglalinkApi', {
      restApiName: 'Banglalink Notification API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 5000,
        throttlingBurstLimit: 2500,
        cachingEnabled: true,
        cacheTtl: cdk.Duration.minutes(5),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    // Routes
    const notifications = api.root.addResource('notifications');
    notifications.addMethod('POST', new apigw.LambdaIntegration(handler));
    notifications.addMethod('GET', new apigw.LambdaIntegration(handler));

    const notification = notifications.addResource('{id}');
    notification.addMethod('GET', new apigw.LambdaIntegration(handler));
  }
}
```

---

## Q3: AWS AppSync & GraphQL

### Q: What is AWS AppSync and how does it compare to self-hosted Apollo Server?

**A:** AWS AppSync is a fully managed GraphQL service that simplifies building data-driven APIs with real-time subscriptions, offline support, and direct integration with AWS data sources.

| Feature | AppSync | Self-hosted Apollo Server |
|---------|---------|--------------------------|
| **Hosting** | Fully managed | Self-managed (ECS/EKS/Lambda) |
| **Data source integration** | Direct DynamoDB, RDS, Lambda, HTTP, OpenSearch, EventBridge resolvers | All via custom resolvers |
| **Real-time** | Built-in WebSocket subscriptions (auto-scaling) | Requires Redis pub/sub + WebSocket infrastructure |
| **Offline sync** | Amplify DataStore with conflict resolution | Custom implementation |
| **Auth** | 5 built-in auth modes, mix per field | Custom middleware |
| **Caching** | Built-in per-resolver caching | Apollo cache, Redis, CDN |
| **Cost** | $4/million queries + $2/million real-time updates | EC2/ECS/EKS infrastructure cost |
| **Customization** | Limited to resolver templates | Full control |
| **Monitoring** | CloudWatch + X-Ray built-in | Custom setup |

**BD context:** At Right Tracks, we chose AppSync for real-time features because managed WebSocket scaling removed the need for Socket.io infrastructure. For a live streaming platform, this meant zero operational overhead for scaling WebSocket connections during peak events — AppSync handles millions of concurrent subscriptions automatically.

### Q: Explain AppSync resolver types and data sources.

**A:**

**Data Sources:**
- **DynamoDB:** Direct table operations without Lambda
- **Lambda:** Custom business logic
- **RDS (Aurora Serverless):** SQL queries via Data API
- **HTTP:** Any HTTP endpoint (REST APIs, microservices)
- **OpenSearch:** Full-text search queries
- **EventBridge:** Publish events to an event bus
- **None:** Local resolvers for computed fields

**Resolver Types:**

1. **Unit Resolvers:** Single data source, single request/response mapping.
2. **Pipeline Resolvers:** Chain multiple functions (steps) in sequence. Each function can talk to a different data source. Context passes between steps.

```
Pipeline Resolver: getProtectedUser
├── Function 1: AuthCheck (Lambda data source) — verify permissions
├── Function 2: GetUser (DynamoDB data source) — fetch user data
└── Function 3: EnrichUser (HTTP data source) — add external data
→ Final response: merged result
```

### Q: Show a JavaScript resolver example for AppSync.

**A:** AppSync now supports JavaScript resolvers (replacing VTL), which are much more readable and maintainable.

**Unit Resolver — DynamoDB GetItem:**

```javascript
// resolvers/getUser.js (AppSync JS resolver)
import { util } from '@aws-appsync/utils';

// Request mapping
export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ PK: `USER#${ctx.args.id}`, SK: 'PROFILE' }),
  };
}

// Response mapping
export function response(ctx) {
  if (!ctx.result) {
    util.error('User not found', 'NotFoundError');
  }
  return ctx.result;
}
```

**Pipeline Resolver — Auth + Data Fetch:**

```javascript
// resolvers/pipeline/before.js (Pipeline before mapping)
export function request(ctx) {
  // Initialize pipeline context (stash)
  ctx.stash.startTime = util.time.nowISO8601();
  return {};
}

export function response(ctx) {
  return ctx.result;
}

// resolvers/pipeline/authCheck.js (Function 1 — Lambda)
export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: ctx.info.fieldName,
      identity: ctx.identity,
      arguments: ctx.args,
    },
  };
}

export function response(ctx) {
  if (ctx.result.error) {
    util.error(ctx.result.error, 'UnauthorizedError');
  }
  ctx.stash.userId = ctx.result.userId;
  return ctx.result;
}

// resolvers/pipeline/getOrder.js (Function 2 — DynamoDB)
export function request(ctx) {
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionValues: util.dynamodb.toMapValues({
        ':pk': `USER#${ctx.stash.userId}`,
        ':sk': 'ORDER#',
      }),
    },
    limit: ctx.args.limit || 20,
    nextToken: ctx.args.nextToken,
  };
}

export function response(ctx) {
  return { items: ctx.result.items, nextToken: ctx.result.nextToken };
}
```

### Q: How do AppSync subscriptions work for real-time features?

**A:** AppSync subscriptions use WebSockets (via the `wss://` endpoint) and are triggered by mutations.

```graphql
type Subscription {
  # Triggered when createMessage mutation is called
  # Filtered: only receive messages for a specific channelId
  onCreateMessage(channelId: ID!): Message
    @aws_subscribe(mutations: ["createMessage"])
}

type Mutation {
  createMessage(input: CreateMessageInput!): Message
}
```

**Enhanced Filtering (server-side):**
```javascript
// Subscription resolver with enhanced filtering
export function request(ctx) {
  return {
    payload: null,
  };
}

export function response(ctx) {
  // Server-side filter: only deliver to subscribers matching criteria
  const filter = {
    channelId: { eq: ctx.args.channelId },
    // Only deliver if message priority >= subscriber's minimum
    priority: { ge: ctx.args.minPriority || 0 },
  };
  extensions.setSubscriptionFilter(util.transform.toSubscriptionFilter(filter));
  return null;
}
```

**Key characteristics:**
- WebSocket connections managed by AWS (no Socket.io needed)
- Auto-scales to millions of concurrent connections
- Connections stay alive for 24 hours max
- Client reconnection is handled by Amplify client SDK
- Cost: $0.08 per million real-time updates, $0.08 per million connection-minutes

### Q: How does AppSync handle multiple authentication modes?

**A:** AppSync supports up to 5 auth modes simultaneously on the same API. You set a default and can override per type or per field.

**Auth modes:** `API_KEY`, `AMAZON_COGNITO_USER_POOLS`, `AWS_IAM`, `OPENID_CONNECT`, `AWS_LAMBDA`

```graphql
# Schema with multiple auth modes
type Query {
  # Public: API key access
  getPublicPosts: [Post] @aws_api_key

  # Authenticated: Cognito users only
  getMyProfile: User @aws_cognito_user_pools

  # Admin: IAM (for backend services)
  getAllUsers: [User] @aws_iam

  # Both Cognito users and API key holders can access
  getPost(id: ID!): Post @aws_api_key @aws_cognito_user_pools
}

type User @aws_cognito_user_pools {
  id: ID!
  name: String!
  email: String! @aws_cognito_user_pools(cognito_groups: ["admin"]) # Only admins see email
  posts: [Post]
}
```

---

## Q4: AWS Cognito

### Q: Explain the difference between Cognito User Pools and Identity Pools.

**A:**

| Aspect | User Pool | Identity Pool (Federated Identities) |
|--------|-----------|--------------------------------------|
| **Purpose** | User directory — sign-up, sign-in, manage users | Vend temporary AWS credentials |
| **Output** | JWT tokens (ID, Access, Refresh) | Temporary AWS credentials (STS) |
| **Auth** | Username/password, social, SAML, OIDC | Cognito User Pool, social, SAML, custom developer auth |
| **Use case** | Application authentication | Direct AWS service access (S3, DynamoDB from client) |

**How they work together:**
```
User → Sign in to User Pool → Get JWT tokens
     → Exchange JWT for Identity Pool → Get temporary AWS credentials
     → Use credentials to access S3, DynamoDB directly from client
```

**When to use each:**
- **User Pool alone:** Most backend APIs. Lambda/AppSync validates JWTs. No need for Identity Pool.
- **User Pool + Identity Pool:** Mobile/SPA apps that need direct AWS access (e.g., upload to S3, query DynamoDB from client).
- **Identity Pool alone:** Federated auth from external providers without Cognito's user directory.

### Q: Explain Cognito JWT tokens in detail.

**A:** Cognito User Pools issue three tokens upon successful authentication:

**1. ID Token (1 hour TTL):**
- Contains user identity claims: `sub`, `email`, `name`, custom attributes
- Used to identify the user to your backend
- Sent to AppSync/API Gateway for authorization
- Audience (`aud`) = User Pool app client ID

**2. Access Token (1 hour TTL):**
- Contains scopes and group membership: `cognito:groups`, custom scopes
- Used for authorization decisions
- Includes OAuth 2.0 scopes for fine-grained access control
- Audience (`client_id`) = User Pool app client ID

**3. Refresh Token (configurable: 1 day to 3650 days):**
- Used to obtain new ID and Access tokens without re-login
- Stored securely on client side
- Can be revoked to force re-authentication

```typescript
// Decoded ID Token structure
{
  "sub": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
  "aud": "app-client-id",
  "email_verified": true,
  "token_use": "id",
  "auth_time": 1500000000,
  "iss": "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_EXAMPLE",
  "cognito:username": "fazle",
  "exp": 1500003600,
  "iat": 1500000000,
  "email": "fazle@example.com",
  "custom:role": "admin",         // Custom attribute
  "cognito:groups": ["admins"]    // Group membership
}
```

### Q: What are Cognito Lambda triggers and when would you use each?

**A:**

| Trigger | When It Fires | Use Case |
|---------|---------------|----------|
| Pre Sign-up | Before user creation | Auto-confirm, validate email domain, block disposable emails |
| Post Confirmation | After user is confirmed | Create user record in DynamoDB, send welcome email |
| Pre Authentication | Before auth attempt | Custom validation, check IP allowlist, rate limiting |
| Post Authentication | After successful auth | Audit logging, update last-login timestamp |
| Pre Token Generation | Before tokens are issued | Add custom claims, modify groups |
| Custom Message | Before sending email/SMS | Custom email templates, localization |
| Define Auth Challenge | Custom auth flow | Implement CAPTCHA, passwordless login |
| Create Auth Challenge | Create challenge | Generate OTP, CAPTCHA question |
| Verify Auth Challenge | Verify challenge response | Validate OTP, CAPTCHA answer |
| User Migration | User not found in pool | Migrate users from legacy system on first login |

### Q: Show a NestJS JWT validation middleware for Cognito tokens.

**A:**

```typescript
// src/auth/cognito-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly verifier;

  constructor() {
    // aws-jwt-verify handles JWKS caching, key rotation, and token validation
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
      tokenUse: 'access', // or 'id' depending on which token you expect
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.verifier.verify(token);
      // Attach decoded token to request for downstream use
      request.user = {
        sub: payload.sub,
        username: payload.username,
        groups: payload['cognito:groups'] || [],
        scope: payload.scope,
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

// src/auth/roles.guard.ts — Role-based access using Cognito groups
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.groups.includes(role));
  }
}

// Usage in controller
@Controller('admin')
@UseGuards(CognitoAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @SetMetadata('roles', ['admin'])
  getUsers() {
    return this.userService.findAll();
  }
}
```

### Q: Show a Lambda trigger for post-confirmation.

**A:**

```typescript
// src/triggers/post-confirmation.ts
import { PostConfirmationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({}); // Created outside handler for reuse

export const handler: PostConfirmationTriggerHandler = async (event) => {
  // Only run for confirmed sign-up (not forgot password)
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const { sub, email, name } = event.request.userAttributes;
  const now = new Date().toISOString();

  await dynamodb.send(
    new PutItemCommand({
      TableName: process.env.USERS_TABLE!,
      Item: marshall({
        PK: `USER#${sub}`,
        SK: 'PROFILE',
        id: sub,
        email,
        name: name || '',
        plan: 'free',
        createdAt: now,
        updatedAt: now,
        GSI1PK: 'USER',
        GSI1SK: now, // For querying users by creation date
      }),
      ConditionExpression: 'attribute_not_exists(PK)', // Idempotency
    }),
  );

  console.log(JSON.stringify({
    level: 'INFO',
    message: 'User profile created',
    userId: sub,
    email,
  }));

  return event; // Must return the event object
};
```

### Q: How does Cognito handle MFA and advanced security?

**A:**

**MFA Options:**
- **SMS:** OTP via SMS. Simple but less secure (SIM swapping). Requires SNS.
- **TOTP:** Time-based One-Time Password via authenticator apps (Google Authenticator, Authy). More secure.
- **MFA can be:** Optional (user chooses), Required (all users), or Adaptive (risk-based).

**Advanced Security Features (paid):**
- **Compromised credentials detection:** Checks passwords against known breach databases
- **Adaptive authentication:** Analyzes sign-in context (device, location, IP) and assigns risk score
  - Low risk: allow sign-in
  - Medium risk: require MFA
  - High risk: block sign-in
- **Cost:** $0.050 per MAU (monthly active user) for advanced security

---

## Q5: S3 (Simple Storage Service)

### Q: Explain S3 storage classes and when to use each.

**A:**

| Storage Class | Use Case | Availability | Min Duration | Retrieval Cost |
|---------------|----------|-------------|-------------|----------------|
| **Standard** | Frequently accessed data | 99.99% | None | None |
| **Intelligent-Tiering** | Unknown access patterns | 99.9% | None | None (monitoring fee) |
| **Standard-IA** | Infrequent access, rapid retrieval | 99.9% | 30 days | Per-GB retrieval |
| **One Zone-IA** | Infrequent, non-critical, reproducible | 99.5% | 30 days | Per-GB retrieval |
| **Glacier Instant** | Archive, millisecond retrieval | 99.9% | 90 days | Per-GB retrieval |
| **Glacier Flexible** | Archive, minutes-hours retrieval | 99.99% | 90 days | Per-GB + per-request |
| **Glacier Deep Archive** | Long-term archive, 12-hour retrieval | 99.99% | 180 days | Per-GB + per-request |

**Lifecycle Policy Example:**
```
Day 0-30:   Standard (active uploads, frequent access)
Day 31-90:  Standard-IA (occasional access)
Day 91-365: Glacier Instant (rare access, fast retrieval needed)
Day 365+:   Glacier Deep Archive (compliance/audit archive)
```

### Q: Explain S3 presigned URLs and show a code example.

**A:** Presigned URLs provide temporary, secure access to private S3 objects without making them public. The URL includes authentication information in query parameters.

**Use cases:**
- **Upload:** Client uploads directly to S3, bypassing your server (reduces bandwidth and cost)
- **Download:** Temporary access to private files (invoices, reports, media)

```typescript
// src/services/s3.service.ts
import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3 = new S3Client({ region: process.env.AWS_REGION });
  private readonly bucket = process.env.UPLOAD_BUCKET!;

  /**
   * Generate a presigned URL for client-side upload.
   * Client will PUT the file directly to S3.
   */
  async getUploadUrl(
    userId: string,
    contentType: string,
    fileExtension: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const key = `uploads/${userId}/${uuid()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      // Metadata for downstream processing
      Metadata: {
        'uploaded-by': userId,
        'upload-time': new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300, // 5 minutes to complete upload
    });

    return { uploadUrl, key };
  }

  /**
   * Generate a presigned URL for downloading a private object.
   */
  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: 3600, // 1 hour
    });
  }
}
```

```typescript
// Controller usage
@Controller('files')
@UseGuards(CognitoAuthGuard)
export class FileController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('upload-url')
  async getUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body() body: { contentType: string; fileExtension: string },
  ) {
    const { uploadUrl, key } = await this.s3Service.getUploadUrl(
      req.user.sub,
      body.contentType,
      body.fileExtension,
    );
    return { uploadUrl, key };
  }
}
```

**Client-side upload flow:**
```
1. Client → POST /files/upload-url → Server returns { uploadUrl, key }
2. Client → PUT file to uploadUrl (direct to S3, no server bandwidth)
3. S3 Event → Lambda processes file (thumbnail, virus scan, etc.)
4. Client → GET /files/{key}/download-url → Server returns presigned GET URL
```

### Q: Show a Lambda triggered by S3 for image processing.

**A:**

```typescript
// src/triggers/image-processor.ts
import { S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp'; // Include in Lambda Layer

const s3 = new S3Client({});

const THUMBNAIL_SIZES = [
  { suffix: 'thumb', width: 150, height: 150 },
  { suffix: 'medium', width: 600, height: 600 },
];

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Skip if already a thumbnail (prevent infinite loop)
    if (key.includes('/thumbnails/')) continue;

    console.log(JSON.stringify({
      level: 'INFO',
      message: 'Processing image',
      bucket,
      key,
      size: record.s3.object.size,
    }));

    // Get original image
    const { Body } = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const imageBuffer = Buffer.from(await Body!.transformToByteArray());

    // Generate thumbnails in parallel
    await Promise.all(
      THUMBNAIL_SIZES.map(async ({ suffix, width, height }) => {
        const resized = await sharp(imageBuffer)
          .resize(width, height, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();

        const thumbnailKey = key
          .replace('uploads/', 'thumbnails/')
          .replace(/\.[^.]+$/, `-${suffix}.webp`);

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: thumbnailKey,
            Body: resized,
            ContentType: 'image/webp',
            CacheControl: 'max-age=31536000', // 1 year cache
          }),
        );
      }),
    );
  }
};
```

### Q: How do you secure S3 buckets and control access?

**A:**

**Access control mechanisms (in order of preference):**

1. **Bucket Policy:** JSON policy attached to bucket. Controls who can do what at the bucket level.
2. **IAM Policy:** Controls what IAM users/roles can do. Attached to the principal.
3. **S3 Access Points:** Simplified per-application access policies. One bucket, multiple access points with different policies.
4. **ACLs:** Legacy, disabled by default on new buckets. Avoid using.

**Security best practices:**
- Block all public access (default on new buckets)
- Enable versioning + MFA Delete for critical data
- Enable server-side encryption (SSE-S3 is default, SSE-KMS for compliance)
- Use VPC endpoints for private access from Lambda/EC2
- Enable access logging
- Use lifecycle policies to auto-delete temporary uploads

```json
// Bucket policy: Lambda role can read/write, nothing else
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLambdaAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/ImageProcessorLambdaRole"
      },
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-bucket/uploads/*"
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

---

## Q6: CloudWatch & X-Ray — Monitoring & Tracing

### Q: How would you set up comprehensive monitoring for a serverless application?

**A:** Monitoring serverless requires three pillars: **Logs**, **Metrics**, and **Traces**.

**CloudWatch Logs:**

```
Log Group: /aws/lambda/notification-sender
├── Log Stream: 2024/01/15/[$LATEST]abc123   (one per container)
├── Log Stream: 2024/01/15/[$LATEST]def456
└── Retention: 30 days (set explicitly — default is never expire!)
```

**Structured Logging (JSON) — essential for Lambda:**

```typescript
// src/utils/logger.ts
interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  correlationId?: string;
  userId?: string;
  duration?: number;
  [key: string]: unknown;
}

export function log(entry: LogEntry): void {
  // CloudWatch parses JSON logs automatically for Log Insights queries
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME,
    environment: process.env.STAGE,
  }));
}

// Usage in handler
export const handler = async (event: APIGatewayProxyEvent) => {
  const correlationId =
    event.headers['x-correlation-id'] || crypto.randomUUID();

  log({
    level: 'INFO',
    message: 'Processing notification request',
    correlationId,
    userId: event.requestContext.authorizer?.claims?.sub,
    path: event.path,
    method: event.httpMethod,
  });

  const startTime = Date.now();

  try {
    const result = await processNotification(event);

    log({
      level: 'INFO',
      message: 'Notification sent successfully',
      correlationId,
      duration: Date.now() - startTime,
      notificationId: result.id,
    });

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    log({
      level: 'ERROR',
      message: 'Failed to send notification',
      correlationId,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
```

**CloudWatch Log Insights query examples:**

```sql
-- Find all errors in the last hour
fields @timestamp, message, correlationId, error
| filter level = "ERROR"
| sort @timestamp desc
| limit 50

-- Average duration by API path
fields path, duration
| filter level = "INFO" and ispresent(duration)
| stats avg(duration) as avgDuration, count(*) as requests by path
| sort avgDuration desc

-- P99 latency
fields duration
| filter ispresent(duration)
| stats pct(duration, 99) as p99, pct(duration, 95) as p95, avg(duration) as avg
```

### Q: Explain CloudWatch Metrics and Alarms for Lambda.

**A:**

**Default Lambda Metrics (free):**
- `Invocations` — number of invocations
- `Errors` — invocations that resulted in error
- `Duration` — execution time in ms
- `Throttles` — invocations throttled (concurrency limit)
- `ConcurrentExecutions` — concurrent executions at any point
- `IteratorAge` — age of last record for stream-based triggers (DynamoDB Streams, Kinesis)

**Custom Metrics:**

```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({});

// Embedded Metric Format (EMF) — cheaper alternative to PutMetricData
// CloudWatch automatically extracts metrics from specially formatted log lines
function emitMetric(name: string, value: number, unit: string): void {
  // EMF format — extracted as CloudWatch metric automatically
  console.log(JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: 'BanglalinkNotifications',
        Dimensions: [['Service', 'Environment']],
        Metrics: [{ Name: name, Unit: unit }],
      }],
    },
    Service: 'notification-sender',
    Environment: process.env.STAGE,
    [name]: value,
  }));
}

// Usage
emitMetric('NotificationsSent', batchSize, 'Count');
emitMetric('ProcessingTime', duration, 'Milliseconds');
```

**Alarms:**

```typescript
// CDK Alarm definition
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';

const alertTopic = new sns.Topic(this, 'AlertTopic');

// Error rate alarm
const errorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  metric: lambdaFunction.metricErrors({
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 10,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Lambda errors exceeded 10 in 5 minutes',
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
errorAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

// Throttle alarm
const throttleAlarm = new cloudwatch.Alarm(this, 'ThrottleAlarm', {
  metric: lambdaFunction.metricThrottles({
    period: cdk.Duration.minutes(1),
    statistic: 'Sum',
  }),
  threshold: 0,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Lambda is being throttled — increase concurrency limit',
});

// Billing alarm (BD cost management)
const billingAlarm = new cloudwatch.Alarm(this, 'BillingAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/Billing',
    metricName: 'EstimatedCharges',
    statistic: 'Maximum',
    period: cdk.Duration.hours(6),
    dimensionsMap: { Currency: 'USD' },
  }),
  threshold: 500, // Alert if monthly bill exceeds $500
  evaluationPeriods: 1,
});
```

### Q: How does X-Ray distributed tracing work with serverless?

**A:** X-Ray traces requests as they flow through multiple AWS services, creating a **service map** showing latency and errors at each hop.

```
Client → API Gateway (segment) → Lambda (segment)
                                    ├── DynamoDB (subsegment)
                                    ├── External API (subsegment)
                                    └── SQS (subsegment)
```

**Setup:** Enable X-Ray tracing on Lambda and API Gateway (one checkbox/config each). For custom subsegments:

```typescript
// src/utils/tracing.ts
import * as AWSXRay from 'aws-xray-sdk-core';
import https from 'https';

// Instrument AWS SDK — all AWS calls automatically traced
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Instrument HTTP calls
AWSXRay.captureHTTPsGlobal(https);

// Custom subsegment for business logic
export async function tracedOperation<T>(
  name: string,
  operation: () => Promise<T>,
  annotations?: Record<string, string | number | boolean>,
): Promise<T> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment(name);

  // Annotations are indexed — searchable in X-Ray console
  if (annotations && subsegment) {
    Object.entries(annotations).forEach(([key, value]) => {
      subsegment.addAnnotation(key, value);
    });
  }

  try {
    const result = await operation();
    subsegment?.close();
    return result;
  } catch (error) {
    subsegment?.addError(error as Error);
    subsegment?.close();
    throw error;
  }
}

// Usage
const user = await tracedOperation(
  'FetchUserFromExternalAPI',
  () => externalApi.getUser(userId),
  { userId, source: 'partner-api' },
);
```

**Sampling rules:** Control cost by sampling a percentage of requests. Default: 1 request/second + 5% of additional requests. Custom rules can sample more for specific routes.

---

## Q7: AWS Serverless Patterns & Architecture

### Q: Describe the most common serverless architecture patterns.

**A:**

**Pattern 1: Synchronous API (Standard CRUD)**
```
Client → API Gateway (HTTP API) → Lambda → DynamoDB
                                         → Return response
```
Use for: REST APIs, CRUD operations, real-time responses.

**Pattern 2: Asynchronous Processing**
```
Client → API Gateway → Lambda (accepts request)
                          ↓ (publishes event)
                        SQS Queue → Lambda (processes async)
                          ↓ (failure)
                        Dead Letter Queue → Alarm
```
Use for: Long-running tasks, email sending, report generation.

**Pattern 3: Event-Driven File Processing**
```
Client → S3 (presigned upload) → S3 Event Notification
                                        ↓
                                  Lambda (process file)
                                    ├── DynamoDB (store metadata)
                                    ├── S3 (store processed output)
                                    └── SNS (notify user)
```
Use for: Image resizing, video transcoding, CSV import.

**Pattern 4: Fan-Out**
```
Source → SNS Topic
           ├── SQS Queue A → Lambda A (send email)
           ├── SQS Queue B → Lambda B (update analytics)
           ├── SQS Queue C → Lambda C (push notification)
           └── Lambda D (audit log)
```
Use for: One event triggers multiple independent processes.

**Pattern 5: Event Bus (Decoupled Microservices)**
```
Service A → EventBridge ← Rules
Service B → EventBridge     ├── Rule 1 → Lambda (order processing)
Service C → EventBridge     ├── Rule 2 → Step Functions (workflow)
                            └── Rule 3 → SQS → Lambda (analytics)
```
Use for: Microservice decoupling, cross-service communication.

**Pattern 6: Orchestration with Step Functions**
```
API Gateway → Step Functions
                ├── Validate Order (Lambda)
                ├── Check Inventory (Lambda)
                ├── Process Payment (Lambda)
                │     ├── Success → Ship Order (Lambda)
                │     └── Failure → Refund (Lambda)
                └── Send Confirmation (Lambda)
```
Use for: Multi-step workflows, saga pattern, retries.

**Pattern 7: Edge Computing**
```
User → CloudFront → Lambda@Edge (auth check, A/B test)
                  → S3 (static assets)
                  → API Gateway → Lambda (dynamic content)
```
Use for: Global low-latency, auth at edge, A/B testing.

### Q: Explain Step Functions in detail.

**A:** Step Functions orchestrate multiple Lambda functions (and other AWS services) into serverless workflows using a state machine defined in ASL (Amazon States Language).

**Standard vs Express:**

| Feature | Standard | Express |
|---------|----------|---------|
| Max duration | 1 year | 5 minutes |
| Execution model | Exactly-once | At-least-once (async) / At-most-once (sync) |
| Price | $0.025/1000 transitions | $1/million requests + duration |
| History | Full execution history | CloudWatch Logs |
| Use case | Long-running workflows, order processing | High-volume, short ETL jobs |

**State types:**
- **Task:** Execute work (Lambda, DynamoDB, SQS, etc.)
- **Choice:** Branching logic (if/else)
- **Parallel:** Run branches concurrently
- **Map:** Iterate over an array (like forEach)
- **Wait:** Delay execution (seconds or timestamp)
- **Pass:** Pass input to output (transform data)
- **Succeed/Fail:** Terminal states

**Error handling:**

```json
{
  "ProcessPayment": {
    "Type": "Task",
    "Resource": "arn:aws:lambda:...:processPayment",
    "Retry": [
      {
        "ErrorEquals": ["ServiceUnavailable", "TooManyRequestsException"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2.0
      }
    ],
    "Catch": [
      {
        "ErrorEquals": ["PaymentDeclined"],
        "Next": "HandlePaymentFailure",
        "ResultPath": "$.error"
      },
      {
        "ErrorEquals": ["States.ALL"],
        "Next": "HandleUnexpectedError",
        "ResultPath": "$.error"
      }
    ],
    "Next": "ShipOrder"
  }
}
```

### Q: How does SQS work as a Lambda event source?

**A:**

```typescript
// CDK: SQS → Lambda with DLQ
const dlq = new sqs.Queue(this, 'DLQ', {
  retentionPeriod: cdk.Duration.days(14),
});

const queue = new sqs.Queue(this, 'NotificationQueue', {
  visibilityTimeout: cdk.Duration.seconds(180), // 6x Lambda timeout
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3, // After 3 failures → DLQ
  },
});

const processor = new nodejs.NodejsFunction(this, 'Processor', {
  timeout: cdk.Duration.seconds(30),
  // ...
});

// Lambda polls SQS, processes batches
processor.addEventSource(
  new SqsEventSource(queue, {
    batchSize: 10,
    maxBatchingWindow: cdk.Duration.seconds(5), // Wait up to 5s to fill batch
    reportBatchItemFailures: true, // Partial batch failure reporting
  }),
);
```

```typescript
// Lambda handler with partial batch failure reporting
import { SQSHandler, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Process each message independently
  await Promise.allSettled(
    event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);
        await sendNotification(body);
      } catch (error) {
        console.error(`Failed to process message ${record.messageId}`, error);
        // Report only this message as failed — it will be retried
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }),
  );

  // Return failures — successful messages are deleted from queue
  return { batchItemFailures };
};
```

**Key tuning:**
- `visibilityTimeout` should be >= 6x Lambda timeout (AWS recommendation)
- `batchSize` (1-10,000 for standard, 1-10 for FIFO): larger = higher throughput, but one failure retries entire batch unless using `reportBatchItemFailures`
- `maxBatchingWindow`: wait to accumulate messages before invoking Lambda, reduces invocations

### Q: Explain EventBridge and when to use it over SQS/SNS.

**A:**

| Feature | EventBridge | SQS | SNS |
|---------|-------------|-----|-----|
| Pattern | Event bus | Queue | Pub/Sub |
| Filtering | Content-based rules (deep JSON matching) | No native filtering | Basic attribute filtering |
| Targets | 20+ AWS services | Lambda, EC2 | Lambda, SQS, HTTP, email, SMS |
| Ordering | No guarantee | FIFO available | No guarantee |
| Retry | Built-in DLQ | Visibility timeout + DLQ | Delivery retries per protocol |
| Schema | Schema registry + discovery | None | None |
| Cross-account | Native | Requires policy | Requires policy |

**Use EventBridge when:** Decoupling microservices, routing events based on content, cross-account/cross-region events, scheduled tasks (cron replacement), schema evolution.

```typescript
// Publishing an event
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventbridge = new EventBridgeClient({});

await eventbridge.send(
  new PutEventsCommand({
    Entries: [
      {
        Source: 'banglalink.notifications',
        DetailType: 'NotificationSent',
        Detail: JSON.stringify({
          userId: 'user-123',
          channel: 'push',
          campaignId: 'campaign-456',
          status: 'delivered',
        }),
        EventBusName: 'banglalink-events',
      },
    ],
  }),
);
```

```typescript
// CDK: EventBridge rule → Lambda
const rule = new events.Rule(this, 'NotificationAnalyticsRule', {
  eventBus: bus,
  eventPattern: {
    source: ['banglalink.notifications'],
    detailType: ['NotificationSent'],
    detail: {
      status: ['delivered', 'failed'],
      channel: ['push', 'sms'],
    },
  },
});

rule.addTarget(new targets.LambdaFunction(analyticsLambda));

// Scheduled event (cron replacement)
new events.Rule(this, 'DailyReportRule', {
  schedule: events.Schedule.cron({ hour: '6', minute: '0' }), // 6 AM UTC daily
  targets: [new targets.LambdaFunction(reportGeneratorLambda)],
});
```

---

## Q8: Infrastructure as Code for Serverless

### Q: Compare AWS SAM, CDK, Serverless Framework, and Terraform for serverless.

**A:**

| Feature | SAM | CDK | Serverless Framework | Terraform |
|---------|-----|-----|---------------------|-----------|
| **Language** | YAML/JSON | TypeScript/Python/Java/etc. | YAML + plugins | HCL |
| **Abstraction** | CloudFormation extensions | L1/L2/L3 constructs | Opinionated serverless | Provider-agnostic |
| **Learning curve** | Low | Medium | Low | Medium |
| **Local testing** | `sam local invoke` | None (use SAM with CDK) | `sls invoke local` | None |
| **Multi-cloud** | AWS only | AWS only | Yes (plugins) | Yes (native) |
| **Ecosystem** | AWS-maintained | AWS-maintained, growing | Large plugin ecosystem | Massive provider ecosystem |
| **State** | CloudFormation | CloudFormation | CloudFormation (AWS) | Terraform state |
| **Best for** | Simple serverless apps | Complex infrastructure, type safety | Quick Lambda deployments | Multi-cloud, existing Terraform shops |

**Recommendation:** CDK for TypeScript teams building complex AWS infrastructure. SAM for quick Lambda prototypes. Terraform if you need multi-cloud or already use it.

### Q: Show a comprehensive CDK stack for a serverless application.

**A:**

```typescript
// lib/notification-service-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

interface NotificationStackProps extends cdk.StackProps {
  stage: 'dev' | 'staging' | 'prod';
}

export class NotificationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // ─── DynamoDB Table ───
    const table = new dynamodb.Table(this, 'NotificationsTable', {
      tableName: `notifications-${stage}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: stage === 'prod'
        ? dynamodb.BillingMode.PROVISIONED
        : dynamodb.BillingMode.PAY_PER_REQUEST,
      readCapacity: stage === 'prod' ? 100 : undefined,
      writeCapacity: stage === 'prod' ? 50 : undefined,
      pointInTimeRecovery: stage === 'prod',
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    if (stage === 'prod') {
      table.autoScaleReadCapacity({ minCapacity: 100, maxCapacity: 5000 })
        .scaleOnUtilization({ targetUtilizationPercent: 70 });
      table.autoScaleWriteCapacity({ minCapacity: 50, maxCapacity: 2000 })
        .scaleOnUtilization({ targetUtilizationPercent: 70 });
    }

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // ─── SQS Queue with DLQ ───
    const dlq = new sqs.Queue(this, 'NotificationDLQ', {
      queueName: `notification-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const queue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: `notification-queue-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(180),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    });

    // ─── Shared environment ───
    const sharedEnv = {
      TABLE_NAME: table.tableName,
      QUEUE_URL: queue.queueUrl,
      STAGE: stage,
      SERVICE_NAME: 'notification-service',
    };

    // ─── API Handler Lambda ───
    const apiHandler = new nodejs.NodejsFunction(this, 'ApiHandler', {
      functionName: `notification-api-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'src/api/lambda.ts',
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      architecture: lambda.Architecture.ARM_64,
      environment: sharedEnv,
      tracing: lambda.Tracing.ACTIVE, // X-Ray
      bundling: { minify: true, sourceMap: true },
    });

    table.grantReadWriteData(apiHandler);
    queue.grantSendMessages(apiHandler);

    // ─── Queue Processor Lambda ───
    const processor = new nodejs.NodejsFunction(this, 'QueueProcessor', {
      functionName: `notification-processor-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'src/workers/processor.ts',
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment: sharedEnv,
      tracing: lambda.Tracing.ACTIVE,
      reservedConcurrentExecutions: stage === 'prod' ? 100 : 10,
    });

    table.grantReadWriteData(processor);
    processor.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true,
      }),
    );

    // ─── HTTP API ───
    const httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: `notification-api-${stage}`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['Authorization', 'Content-Type'],
      },
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration(
        'ApiIntegration',
        apiHandler,
      ),
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
  }
}
```

### Q: Show a SAM template for a serverless notification service.

**A:**

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Banglalink Notification Service

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    Architectures: [arm64]
    Tracing: Active
    Environment:
      Variables:
        TABLE_NAME: !Ref NotificationsTable
        STAGE: !Ref Stage

Parameters:
  Stage:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  # API
  NotificationApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: !Ref Stage
      CorsConfiguration:
        AllowOrigins: ["*"]
        AllowMethods: ["GET", "POST", "PUT", "DELETE"]
        AllowHeaders: ["Authorization", "Content-Type"]

  # API Handler
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/api/
      Handler: lambda.handler
      MemorySize: 512
      Timeout: 29
      Events:
        CatchAll:
          Type: HttpApi
          Properties:
            ApiId: !Ref NotificationApi
            Path: /{proxy+}
            Method: ANY
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref NotificationsTable
        - SQSSendMessagePolicy:
            QueueName: !GetAtt NotificationQueue.QueueName
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2022
        EntryPoints: [lambda.ts]

  # Queue Processor
  ProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/workers/
      Handler: processor.handler
      ReservedConcurrentExecutions: 10
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt NotificationQueue.Arn
            BatchSize: 10
            FunctionResponseTypes: [ReportBatchItemFailures]
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref NotificationsTable

  # DynamoDB
  NotificationsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub notifications-${Stage}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - { AttributeName: PK, AttributeType: S }
        - { AttributeName: SK, AttributeType: S }
      KeySchema:
        - { AttributeName: PK, KeyType: HASH }
        - { AttributeName: SK, KeyType: RANGE }

  # SQS
  NotificationQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub notification-queue-${Stage}
      VisibilityTimeout: 180
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt NotificationDLQ.Arn
        maxReceiveCount: 3

  NotificationDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub notification-dlq-${Stage}
      MessageRetentionPeriod: 1209600 # 14 days

Outputs:
  ApiUrl:
    Value: !Sub "https://${NotificationApi}.execute-api.${AWS::Region}.amazonaws.com/${Stage}"
```

---

## Q9: Cost Optimization (BD Context)

### Q: How would you optimize AWS serverless costs for a BD-based company?

**A:** Cost management is critical for BD companies where cloud budgets are tighter. Here is a systematic approach:

**1. Lambda Cost Optimization:**

```
Lambda cost = Requests + Duration (GB-seconds)

Requests: $0.20 per 1 million
Duration: $0.0000166667 per GB-second

Optimization levers:
├── Reduce memory → reduces GB-second cost (but may increase duration)
├── Reduce duration → optimize code, connection pooling, caching
├── Reduce invocations → batch processing, debouncing
└── Use ARM64 → 20% cheaper, 20% faster startup
```

**Lambda Power Tuning:** Use the `aws-lambda-power-tuning` Step Functions tool to find the optimal memory/cost balance:
```
128MB: 2000ms → 0.128 * 2.0 = 0.256 GB-s → $0.00000427
256MB: 1000ms → 0.256 * 1.0 = 0.256 GB-s → $0.00000427 (same cost, faster!)
512MB:  500ms → 0.512 * 0.5 = 0.256 GB-s → $0.00000427 (same cost, even faster!)
1024MB: 300ms → 1.024 * 0.3 = 0.307 GB-s → $0.00000512 (more expensive)

Best: 512MB — same cost as 128MB, 4x faster response
```

**2. API Gateway:**
- HTTP API is 70% cheaper than REST API ($1.00/M vs $3.50/M)
- At Banglalink scale (300M requests/month): REST = $1,050/mo, HTTP = $300/mo → **$750/mo savings**
- Use API Gateway caching (REST) to reduce Lambda invocations

**3. DynamoDB:**
- On-demand: $1.25/million WCUs, $0.25/million RCUs (good for unpredictable workloads)
- Provisioned + auto-scaling: up to 5-7x cheaper for steady workloads
- Reserved capacity (1-year/3-year): additional 50-75% savings for predictable base load
- Use GSIs sparingly (each GSI replicates data and consumes WCU)

**4. S3:**
- Lifecycle policies: move logs to Glacier after 30 days → 80% savings
- Intelligent-Tiering for unpredictable access: $0.0025/1000 objects monitoring fee, auto-transitions
- Compress before storing (gzip/brotli)

**5. CloudWatch:**
- Set log retention policies (default is never expire — accumulates cost!)
- Use EMF (Embedded Metric Format) instead of `PutMetricData` API calls
- Avoid logging entire request/response bodies

**6. Cost Monitoring:**

```typescript
// CDK: Budget alert
new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetName: 'banglalink-serverless-monthly',
    budgetType: 'COST',
    timeUnit: 'MONTHLY',
    budgetLimit: { amount: 500, unit: 'USD' },
  },
  notificationsWithSubscribers: [
    {
      notification: {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 80, // Alert at 80% of budget
      },
      subscribers: [
        { subscriptionType: 'EMAIL', address: 'devops@banglalink.net' },
      ],
    },
  ],
});
```

**Real example — Banglalink notification service cost breakdown:**

| Component | Volume | Monthly Cost |
|-----------|--------|-------------|
| Lambda (sender) | 300M invocations, 200ms avg, 256MB | $303 |
| HTTP API Gateway | 300M requests | $300 |
| DynamoDB (provisioned) | 500 WCU, 2000 RCU | $385 |
| SQS | 300M messages | $120 |
| S3 (templates) | 10 GB, 10M reads | $5 |
| CloudWatch | Logs + metrics | $50 |
| **Total** | | **~$1,163/month** |

vs. EC2 equivalent (4x c5.xlarge 24/7 + ALB + auto-scaling): ~$1,200/month base + ops overhead

**Serverless wins** for bursty workloads and eliminates ops overhead.

### Q: When would you NOT use serverless?

**A:**

| Scenario | Why Not Serverless | Better Alternative |
|----------|-------------------|-------------------|
| Long-running processes (>15 min) | Lambda 15-min timeout | ECS Fargate, EC2 |
| Consistent high throughput | Provisioned concurrency cost exceeds EC2 | ECS/EKS with auto-scaling |
| WebSocket-heavy (custom protocol) | API Gateway WebSocket limitations | ECS + Socket.io |
| GPU workloads (ML inference) | Lambda has no GPU | SageMaker, EC2 GPU |
| Large deployment packages | 250MB unzipped limit | Container on ECS |
| Sub-10ms latency requirements | Cold starts, API Gateway overhead | EC2/ECS with ALB |
| Stateful applications | Lambda is stateless | ECS, EC2 |

---

## Q10: Serverless Security

### Q: How do you implement security for serverless applications?

**A:**

**1. IAM — Principle of Least Privilege:**

Every Lambda function should have its own execution role with only the permissions it needs.

```typescript
// CDK: Least-privilege role
const notificationSender = new nodejs.NodejsFunction(this, 'Sender', {
  // ... function config
});

// Grant ONLY what's needed (CDK generates tight policies)
table.grantReadWriteData(notificationSender);     // DynamoDB CRUD on this table
queue.grantSendMessages(notificationSender);        // SQS SendMessage on this queue
topic.grantPublish(notificationSender);             // SNS Publish on this topic

// For fine-grained control, use inline policy
notificationSender.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['dynamodb:Query', 'dynamodb:GetItem'],  // Read-only
    resources: [
      table.tableArn,
      `${table.tableArn}/index/GSI1`,  // Specific GSI
    ],
    conditions: {
      // Restrict to specific partition key prefix
      'ForAllValues:StringLike': {
        'dynamodb:LeadingKeys': ['USER#*'],
      },
    },
  }),
);
```

**Anti-pattern — overly permissive role:**
```json
{
  "Effect": "Allow",
  "Action": "dynamodb:*",
  "Resource": "*"
}
```
Never do this. If this Lambda is compromised, the attacker has full DynamoDB access to all tables.

**2. Environment Variable Encryption:**

```typescript
// CDK: Use SSM Parameter Store or Secrets Manager
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Config values → Parameter Store (free)
const apiEndpoint = ssm.StringParameter.fromStringParameterName(
  this, 'ApiEndpoint', '/notification-service/prod/api-endpoint',
);

// Secrets → Secrets Manager ($0.40/secret/month, auto-rotation)
const dbPassword = secretsmanager.Secret.fromSecretNameV2(
  this, 'DbPassword', 'notification-service/prod/db-password',
);

const fn = new nodejs.NodejsFunction(this, 'Handler', {
  environment: {
    API_ENDPOINT: apiEndpoint.stringValue,     // Resolved at deploy time
    DB_SECRET_ARN: dbPassword.secretArn,       // Resolved at runtime
  },
});

// Grant read access
apiEndpoint.grantRead(fn);
dbPassword.grantRead(fn);
```

```typescript
// Runtime: fetch secret (with caching)
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
let cachedSecret: string | null = null;

async function getSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const result = await client.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }),
  );
  cachedSecret = result.SecretString!;
  return cachedSecret;
}
```

**3. Parameter Store vs Secrets Manager:**

| Feature | Parameter Store | Secrets Manager |
|---------|----------------|-----------------|
| Cost | Free (standard) / $0.05 per 10K calls (advanced) | $0.40/secret/month + $0.05 per 10K calls |
| Auto-rotation | No | Yes (Lambda-based) |
| Max size | 8 KB (advanced) | 64 KB |
| Cross-account | No | Yes |
| Versioning | Yes | Yes |
| Use for | Config values, feature flags, non-sensitive settings | Database passwords, API keys, certificates |

**4. API Gateway Security:**

```typescript
// WAF integration (REST API only)
const waf = new wafv2.CfnWebACL(this, 'ApiWaf', {
  defaultAction: { allow: {} },
  scope: 'REGIONAL',
  rules: [
    // AWS managed rule: rate limiting
    {
      name: 'RateLimit',
      priority: 1,
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          limit: 2000, // per 5-minute window per IP
          aggregateKeyType: 'IP',
        },
      },
      visibilityConfig: { /* ... */ },
    },
    // AWS managed rule: SQL injection protection
    {
      name: 'SQLInjection',
      priority: 2,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesSQLiRuleSet',
        },
      },
      visibilityConfig: { /* ... */ },
    },
  ],
  visibilityConfig: { /* ... */ },
});
```

**5. Input Validation — Never trust event data:**

```typescript
// Use zod for runtime validation
import { z } from 'zod';

const NotificationSchema = z.object({
  userId: z.string().uuid(),
  channel: z.enum(['push', 'sms', 'email']),
  message: z.string().min(1).max(1000),
  metadata: z.record(z.string()).optional(),
});

export const handler = async (event: APIGatewayProxyEvent) => {
  const parseResult = NotificationSchema.safeParse(JSON.parse(event.body || '{}'));

  if (!parseResult.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation failed',
        details: parseResult.error.issues,
      }),
    };
  }

  // parseResult.data is now fully typed and validated
  const notification = parseResult.data;
  // ...
};
```

---

## Q11: Serverless Anti-Patterns & Gotchas

### Q: What are common Lambda anti-patterns?

**A:**

**1. Monolithic Lambda (Lambda-lith):**
```
BAD (if taken too far):
  One Lambda → handles ALL routes, ALL business logic
  - Loses per-function scaling
  - Loses per-function IAM (broad permissions)
  - Larger package = slower cold starts
  - One bug affects all endpoints

ALSO BAD (if taken too far):
  One Lambda PER ROUTE PER METHOD
  - Hundreds of functions to manage
  - Deployment complexity
  - Code duplication

BALANCED:
  One Lambda per bounded context / microservice
  - notification-api (handles all /notifications/* routes)
  - user-api (handles all /users/* routes)
  - Each has its own IAM role, scaling, and deployment
```

**2. Synchronous Lambda Chains:**
```
BAD:
  API GW → Lambda A → invokes Lambda B → invokes Lambda C
  - Multiplied latency
  - Multiplied cost (paying for A waiting on B waiting on C)
  - Complex error handling
  - Timeout cascades

GOOD:
  API GW → Lambda A → SQS → Lambda B → SQS → Lambda C
  (async, decoupled)

  OR:
  API GW → Step Functions → Lambda A → Lambda B → Lambda C
  (orchestrated, with built-in retry/error handling)
```

**3. Not reusing connections:**
```typescript
// BAD: Creating client inside handler (new connection per invocation)
export const handler = async (event: any) => {
  const dynamodb = new DynamoDBClient({}); // Cold start penalty every time
  // ...
};

// GOOD: Create client outside handler (reused across warm invocations)
const dynamodb = new DynamoDBClient({});

export const handler = async (event: any) => {
  // dynamodb client is reused
  // ...
};
```

**4. Storing state in /tmp:**
```typescript
// BAD: Assuming /tmp persists across invocations
let processedCount = 0; // Resets when new container starts

export const handler = async () => {
  processedCount++;
  // This number is meaningless — different containers have different counts
};

// /tmp IS useful for: caching downloaded files within a container's lifetime
// Just don't rely on it for correctness
```

### Q: What are the critical hard limits and gotchas?

**A:**

**API Gateway:**
- **29-second timeout** (hard limit, cannot be changed)
- **10 MB payload** (request and response)
- **10,000 RPS** account-level default (can be increased)
- **Stage variables** are not available in HTTP API
- **Binary responses** require explicit configuration

**Lambda:**
- **15-minute timeout** (hard limit)
- **6 MB synchronous payload** / 256 KB async
- **250 MB unzipped package** (but 10 GB with container images)
- **1,000 concurrent executions** per region (soft limit)
- **/tmp shared across invocations** on same container (not guaranteed)
- **No GPU support**

**DynamoDB:**
- **400 KB max item size** — large items consume more RCU/WCU
- **Hot partitions:** One partition key receiving disproportionate traffic throttles only that partition, not the whole table. Mitigation: distribute keys evenly, use write sharding.
- **GSI throttling propagates to base table:** If a GSI is throttled, writes to the base table that would update the GSI are also throttled.
- **Eventually consistent reads by default** — strongly consistent reads cost 2x

**SQS:**
- **256 KB message size** — use S3 for larger payloads (extended client library)
- **Standard queue: at-least-once** — your consumer must be idempotent
- **FIFO queue: 300 TPS** (3,000 with batching) per message group

### Q: "What are the limitations of serverless, and when would you NOT use it?"

**A:** This is one of the most common interview questions. A strong answer shows practical experience:

**Limitations:**

1. **Cold starts** — 100ms-2s latency spike. Matters for user-facing APIs, not for async processing. Mitigated by provisioned concurrency (adds cost).

2. **Execution time limits** — Lambda maxes at 15 minutes, API Gateway at 29 seconds. Long-running jobs need ECS/Fargate.

3. **Vendor lock-in** — Deep integration with AWS services. Mitigation: keep business logic in separate modules from infrastructure code, use ports & adapters pattern.

4. **Debugging complexity** — Distributed tracing across Lambda/SQS/EventBridge/Step Functions is harder than debugging a monolith. Requires good observability (X-Ray, structured logging).

5. **Statelessness** — Cannot maintain in-memory state/caches across invocations. Need external state stores (DynamoDB, ElastiCache).

6. **Testing** — Integration testing requires deploying or using tools like LocalStack/SAM local. Unit testing business logic is fine, but testing event source mappings and IAM policies requires cloud deployment.

7. **Cost at scale** — At very high, consistent throughput (millions of RPS 24/7), serverless can be more expensive than reserved EC2/ECS. The crossover point varies but is real.

**When I would NOT use serverless (from real experience):**

- At Banglalink, we kept the core telecom billing engine on ECS because it requires consistent sub-10ms latency, long-running batch processes, and specific binary protocol support. But we used Lambda for all event-driven processing around it (notifications, campaign triggers, analytics ingestion).

- At Right Tracks, the video transcoding pipeline runs on ECS Fargate (not Lambda) because transcoding jobs run 5-30 minutes and need significant memory. However, the API layer and event processing are entirely serverless.

The right answer is never "all serverless" or "no serverless" — it is choosing the right tool for each component.

---

## Quick Reference

### AWS Service Limits Cheat Sheet

| Service | Limit | Default | Max |
|---------|-------|---------|-----|
| Lambda concurrent executions | Per region | 1,000 | Tens of thousands (request) |
| Lambda timeout | Hard | — | 15 minutes |
| Lambda memory | Hard | 128 MB | 10,240 MB |
| Lambda /tmp | Hard | 512 MB | 10,240 MB |
| Lambda payload (sync) | Hard | — | 6 MB |
| Lambda deployment package | Hard | — | 250 MB (50 MB zipped) |
| API Gateway timeout | Hard | — | 29 seconds |
| API Gateway payload | Hard | — | 10 MB |
| API Gateway RPS | Soft | 10,000 | Request increase |
| DynamoDB item size | Hard | — | 400 KB |
| DynamoDB partition throughput | Hard | — | 3,000 RCU, 1,000 WCU |
| SQS message size | Hard | — | 256 KB |
| SQS FIFO throughput | Hard | — | 300 TPS (3,000 batched) |
| S3 object size | Hard | — | 5 TB |
| S3 PUT/LIST/DELETE | Soft | — | 3,500/5,500 per prefix/sec |
| Step Functions state transitions | Standard | — | 25,000 per execution |
| EventBridge events | Soft | — | 10,000 PutEvents/sec |
| Cognito User Pool | Soft | — | 40M users |

### Serverless Cost Comparison Table (Monthly, ap-southeast-1)

| Component | Low (1M req/mo) | Medium (100M req/mo) | High (1B req/mo) |
|-----------|-----------------|---------------------|-------------------|
| Lambda (256MB, 200ms) | $0.24 | $16.53 | $156.33 |
| HTTP API Gateway | $1.00 | $100 | $1,000 |
| DynamoDB (on-demand) | ~$5 | ~$300 | ~$3,000 |
| SQS (standard) | $0.40 | $40 | $400 |
| **Total Compute** | **~$7** | **~$457** | **~$4,556** |

### Serverless Decision Framework

```
Is the workload...
├── Event-driven / bursty? → Lambda
├── Consistent high throughput 24/7? → ECS/EKS
├── Long-running (>15 min)? → ECS Fargate / Step Functions
├── Real-time WebSocket? → AppSync (managed) or ECS (custom)
├── Batch processing? → Lambda + SQS (if <15 min per item) or Fargate
├── GraphQL API? → AppSync (if AWS ecosystem) or Lambda + Apollo
├── REST API?
│   ├── Simple CRUD → HTTP API + Lambda
│   ├── Needs caching/WAF → REST API + Lambda
│   └── High RPS, low latency → ALB + ECS
└── Static site + API? → CloudFront + S3 + Lambda
```

### Common Interview Questions — Short Answers

**Q: How do you handle Lambda cold starts?**
A: Provisioned concurrency for latency-sensitive paths, ARM64 for faster init, minimal dependencies, keep initialization outside handler, avoid VPC unless necessary.

**Q: Lambda vs ECS Fargate?**
A: Lambda for event-driven, short-duration, bursty workloads. Fargate for long-running, consistent, container-based workloads. Lambda scales to zero; Fargate has minimum task cost.

**Q: How do you test serverless locally?**
A: Unit tests with Jest (mock AWS SDK), SAM CLI for local invocation, LocalStack for integration tests, deploy to a dev stage for E2E tests.

**Q: How do you handle failures in serverless?**
A: SQS DLQ for async failures, Step Functions retry/catch for orchestration, Lambda destinations for success/failure routing, CloudWatch Alarms for alerting, idempotent handlers for at-least-once delivery.

**Q: How do you secure a serverless API?**
A: Cognito/JWT for auth, WAF for API Gateway, least-privilege IAM per function, Secrets Manager for credentials, input validation (zod), VPC for private resources, encrypted environment variables.

**Q: Explain the difference between SQS, SNS, and EventBridge.**
A: SQS is a queue (one consumer pulls messages, guaranteed delivery with retry). SNS is pub/sub (push to multiple subscribers). EventBridge is an event bus (content-based routing to 20+ target types with schema registry). Use SQS for work queues, SNS for fan-out, EventBridge for decoupled microservice events.

**Q: How do you handle large payloads with Lambda?**
A: Use S3 as intermediary. For API Gateway (10MB limit), use presigned URLs for client-to-S3 upload, then process via S3 event trigger. For SQS (256KB limit), use SQS Extended Client Library to store payload in S3.

**Q: What is the strangler fig pattern for migrating to serverless?**
A: Route traffic through API Gateway. Initially, all routes proxy to the monolith. Gradually rewrite routes as Lambda functions. API Gateway routes new paths to Lambda, old paths to legacy. Eventually, all traffic goes through serverless.

---

*Last updated: 2026-03-13*
