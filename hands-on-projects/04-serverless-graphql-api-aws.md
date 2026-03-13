# Project 4: Serverless GraphQL API on AWS

> **Stack**: AWS AppSync + Lambda + DynamoDB + Cognito + S3 + EventBridge + CDK
> **Relevance**: Demonstrates full AWS serverless stack. Common in BD companies using AWS. Shows cost optimization.
> **Estimated Build Time**: 8-10 hours

---

## What You'll Learn

- AWS AppSync (managed GraphQL)
- DynamoDB single-table design
- Lambda resolvers (JS runtime)
- Cognito authentication flow
- EventBridge for async event processing
- CDK for Infrastructure as Code
- Cost optimization for BD startups

---

## System Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Client  │───▶│ Cognito  │───▶│  AppSync     │───▶│ DynamoDB │
│  (App)   │    │ (Auth)   │    │  (GraphQL)   │    │ (Data)   │
└──────────┘    └──────────┘    └──────┬───────┘    └──────────┘
                                       │
                              ┌────────┼────────┐
                              │        │        │
                         ┌────▼──┐ ┌───▼───┐ ┌──▼────────┐
                         │Lambda │ │  S3   │ │EventBridge│
                         │(Logic)│ │(Files)│ │ (Events)  │
                         └───────┘ └───────┘ └───────────┘
```

**Data flow summary:**
1. Client authenticates via Cognito, receives JWT tokens.
2. Client sends GraphQL request to AppSync with access_token in header.
3. AppSync validates token, routes to appropriate resolver.
4. Simple reads/writes go directly to DynamoDB (JS/VTL resolvers).
5. Complex logic routes through Lambda resolvers.
6. Side effects (emails, stock updates) fan out via EventBridge.
7. File uploads go directly to S3 via presigned URLs (never through API).

---

## Use Case: E-Commerce Product API

Design a product catalog + order management API:

- **Products**: CRUD, search, categories
- **Orders**: Create, track, cancel
- **Users**: Profile, addresses, order history
- **Reviews**: Create, list by product

---

## DynamoDB Single-Table Design

```
PK                      SK                       Data
──────────────────────────────────────────────────────────────────
USER#123               PROFILE                  { name, email, phone, address }
USER#123               ORDER#2024-001           { total, status, items, createdAt }
USER#123               ORDER#2024-002           { total, status, items, createdAt }
PRODUCT#P001           METADATA                 { name, price, category, stock, imageUrl }
PRODUCT#P001           REVIEW#USER#123          { rating, comment, createdAt }
PRODUCT#P001           REVIEW#USER#456          { rating, comment, createdAt }
ORDER#2024-001         ITEM#PRODUCT#P001        { quantity, unitPrice }
ORDER#2024-001         ITEM#PRODUCT#P002        { quantity, unitPrice }
CATEGORY#electronics   PRODUCT#P001             { name, price } (sparse for listing)
```

### Access Patterns Satisfied

1. **Get user profile** -- PK = USER#123, SK = PROFILE
2. **Get user's orders** -- PK = USER#123, SK begins_with("ORDER#")
3. **Get order items** -- PK = ORDER#2024-001, SK begins_with("ITEM#")
4. **Get product details** -- PK = PRODUCT#P001, SK = METADATA
5. **Get product reviews** -- PK = PRODUCT#P001, SK begins_with("REVIEW#")
6. **Get products by category** -- PK = CATEGORY#electronics, SK begins_with("PRODUCT#")
7. **Get order by ID** -- PK = ORDER#2024-001, SK begins_with("ITEM#")

### GSI Design for Additional Patterns

- **GSI1** (SK as partition key, PK as sort key):
  - Get all reviews by a specific user: GSI1PK = REVIEW#USER#123
  - Get all items in an order: GSI1PK = ITEM#PRODUCT#P001 (find which orders contain a product)

- **GSI2** (status-index):
  - Partition key: `status` (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
  - Sort key: `createdAt`
  - Use case: admin dashboard listing orders by status, sorted by date

---

## AppSync Schema

```graphql
type User {
  id: ID!
  name: String!
  email: AWSEmail!
  phone: AWSPhone
  address: Address
  orders: [Order!]
  createdAt: AWSDateTime!
}

type Address {
  street: String!
  city: String!
  country: String!
  postalCode: String
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  category: String!
  stock: Int!
  imageUrl: AWSURL
  averageRating: Float
  reviews: [Review!]
}

type Review {
  userId: ID!
  productId: ID!
  rating: Int!
  comment: String
  createdAt: AWSDateTime!
}

type Order {
  id: ID!
  userId: ID!
  items: [OrderItem!]!
  total: Float!
  status: OrderStatus!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime
}

type OrderItem {
  productId: ID!
  productName: String!
  quantity: Int!
  unitPrice: Float!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type UploadUrl {
  url: AWSURL!
  key: String!
}

type Query {
  getUser(id: ID!): User
    @auth(rules: [{ allow: owner }, { allow: groups, groups: ["admin"] }])

  getProduct(id: ID!): Product
    @auth(rules: [{ allow: public, provider: apiKey }])

  listProducts(category: String, limit: Int, nextToken: String): ProductConnection!
    @auth(rules: [{ allow: public, provider: apiKey }])

  getOrder(id: ID!): Order
    @auth(rules: [{ allow: owner }])

  listOrders(status: OrderStatus, limit: Int, nextToken: String): OrderConnection!
    @auth(rules: [{ allow: owner }])

  getProductReviews(productId: ID!, limit: Int, nextToken: String): ReviewConnection!
    @auth(rules: [{ allow: public, provider: apiKey }])
}

type Mutation {
  createProduct(input: CreateProductInput!): Product!
    @auth(rules: [{ allow: groups, groups: ["admin"] }])

  updateProduct(input: UpdateProductInput!): Product!
    @auth(rules: [{ allow: groups, groups: ["admin"] }])

  createOrder(input: CreateOrderInput!): Order!
    @auth(rules: [{ allow: owner }])

  cancelOrder(orderId: ID!): Order!
    @auth(rules: [{ allow: owner }])

  createReview(input: CreateReviewInput!): Review!
    @auth(rules: [{ allow: owner }])

  getUploadUrl(filename: String!, contentType: String!): UploadUrl!
    @auth(rules: [{ allow: owner }])
}

type Subscription {
  onOrderStatusChanged(userId: ID!): Order
    @aws_subscribe(mutations: ["updateOrderStatus"])

  onNewReview(productId: ID!): Review
    @aws_subscribe(mutations: ["createReview"])
}

type ProductConnection {
  items: [Product!]!
  nextToken: String
}

type OrderConnection {
  items: [Order!]!
  nextToken: String
}

type ReviewConnection {
  items: [Review!]!
  nextToken: String
}
```

---

## AppSync Resolvers

### Direct DynamoDB Resolvers (JS Runtime)

**getProduct resolver** -- simple single-item fetch:

```
Request:  DynamoDB GetItem → Key: { PK: "PRODUCT#{id}", SK: "METADATA" }
Response: Map DynamoDB attributes to Product type
```

**listByCategory resolver** -- query with begins_with:

```
Request:  DynamoDB Query → PK = "CATEGORY#{category}", SK begins_with "PRODUCT#"
          Limit, ExclusiveStartKey for pagination
Response: Map items to ProductConnection, return nextToken
```

### Lambda Resolvers (Complex Business Logic)

Used when logic requires:
- Multiple DynamoDB operations (transactions)
- External service calls
- Validation beyond simple checks

### Pipeline Resolvers

**CreateOrder -- pipeline resolver (3 steps):**

```
Step 1: JS resolver → Validate order items exist and have stock
        - BatchGetItem for all product IDs in the order
        - Check each product has sufficient stock
        - If any fails, throw error with specific product info

Step 2: JS resolver → Create order in DynamoDB (TransactWriteItems)
        - Transaction contains:
          a) Put ORDER item under USER# PK
          b) Put ITEM entries under ORDER# PK
          c) Update stock on each PRODUCT# (decrement)
          d) ConditionExpression: stock >= requested quantity
        - If condition fails, transaction rolls back entirely

Step 3: Lambda resolver → Publish "OrderCreated" to EventBridge
        - EventBridge PutEvents call
        - Source: "ecommerce.orders"
        - DetailType: "OrderCreated"
        - Detail: { orderId, userId, total, items }
        - Return the created order to the client
```

**UpdateOrderStatus -- pipeline resolver:**

```
Step 1: JS resolver → Verify caller is admin or order owner
Step 2: JS resolver → Update order status in DynamoDB
Step 3: Lambda resolver → Publish "OrderShipped" / "OrderDelivered" to EventBridge
```

---

## Cognito Authentication

### Sign-Up Flow

```
1. User signs up with email + password → Cognito User Pool
2. Cognito sends verification code (OTP) to email or phone
3. User submits OTP → Cognito marks user as confirmed
4. Post-confirmation Lambda trigger → creates USER#<id> PROFILE entry in DynamoDB
```

### Sign-In Flow

```
1. User signs in with email + password
2. Cognito returns three tokens:
   - id_token    → user identity claims (name, email, groups)
   - access_token → authorization, sent to AppSync
   - refresh_token → obtain new tokens without re-login (30 day expiry)
3. Client includes access_token in AppSync request header:
   { "Authorization": "Bearer <access_token>" }
4. AppSync validates token automatically (built-in Cognito integration)
5. Resolver context has identity.sub (user ID), identity.claims, identity.groups
```

### Authorization Model

```
AppSync @auth directives:

@auth(rules: [{ allow: owner }])
  → User can only access their own data
  → Compares identity.sub with item's owner field

@auth(rules: [{ allow: groups, groups: ["admin"] }])
  → Only users in the "admin" Cognito group
  → Used for product management, order status updates

@auth(rules: [{ allow: public, provider: apiKey }])
  → Public read access (product catalog, reviews)
  → Uses API key, no authentication required

Combined example on a field:
@auth(rules: [
  { allow: owner, operations: [read, update] },
  { allow: groups, groups: ["admin"], operations: [read, update, delete] }
])
```

### Cognito User Pool Configuration

```
Password policy: min 8 chars, require uppercase + number + symbol
MFA: optional (SMS or TOTP)
Account recovery: email verification
Custom attributes: address, phone (for BD use cases)
Groups: "admin", "seller", "buyer"
Triggers:
  - Pre sign-up: validate BD phone format (+880...)
  - Post confirmation: create DynamoDB user profile
  - Pre token generation: add custom claims (seller ID, etc.)
```

---

## EventBridge Integration

### Event Catalog

```
Source: "ecommerce.orders"
──────────────────────────────────
"OrderCreated" → triggers:
  - Lambda: Send order confirmation email via SES
  - Lambda: Update product stock counts
  - Lambda: Notify seller (if marketplace model)

"OrderShipped" → triggers:
  - Lambda: Send shipping notification (SES/SNS)
  - Lambda: Update order tracking info

"OrderCancelled" → triggers:
  - Lambda: Restore product stock
  - Lambda: Process refund
  - Lambda: Send cancellation email


Source: "ecommerce.products"
──────────────────────────────────
"ProductReviewed" → triggers:
  - Lambda: Recalculate average rating for product
  - Lambda: Notify product owner / seller

"ProductOutOfStock" → triggers:
  - Lambda: Notify seller to restock
  - Lambda: Update product listing (mark unavailable)
```

### Event Rule Example

```
Rule: HighValueOrderAlert
Pattern:
{
  "source": ["ecommerce.orders"],
  "detail-type": ["OrderCreated"],
  "detail": {
    "total": [{ "numeric": [">", 1000] }]
  }
}
→ Only fires for orders exceeding 1000 BDT
→ Target: Lambda that sends alert to admin via SNS
```

### Event Structure

```
{
  "source": "ecommerce.orders",
  "detail-type": "OrderCreated",
  "detail": {
    "orderId": "2024-001",
    "userId": "USER#123",
    "total": 2500,
    "currency": "BDT",
    "itemCount": 3,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Why EventBridge Over SNS/SQS

- Content-based filtering (no need to filter in Lambda)
- Schema registry for event contracts
- Archive and replay (debug production issues)
- Cross-account event routing (future scaling)
- Built-in retry with DLQ

---

## CDK Infrastructure

### Pseudo CDK Stack Definitions

**Database Stack:**

```
DynamoDB Table: "EcommerceTable"
  - Partition Key: PK (String)
  - Sort Key: SK (String)
  - Billing: PAY_PER_REQUEST (on-demand)
  - Point-in-time recovery: enabled
  - GSI1:
      Partition Key: SK
      Sort Key: PK
      Projection: ALL
  - GSI2 (StatusIndex):
      Partition Key: status
      Sort Key: createdAt
      Projection: INCLUDE [orderId, userId, total]
  - TTL attribute: expiresAt (for temporary data like cart sessions)
```

**Auth Stack:**

```
Cognito User Pool: "EcommerceUserPool"
  - Self sign-up: enabled
  - Email verification: required
  - Password policy: min 8, uppercase, number, symbol
  - Triggers:
      Pre sign-up: ValidatePhoneLambda
      Post confirmation: CreateUserProfileLambda
  - Groups: admin, seller, buyer

Cognito App Client: "EcommerceWebClient"
  - Auth flows: USER_PASSWORD_AUTH, CUSTOM_AUTH
  - Token validity: access 1hr, refresh 30 days
  - No client secret (public client for SPA/mobile)
```

**API Stack:**

```
AppSync API: "EcommerceGraphQLAPI"
  - Schema: schema/schema.graphql
  - Auth mode: AMAZON_COGNITO_USER_POOLS (primary)
  - Additional auth: API_KEY (public product reads)
  - Logging: ALL (field-level logging for debug)
  - X-Ray tracing: enabled

Data Sources:
  - DynamoDB: EcommerceTable
  - Lambda: OrderProcessorFunction
  - Lambda: FileUploadFunction
  - None: local resolvers (computed fields)

Resolvers:
  - Query.getProduct      → DynamoDB direct (JS)
  - Query.listProducts    → DynamoDB direct (JS)
  - Mutation.createOrder  → Pipeline [validate, write, publish]
  - Mutation.getUploadUrl → Lambda
```

**Events Stack:**

```
EventBridge Bus: "EcommerceEventBus"

Lambda Functions:
  - SendOrderConfirmation (runtime: nodejs20.x, memory: 256MB, timeout: 30s)
  - UpdateProductStock (runtime: nodejs20.x, memory: 128MB, timeout: 10s)
  - RecalculateRating (runtime: nodejs20.x, memory: 128MB, timeout: 10s)
  - NotifySeller (runtime: nodejs20.x, memory: 128MB, timeout: 10s)

Rules:
  - OrderCreatedRule → [SendOrderConfirmation, UpdateProductStock, NotifySeller]
  - OrderShippedRule → [SendShippingNotification]
  - ProductReviewedRule → [RecalculateRating]

DLQ: SQS queue for failed event processing
Retry: 2 retries with exponential backoff
```

**Storage Stack:**

```
S3 Bucket: "ecommerce-product-images-{account-id}"
  - CORS: allow PUT from app domain
  - Lifecycle: move to IA after 90 days
  - Block public access: true (use CloudFront for serving)
  - Event notification: on ObjectCreated → ResizeImageLambda

CloudFront Distribution:
  - Origin: S3 bucket (OAC)
  - Cache: 24hr for images
  - Custom domain: images.myecommerce.com
```

**Monitoring:**

```
CloudWatch Alarms:
  - DynamoDB: ThrottledRequests > 0 for 5 minutes
  - Lambda: Errors > 1% of invocations
  - AppSync: 5xx error rate > 0.5%
  - Lambda: Duration p99 > 5 seconds

CloudWatch Dashboard: "EcommerceDashboard"
  - Widgets: AppSync request count, Lambda duration heatmap,
    DynamoDB consumed RCU/WCU, Error rates
```

---

## S3 File Uploads

### Presigned URL Flow

```
1. Client calls: mutation { getUploadUrl(filename: "product.jpg", contentType: "image/jpeg") }

2. Lambda resolver:
   - Generates unique key: "uploads/{userId}/{uuid}-product.jpg"
   - Creates presigned PUT URL (expires in 5 minutes)
   - Returns { url: "https://s3....", key: "uploads/..." }

3. Client uploads file directly to S3 using presigned URL
   - PUT request to the presigned URL
   - Content-Type header must match what was specified
   - File never passes through AppSync or Lambda (efficient)

4. Client sends image URL in createProduct mutation:
   mutation { createProduct(input: { name: "...", imageUrl: "uploads/..." }) }

5. S3 event triggers image processing:
   ObjectCreated → ResizeImageLambda
   - Creates thumbnail (150x150)
   - Creates medium (600x400)
   - Saves to: "processed/{key}/thumb.jpg", "processed/{key}/medium.jpg"
   - Updates DynamoDB product record with processed image URLs
```

### Why Presigned URLs

- No file data through API (saves Lambda execution time + cost)
- S3 handles multipart upload for large files
- Client gets direct S3 upload speed
- Server controls access (URL expires, scoped to specific key)

---

## Cost Estimation (BD Context)

### Monthly Estimate for a Small E-Commerce App

```
Service              Usage                            Cost
──────────────────────────────────────────────────────────────
AppSync              1M queries/month                 $4.00
DynamoDB             1M writes + 5M reads (on-demand) $8.00
Lambda               2M invocations x 200ms avg       $0.60
Cognito              10K MAU                          FREE (first 50K free)
S3                   10GB storage + transfers          $2.00
EventBridge          1M events                        $1.00
CloudWatch           Basic metrics + logs              $3.00
──────────────────────────────────────────────────────────────
Total                                                ~$18.60/month
```

### Comparison with EC2-Based Architecture

```
EC2-based equivalent:
  t3.medium (API server)              $30/month
  RDS db.t3.micro (PostgreSQL)        $25/month
  ElastiCache t3.micro (Redis)        $15/month
  ALB                                 $20/month
  ──────────────────────────────────────────────
  Total                               $90+/month

  + requires patching, scaling config, monitoring setup
  + pays for idle time (nights, weekends)
```

**Serverless advantage for BD startups:**
- Pay only for actual usage (zero cost at zero traffic)
- No ops overhead (no server patching, no scaling config)
- Scales from 0 to thousands of requests automatically
- Break-even point: serverless cheaper until ~10M requests/month

---

## Monitoring Setup

### CloudWatch Dashboards

```
Dashboard: "Ecommerce-Overview"

Row 1: Traffic
  - AppSync: Total requests / minute
  - AppSync: Requests by operation (query vs mutation)

Row 2: Performance
  - Lambda: Duration (p50, p90, p99) per function
  - DynamoDB: SuccessfulRequestLatency

Row 3: Errors
  - AppSync: 4xx and 5xx error count
  - Lambda: Error count and throttle count
  - DynamoDB: ThrottledRequests

Row 4: Cost
  - DynamoDB: ConsumedReadCapacityUnits / ConsumedWriteCapacityUnits
  - Lambda: Invocations and duration (maps to cost)
```

### X-Ray Tracing

```
End-to-end trace for createOrder:
  AppSync (2ms) → Pipeline Resolver
    → Step 1: DynamoDB BatchGetItem (15ms)
    → Step 2: DynamoDB TransactWriteItems (25ms)
    → Step 3: Lambda (80ms)
        → EventBridge PutEvents (10ms)
  Total: ~132ms

Insights:
  - Identify slow resolvers
  - Find DynamoDB hot partitions
  - Detect Lambda cold starts
```

### Alarms

```
Critical:
  - DynamoDB ThrottledRequests > 0 for 5 min → SNS → PagerDuty/Slack
  - Lambda Errors > 1% of invocations → SNS
  - AppSync 5xx > 0.5% → SNS

Warning:
  - Lambda Duration p99 > 3 seconds → SNS (cold start issues?)
  - DynamoDB ConsumedRCU > 80% of provisioned (if using provisioned mode)
  - S3 4xx errors spike (presigned URL issues?)
```

---

## Directory Structure

```
serverless-ecommerce/
├── lib/
│   ├── database-stack.ts         (DynamoDB table + GSIs)
│   ├── auth-stack.ts             (Cognito User Pool + triggers)
│   ├── api-stack.ts              (AppSync API + resolvers + data sources)
│   ├── events-stack.ts           (EventBridge bus + rules + Lambda handlers)
│   └── storage-stack.ts          (S3 buckets + CloudFront)
├── resolvers/
│   ├── getProduct.js             (DynamoDB direct resolver - JS runtime)
│   ├── createOrder.js            (Pipeline resolver step - validate + write)
│   ├── listByCategory.js         (Query with GSI)
│   ├── getUserOrders.js          (Query with begins_with)
│   └── getProductReviews.js      (Query with begins_with)
├── functions/
│   ├── processOrder/
│   │   └── index.ts              (EventBridge handler - order confirmation)
│   ├── sendEmail/
│   │   └── index.ts              (SES notification sender)
│   ├── updateStock/
│   │   └── index.ts              (Decrement/restore stock on events)
│   ├── resizeImage/
│   │   └── index.ts              (S3 trigger - generate thumbnails)
│   └── generateUploadUrl/
│       └── index.ts              (Presigned URL generator)
├── schema/
│   └── schema.graphql            (Full AppSync schema)
├── test/
│   ├── database-stack.test.ts    (CDK snapshot tests)
│   └── resolvers.test.ts         (Resolver unit tests)
├── bin/
│   └── app.ts                    (CDK app entry point)
├── cdk.json
├── tsconfig.json
└── package.json
```

---

## Scaling Considerations

| Component   | Scaling Model        | Limit                            | Bottleneck Risk                    |
|-------------|----------------------|----------------------------------|------------------------------------|
| DynamoDB    | Auto (on-demand)     | Virtually unlimited              | Hot partition from bad PK choice   |
| Lambda      | Auto-scales          | 1000 concurrent (default)        | Cold starts, request quota         |
| AppSync     | Fully managed        | No practical limit               | Resolver timeout (30s max)         |
| Cognito     | Fully managed        | 50K MAU free, then $0.0055/MAU   | Rate limits on auth APIs           |
| EventBridge | Fully managed        | Throughput limit per account      | Target invocation failures         |
| S3          | Fully managed        | 5500 GET/s, 3500 PUT/s per prefix| Prefix design for high throughput  |

### When to Move Off Serverless

- Lambda cold starts unacceptable (real-time trading, gaming)
- Execution > 15 minutes (batch processing -- use Fargate/Step Functions)
- Predictable high traffic 24/7 (provisioned EC2/ECS cheaper)
- Need WebSocket beyond AppSync subscriptions
- Team more comfortable with containers

---

## Interview Talking Points

1. **Why serverless vs containers for this use case?**
   - Low/variable traffic pattern (e-commerce in BD has peak hours)
   - Small team, no dedicated DevOps
   - Pay-per-use aligns with BD startup budget constraints
   - Time to market matters more than micro-optimization

2. **DynamoDB single-table design trade-offs:**
   - Pro: single query for related data, no joins needed, predictable performance
   - Con: harder to model upfront, migrations are painful, learning curve
   - When to use multi-table: truly independent services, different access patterns

3. **AppSync vs self-hosted GraphQL (Apollo on ECS):**
   - AppSync: managed, built-in auth/caching/subscriptions, pay-per-query
   - Apollo: more control, custom directives, larger ecosystem, better for complex schemas
   - Choose AppSync when team is small and AWS-native

4. **Cost comparison for BD startup:**
   - Walk through the cost table above
   - Emphasize zero-cost-at-zero-traffic advantage
   - Break-even analysis: when EC2 becomes cheaper

5. **Cold start mitigation:**
   - Provisioned concurrency for critical paths (createOrder)
   - Keep Lambda small (< 50MB deployment package)
   - Use JS runtime (faster cold start than Java/C#)
   - Warm-up with EventBridge scheduled rule (every 5 min)

6. **Migration path if outgrowing serverless:**
   - Extract Lambda resolvers to ECS/Fargate services
   - Replace AppSync with Apollo Federation on ECS
   - Keep DynamoDB (works with any compute)
   - Keep Cognito (works with any API layer)
   - Gradual migration: move one resolver at a time

---

## What to Practice

- **Whiteboard**: Draw the DynamoDB single-table layout from memory, including GSIs
- **Walk-through**: Trace the createOrder flow from client request to EventBridge fan-out
- **Explain**: Cognito sign-up, sign-in, and token validation in AppSync
- **Calculate**: Monthly cost for given traffic numbers (interviewer may give different numbers)
- **Discuss**: When serverless is wrong -- know the limits and migration strategy
- **Compare**: AppSync vs Apollo, DynamoDB vs Aurora Serverless, EventBridge vs SNS+SQS
