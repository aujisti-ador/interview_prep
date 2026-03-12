# REST API Best Practices - Interview Q&A

## Table of Contents
1. [HTTP Methods & Semantics](#http-methods--semantics)
2. [Status Codes](#status-codes)
3. [API Versioning](#api-versioning)
4. [Pagination](#pagination)
5. [Rate Limiting & Throttling](#rate-limiting--throttling)
6. [Idempotency](#idempotency)
7. [Security: JWT & OAuth2](#security-jwt--oauth2)
8. [OWASP Top 10](#owasp-top-10)
9. [API Design Patterns](#api-design-patterns)
10. [Error Handling](#error-handling)

---

## HTTP Methods & Semantics

### Q1: Explain HTTP methods and their correct usage in REST APIs.

**Answer:**

| Method | CRUD | Idempotent | Safe | Cacheable | Request Body |
|--------|------|------------|------|-----------|--------------|
| GET | Read | Yes | Yes | Yes | No |
| POST | Create | No | No | No* | Yes |
| PUT | Update/Replace | Yes | No | No | Yes |
| PATCH | Partial Update | No* | No | No | Yes |
| DELETE | Delete | Yes | No | No | Optional |
| HEAD | Read (headers) | Yes | Yes | Yes | No |
| OPTIONS | Preflight | Yes | Yes | No | No |

```typescript
// NestJS Example - Complete REST Controller
@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET /users - List all users
  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedResponse<User>> {
    return this.userService.findAll({ page, limit });
  }

  // GET /users/:id - Get single user
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  // POST /users - Create new user
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  // PUT /users/:id - Full update (replace)
  @Put(':id')
  @ApiOperation({ summary: 'Replace user' })
  async replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    // PUT should replace entire resource
    // All required fields must be provided
    return this.userService.replace(id, updateUserDto);
  }

  // PATCH /users/:id - Partial update
  @Patch(':id')
  @ApiOperation({ summary: 'Update user partially' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patchUserDto: PatchUserDto,
  ): Promise<User> {
    // PATCH updates only provided fields
    return this.userService.update(id, patchUserDto);
  }

  // DELETE /users/:id - Delete user
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.userService.remove(id);
  }

  // HEAD /users/:id - Check if user exists
  @Head(':id')
  async checkExists(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const exists = await this.userService.exists(id);
    if (!exists) {
      res.status(HttpStatus.NOT_FOUND).end();
    } else {
      res.status(HttpStatus.OK).end();
    }
  }
}
```

### Q2: What is the difference between PUT and PATCH?

**Answer:**

```typescript
// Original resource
const user = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  address: {
    city: 'Dhaka',
    country: 'Bangladesh'
  }
};

// PUT - Complete replacement (idempotent)
// Client MUST send complete resource
// PUT /users/123
const putRequest = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  age: 31,
  address: {
    city: 'Chittagong',
    country: 'Bangladesh'
  }
};
// Result: Entire resource is replaced
// Missing fields would be set to null/default

// PATCH - Partial update
// Client sends only fields to update
// PATCH /users/123
const patchRequest = {
  name: 'John Smith'
};
// Result: Only name is updated, other fields unchanged

// JSON Patch (RFC 6902) - More explicit
// PATCH /users/123
// Content-Type: application/json-patch+json
const jsonPatch = [
  { op: 'replace', path: '/name', value: 'John Smith' },
  { op: 'add', path: '/phone', value: '+880123456789' },
  { op: 'remove', path: '/age' },
  { op: 'move', from: '/address/city', path: '/city' },
];

// Implementation
@Patch(':id')
async update(
  @Param('id') id: string,
  @Body() operations: JsonPatchOperation[],
  @Headers('content-type') contentType: string,
): Promise<User> {
  if (contentType === 'application/json-patch+json') {
    return this.userService.applyJsonPatch(id, operations);
  }
  return this.userService.partialUpdate(id, operations);
}

// JSON Patch service
applyJsonPatch(id: string, operations: JsonPatchOperation[]): User {
  const user = this.findOne(id);
  const patched = jsonpatch.applyPatch(user, operations).newDocument;
  return this.save(patched);
}
```

---

## Status Codes

### Q3: Explain HTTP status codes and when to use each.

**Answer:**

```typescript
// 2xx Success
200 OK              // GET, PUT, PATCH - Success with response body
201 Created         // POST - Resource created
202 Accepted        // Async operation accepted (processing)
204 No Content      // DELETE, PUT, PATCH - Success without response body

// 3xx Redirection
301 Moved Permanently    // Resource URL changed permanently
302 Found               // Temporary redirect
304 Not Modified        // Cache validation (ETag/If-None-Match)
307 Temporary Redirect  // Temporary redirect (same method)
308 Permanent Redirect  // Permanent redirect (same method)

// 4xx Client Errors
400 Bad Request         // Invalid request syntax/body
401 Unauthorized        // Missing or invalid authentication
403 Forbidden           // Authenticated but not authorized
404 Not Found           // Resource doesn't exist
405 Method Not Allowed  // HTTP method not supported
409 Conflict            // Resource conflict (e.g., duplicate)
410 Gone                // Resource permanently deleted
415 Unsupported Media Type  // Content-Type not supported
422 Unprocessable Entity    // Validation errors
429 Too Many Requests       // Rate limit exceeded

// 5xx Server Errors
500 Internal Server Error   // Unexpected server error
501 Not Implemented         // Feature not implemented
502 Bad Gateway             // Invalid response from upstream
503 Service Unavailable     // Server temporarily unavailable
504 Gateway Timeout         // Upstream timeout

// NestJS Implementation
@Controller('orders')
export class OrderController {
  @Post()
  @HttpCode(HttpStatus.CREATED) // 201
  async createOrder(@Body() dto: CreateOrderDto): Promise<Order> {
    return this.orderService.create(dto);
  }

  @Post('async')
  @HttpCode(HttpStatus.ACCEPTED) // 202
  async createOrderAsync(@Body() dto: CreateOrderDto): Promise<{ jobId: string }> {
    const jobId = await this.orderService.queueOrder(dto);
    return { jobId };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204
  async deleteOrder(@Param('id') id: string): Promise<void> {
    await this.orderService.delete(id);
  }

  @Post(':id/cancel')
  async cancelOrder(@Param('id') id: string): Promise<Order> {
    const order = await this.orderService.findOne(id);

    if (!order) {
      throw new NotFoundException('Order not found'); // 404
    }

    if (order.status === 'shipped') {
      throw new ConflictException('Cannot cancel shipped order'); // 409
    }

    if (order.status === 'cancelled') {
      throw new GoneException('Order already cancelled'); // 410
    }

    return this.orderService.cancel(id);
  }
}

// Custom exception for 422
@Catch()
export class ValidationException extends HttpException {
  constructor(errors: ValidationError[]) {
    super(
      {
        statusCode: 422,
        message: 'Validation failed',
        errors: errors.map(e => ({
          field: e.property,
          constraints: Object.values(e.constraints),
        })),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

// 429 Rate Limit Response
@Catch(ThrottlerException)
export class ThrottleExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response
      .status(429)
      .header('Retry-After', '60')
      .header('X-RateLimit-Limit', '100')
      .header('X-RateLimit-Remaining', '0')
      .header('X-RateLimit-Reset', Date.now() + 60000)
      .json({
        statusCode: 429,
        message: 'Too many requests',
        retryAfter: 60,
      });
  }
}
```

---

## API Versioning

### Q4: What are the different API versioning strategies?

**Answer:**

```typescript
// 1. URI Path Versioning (Most common)
// /api/v1/users
// /api/v2/users
@Controller('api/v1/users')
export class UserControllerV1 {
  @Get()
  findAll(): User[] {
    return this.userService.findAllV1();
  }
}

@Controller('api/v2/users')
export class UserControllerV2 {
  @Get()
  findAll(): UserV2[] {
    return this.userService.findAllV2();
  }
}

// NestJS Built-in Versioning
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'api/v',
});

// Controller
@Controller('users')
@Version('1')
export class UserControllerV1 {}

@Controller('users')
@Version('2')
export class UserControllerV2 {}

// 2. Header Versioning
// X-API-Version: 1
// X-API-Version: 2
app.enableVersioning({
  type: VersioningType.HEADER,
  header: 'X-API-Version',
});

@Controller('users')
@Version('1')
export class UserControllerV1 {}

// 3. Media Type Versioning (Accept header)
// Accept: application/vnd.myapi.v1+json
// Accept: application/vnd.myapi.v2+json
app.enableVersioning({
  type: VersioningType.MEDIA_TYPE,
  key: 'v=',
});

// Accept: application/json;v=1
@Controller('users')
@Version('1')
export class UserControllerV1 {}

// 4. Query Parameter Versioning
// /api/users?version=1
// /api/users?version=2
app.enableVersioning({
  type: VersioningType.CUSTOM,
  extractor: (request: Request) => {
    return request.query.version as string || '1';
  },
});

// 5. Hybrid/Multiple Versions per endpoint
@Controller('users')
export class UserController {
  @Get()
  @Version(['1', '2']) // Supports both versions
  findAll(@Version() version: string): User[] {
    if (version === '2') {
      return this.userService.findAllV2();
    }
    return this.userService.findAllV1();
  }
}

// 6. Version Deprecation
@Controller('users')
@Version('1')
@ApiTags('Users (v1 - Deprecated)')
@ApiDeprecatedHeader()
export class UserControllerV1 {
  @Get()
  @Deprecated()
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Sat, 31 Dec 2024 23:59:59 GMT')
  findAll(): User[] {
    return this.userService.findAllV1();
  }
}

// Best Practices for Versioning
// 1. Start with versioning from day one
// 2. Use semantic versioning for breaking changes only
// 3. Support at least 2 versions simultaneously
// 4. Provide clear deprecation timeline
// 5. Document migration guides
```

---

## Pagination

### Q5: Explain different pagination strategies.

**Answer:**

```typescript
// 1. OFFSET-BASED PAGINATION (Simple but has issues)
// GET /users?page=2&limit=10
// Offset = (page - 1) * limit

@Get()
async findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
): Promise<PaginatedResponse<User>> {
  const offset = (page - 1) * limit;

  const [items, total] = await this.userRepository.findAndCount({
    skip: offset,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
    links: {
      first: `/users?page=1&limit=${limit}`,
      prev: page > 1 ? `/users?page=${page - 1}&limit=${limit}` : null,
      next: page * limit < total ? `/users?page=${page + 1}&limit=${limit}` : null,
      last: `/users?page=${Math.ceil(total / limit)}&limit=${limit}`,
    },
  };
}

// Problems with offset pagination:
// - Inconsistent results if data changes between requests
// - Poor performance on large offsets (OFFSET 1000000)
// - Duplicate or missing items when data is inserted/deleted

// 2. CURSOR-BASED PAGINATION (Recommended for large datasets)
// GET /users?cursor=eyJpZCI6MTIzfQ&limit=10

interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

@Get()
async findAll(
  @Query('cursor') cursor?: string,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  @Query('direction', new DefaultValuePipe('forward')) direction: 'forward' | 'backward',
): Promise<CursorPaginatedResponse<User>> {
  const decodedCursor = cursor
    ? JSON.parse(Buffer.from(cursor, 'base64').toString())
    : null;

  const queryBuilder = this.userRepository
    .createQueryBuilder('user')
    .orderBy('user.createdAt', 'DESC')
    .addOrderBy('user.id', 'DESC');

  if (decodedCursor) {
    if (direction === 'forward') {
      queryBuilder.where(
        '(user.createdAt, user.id) < (:createdAt, :id)',
        decodedCursor,
      );
    } else {
      queryBuilder.where(
        '(user.createdAt, user.id) > (:createdAt, :id)',
        decodedCursor,
      );
    }
  }

  const items = await queryBuilder.take(limit + 1).getMany();

  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop();
  }

  const encodeCursor = (item: User): string => {
    return Buffer.from(
      JSON.stringify({ createdAt: item.createdAt, id: item.id }),
    ).toString('base64');
  };

  return {
    data: items,
    meta: {
      hasNextPage: direction === 'forward' ? hasMore : !!cursor,
      hasPrevPage: direction === 'backward' ? hasMore : !!cursor,
      startCursor: items.length > 0 ? encodeCursor(items[0]) : null,
      endCursor: items.length > 0 ? encodeCursor(items[items.length - 1]) : null,
    },
  };
}

// 3. KEYSET PAGINATION (Similar to cursor, more explicit)
// GET /users?after_id=123&after_created_at=2024-01-01&limit=10

@Get()
async findAll(
  @Query('after_id') afterId?: string,
  @Query('after_created_at') afterCreatedAt?: string,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
): Promise<KeysetPaginatedResponse<User>> {
  const queryBuilder = this.userRepository
    .createQueryBuilder('user')
    .orderBy('user.createdAt', 'DESC')
    .addOrderBy('user.id', 'DESC');

  if (afterId && afterCreatedAt) {
    queryBuilder.where(
      '(user.createdAt < :afterCreatedAt) OR (user.createdAt = :afterCreatedAt AND user.id < :afterId)',
      { afterId, afterCreatedAt },
    );
  }

  const items = await queryBuilder.take(limit + 1).getMany();
  const hasNextPage = items.length > limit;

  if (hasNextPage) {
    items.pop();
  }

  const lastItem = items[items.length - 1];

  return {
    data: items,
    hasNextPage,
    nextParams: hasNextPage
      ? { after_id: lastItem.id, after_created_at: lastItem.createdAt }
      : null,
  };
}

// 4. SEEK PAGINATION (Time-based, good for feeds)
// GET /posts?since=2024-01-01T00:00:00Z&until=2024-01-02T00:00:00Z&limit=50

@Get('feed')
async getFeed(
  @Query('since') since?: string,
  @Query('until') until?: string,
  @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
): Promise<SeekPaginatedResponse<Post>> {
  const queryBuilder = this.postRepository
    .createQueryBuilder('post')
    .orderBy('post.publishedAt', 'DESC');

  if (since) {
    queryBuilder.andWhere('post.publishedAt > :since', {
      since: new Date(since),
    });
  }

  if (until) {
    queryBuilder.andWhere('post.publishedAt < :until', {
      until: new Date(until),
    });
  }

  const items = await queryBuilder.take(limit).getMany();

  return {
    data: items,
    boundaries: {
      oldest: items.length > 0 ? items[items.length - 1].publishedAt : null,
      newest: items.length > 0 ? items[0].publishedAt : null,
    },
  };
}

// Pagination Comparison
// | Strategy | Pros | Cons | Best For |
// |----------|------|------|----------|
// | Offset | Simple, jump to page | Inconsistent, slow on large offset | Admin panels |
// | Cursor | Consistent, fast | No page jumping | Infinite scroll |
// | Keyset | Fast, stable | Complex queries | Large datasets |
// | Seek | Time-based filtering | Limited to time-ordered data | Feeds, timelines |
```

---

## Rate Limiting & Throttling

### Q6: How do you implement rate limiting in a REST API?

**Answer:**

```typescript
// 1. NestJS Throttler Module
// npm install @nestjs/throttler

// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000,   // 1 second
          limit: 3,    // 3 requests per second
        },
        {
          name: 'medium',
          ttl: 10000,  // 10 seconds
          limit: 20,   // 20 requests per 10 seconds
        },
        {
          name: 'long',
          ttl: 60000,  // 1 minute
          limit: 100,  // 100 requests per minute
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

// 2. Custom throttler per route
@Controller('api')
export class ApiController {
  // Use default limits
  @Get('data')
  getData() {}

  // Custom limits for expensive endpoint
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('expensive')
  getExpensiveData() {}

  // Skip throttling for health check
  @SkipThrottle()
  @Get('health')
  healthCheck() {}
}

// 3. Custom Throttler Guard (per user)
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        statusCode: 429,
        message: 'Rate limit exceeded',
        retryAfter: 60,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    // Add rate limit headers
    response.header('X-RateLimit-Limit', this.limit);
    response.header('X-RateLimit-Remaining', this.remaining);
    response.header('X-RateLimit-Reset', this.resetTime);

    return { request, response };
  }
}

// 4. Redis-based Rate Limiter (distributed)
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const multi = this.redis.multi();

    multi.incr(key);
    multi.pttl(key);

    const results = await multi.exec();
    const totalHits = results[0][1] as number;
    let timeToExpire = results[1][1] as number;

    if (timeToExpire < 0) {
      await this.redis.pexpire(key, ttl);
      timeToExpire = ttl;
    }

    return {
      totalHits,
      timeToExpire,
    };
  }
}

// 5. Sliding Window Rate Limiter
@Injectable()
export class SlidingWindowRateLimiter {
  constructor(private readonly redis: Redis) {}

  async isAllowed(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = this.redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request
    pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);

    // Count requests in window
    pipeline.zcard(key);

    // Set expiry
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const requestCount = results[2][1] as number;

    return {
      allowed: requestCount <= limit,
      remaining: Math.max(0, limit - requestCount),
      resetAt: now + windowMs,
    };
  }
}

// 6. Token Bucket Algorithm
@Injectable()
export class TokenBucketRateLimiter {
  constructor(private readonly redis: Redis) {}

  async consume(
    key: string,
    bucketSize: number,
    refillRate: number, // tokens per second
    tokens: number = 1,
  ): Promise<{ allowed: boolean; remainingTokens: number }> {
    const now = Date.now();
    const bucketKey = `bucket:${key}`;

    const script = `
      local bucket_size = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local tokens_requested = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'last_refill')
      local current_tokens = tonumber(bucket[1]) or bucket_size
      local last_refill = tonumber(bucket[2]) or now

      -- Refill tokens
      local elapsed = (now - last_refill) / 1000
      local refill = elapsed * refill_rate
      current_tokens = math.min(bucket_size, current_tokens + refill)

      -- Try to consume
      local allowed = current_tokens >= tokens_requested
      if allowed then
        current_tokens = current_tokens - tokens_requested
      end

      -- Save state
      redis.call('HMSET', KEYS[1], 'tokens', current_tokens, 'last_refill', now)
      redis.call('PEXPIRE', KEYS[1], 3600000)

      return {allowed and 1 or 0, current_tokens}
    `;

    const [allowed, remaining] = await this.redis.eval(
      script,
      1,
      bucketKey,
      bucketSize,
      refillRate,
      tokens,
      now,
    ) as [number, number];

    return {
      allowed: allowed === 1,
      remainingTokens: remaining,
    };
  }
}

// 7. Rate Limit Middleware with Headers
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimiter: SlidingWindowRateLimiter) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = req.user?.id || req.ip;
    const result = await this.rateLimiter.isAllowed(key, 100, 60000);

    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetAt.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        statusCode: 429,
        message: 'Too Many Requests',
        retryAfter: 60,
      });
      return;
    }

    next();
  }
}
```

---

## Idempotency

### Q7: What is idempotency and how do you implement it?

**Answer:**

Idempotency ensures that making the same request multiple times produces the same result. This is crucial for handling retries and network failures.

```typescript
// 1. Idempotency Key Header
// Client sends: Idempotency-Key: unique-key-123

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only apply to non-idempotent methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      // For critical operations, require idempotency key
      if (request.path.includes('/payments')) {
        throw new BadRequestException('Idempotency-Key header required');
      }
      return next.handle();
    }

    const cacheKey = `idempotency:${request.user?.id || 'anon'}:${idempotencyKey}`;
    const ttl = this.configService.get('IDEMPOTENCY_TTL', 86400); // 24 hours

    // Check for existing response
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const { statusCode, body, headers } = JSON.parse(cached);

      // Set cached headers
      for (const [key, value] of Object.entries(headers)) {
        response.setHeader(key, value);
      }
      response.setHeader('X-Idempotent-Replayed', 'true');

      return of(body);
    }

    // Check if request is in progress
    const lockKey = `${cacheKey}:lock`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 60, 'NX');

    if (!acquired) {
      throw new ConflictException('Request in progress');
    }

    try {
      return next.handle().pipe(
        tap(async (data) => {
          // Cache the response
          const cacheValue = JSON.stringify({
            statusCode: response.statusCode,
            body: data,
            headers: {
              'content-type': response.getHeader('content-type'),
            },
          });

          await this.redis.setex(cacheKey, ttl, cacheValue);
        }),
        finalize(async () => {
          await this.redis.del(lockKey);
        }),
      );
    } catch (error) {
      await this.redis.del(lockKey);
      throw error;
    }
  }
}

// 2. Database-level Idempotency
@Entity()
export class IdempotencyRecord {
  @PrimaryColumn()
  key: string;

  @Column()
  userId: string;

  @Column('json')
  requestHash: string;

  @Column('json')
  response: any;

  @Column()
  statusCode: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiresAt: Date;
}

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly repo: Repository<IdempotencyRecord>,
  ) {}

  async getOrCreate(
    key: string,
    userId: string,
    requestHash: string,
    execute: () => Promise<{ statusCode: number; body: any }>,
  ): Promise<{ statusCode: number; body: any; replayed: boolean }> {
    // Check existing
    const existing = await this.repo.findOne({
      where: { key, userId },
    });

    if (existing) {
      // Verify request matches
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key used with different request',
        );
      }

      return {
        statusCode: existing.statusCode,
        body: existing.response,
        replayed: true,
      };
    }

    // Execute and store
    const result = await execute();

    await this.repo.save({
      key,
      userId,
      requestHash,
      response: result.body,
      statusCode: result.statusCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return { ...result, replayed: false };
  }
}

// 3. Usage in Controller
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post()
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser() user: User,
  ): Promise<Payment> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key required for payments');
    }

    const requestHash = createHash('sha256')
      .update(JSON.stringify(dto))
      .digest('hex');

    const result = await this.idempotencyService.getOrCreate(
      idempotencyKey,
      user.id,
      requestHash,
      async () => {
        const payment = await this.paymentService.create(dto, user);
        return { statusCode: 201, body: payment };
      },
    );

    return result.body;
  }
}

// 4. Client Implementation
async function createPaymentWithRetry(paymentData: any, maxRetries = 3) {
  const idempotencyKey = crypto.randomUUID();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey, // Same key for retries
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 409) {
        // Request in progress, wait and retry
        await sleep(1000 * (attempt + 1));
        continue;
      }

      throw new Error(`Payment failed: ${response.statusText}`);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(1000 * (attempt + 1));
    }
  }
}
```

---

## Security: JWT & OAuth2

### Q8: Explain JWT and OAuth2 implementation.

**Answer:**

```typescript
// ========== JWT Implementation ==========

// 1. JWT Structure
// Header.Payload.Signature
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
// eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.
// SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

// 2. JWT Payload Claims
interface JwtPayload {
  // Registered claims
  iss: string;  // Issuer
  sub: string;  // Subject (user ID)
  aud: string;  // Audience
  exp: number;  // Expiration time
  nbf: number;  // Not before
  iat: number;  // Issued at
  jti: string;  // JWT ID (unique identifier)

  // Custom claims
  email: string;
  roles: string[];
  permissions: string[];
}

// 3. JWT Service
@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: Redis,
  ) {}

  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
        issuer: 'my-api',
        audience: 'my-app',
      }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh' },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    // Store refresh token for revocation
    await this.redis.setex(
      `refresh:${user.id}`,
      7 * 24 * 60 * 60,
      refreshToken,
    );

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        issuer: 'my-api',
        audience: 'my-app',
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    // Verify refresh token is valid
    const stored = await this.redis.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userService.findById(payload.sub);
    return this.generateTokens(user);
  }

  async revokeToken(token: string): Promise<void> {
    const payload = await this.jwtService.decode(token) as JwtPayload;

    // Blacklist the token until it expires
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${payload.jti}`, ttl, '1');
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
    // For access tokens, increment a version number
    await this.redis.incr(`token_version:${userId}`);
  }
}

// 4. JWT Strategy (Passport)
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
      issuer: 'my-api',
      audience: 'my-app',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Additional validation
    const user = await this.userService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}

// ========== OAuth2 Implementation ==========

// 5. OAuth2 Flows
// Authorization Code Flow (recommended for server-side apps)
// PKCE Flow (recommended for SPAs/mobile)
// Client Credentials Flow (machine-to-machine)

// 6. Google OAuth2 Strategy
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
  ): Promise<User> {
    const { emails, displayName, photos } = profile;

    // Find or create user
    let user = await this.userService.findByEmail(emails[0].value);

    if (!user) {
      user = await this.userService.create({
        email: emails[0].value,
        name: displayName,
        avatar: photos?.[0]?.value,
        provider: 'google',
        providerId: profile.id,
      });
    }

    return user;
  }
}

// 7. OAuth2 Controller
@Controller('auth')
export class AuthController {
  // Google OAuth2
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    const tokens = await this.jwtAuthService.generateTokens(req.user);

    // Redirect with tokens (for web apps)
    res.redirect(
      `${this.configService.get('FRONTEND_URL')}/auth/callback?` +
      `access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
    );
  }

  // Authorization Code Flow (for third-party apps)
  @Get('authorize')
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string, // PKCE
    @Query('code_challenge_method') codeChallengeMethod: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    // Validate client
    const client = await this.oauthService.validateClient(clientId, redirectUri);

    // Generate authorization code
    const code = await this.oauthService.generateAuthCode({
      userId: user.id,
      clientId,
      scope: scope.split(' '),
      codeChallenge,
      codeChallengeMethod,
    });

    // Redirect back with code
    res.redirect(`${redirectUri}?code=${code}&state=${state}`);
  }

  @Post('token')
  async token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
    @Body('code_verifier') codeVerifier: string, // PKCE
    @Body('refresh_token') refreshToken: string,
  ) {
    switch (grantType) {
      case 'authorization_code':
        return this.oauthService.exchangeCode(
          code,
          clientId,
          clientSecret,
          redirectUri,
          codeVerifier,
        );

      case 'refresh_token':
        return this.oauthService.refreshToken(refreshToken, clientId, clientSecret);

      case 'client_credentials':
        return this.oauthService.clientCredentials(clientId, clientSecret);

      default:
        throw new BadRequestException('Unsupported grant type');
    }
  }
}
```

---

## OWASP Top 10

### Q9: Explain OWASP Top 10 vulnerabilities and how to prevent them in REST APIs.

**Answer:**

```typescript
// 1. INJECTION (SQL, NoSQL, Command)
// Prevention: Parameterized queries, input validation

// BAD - SQL Injection vulnerable
const query = `SELECT * FROM users WHERE email = '${email}'`;

// GOOD - Parameterized query
const user = await this.userRepository.findOne({
  where: { email }, // TypeORM handles parameterization
});

// GOOD - Query builder with parameters
const users = await this.userRepository
  .createQueryBuilder('user')
  .where('user.email = :email', { email })
  .getMany();

// Command injection prevention
import { execFile } from 'child_process';
// BAD
exec(`convert ${userInput} output.png`);
// GOOD - use execFile with array args
execFile('convert', [userInput, 'output.png']);

// 2. BROKEN AUTHENTICATION
// Prevention: Strong password policies, MFA, secure session management

@Injectable()
export class AuthService {
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    // Use bcrypt with sufficient rounds
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Minimum 10
    return bcrypt.hash(password, saltRounds);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.userService.findByEmail(email);

    // Prevent timing attacks - compare even if user not found
    const isValid = user
      ? await this.validatePassword(password, user.password)
      : await this.validatePassword(password, '$2b$12$invalid');

    if (!isValid || !user) {
      // Rate limit failed attempts
      await this.rateLimiter.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check for account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    return this.generateTokens(user);
  }
}

// 3. SENSITIVE DATA EXPOSURE
// Prevention: Encryption, secure transmission, data masking

@Entity()
export class User {
  @Column()
  email: string;

  @Column()
  @Exclude() // Never serialize
  password: string;

  @Column({ transformer: new EncryptionTransformer() })
  ssn: string; // Encrypted at rest

  @Column()
  @Transform(({ value }) => maskPhoneNumber(value))
  phone: string; // Masked in responses
}

// HTTPS enforcement
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true,
}));

// 4. XML EXTERNAL ENTITIES (XXE)
// Prevention: Disable DTD processing, use JSON

import { Parser } from 'xml2js';
const parser = new Parser({
  explicitRoot: false,
  // Disable external entities
  xmlns: false,
  explicitArray: false,
});

// 5. BROKEN ACCESS CONTROL
// Prevention: Role-based access, resource ownership validation

@Injectable()
export class OrdersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orderId = request.params.id;

    // Admin can access all
    if (user.roles.includes('admin')) {
      return true;
    }

    // Users can only access their own orders
    const order = await this.orderService.findOne(orderId);
    return order.userId === user.id;
  }
}

// IDOR Prevention
@Get(':id')
async getOrder(
  @Param('id') id: string,
  @CurrentUser() user: User,
): Promise<Order> {
  const order = await this.orderService.findOne(id);

  if (!order) {
    throw new NotFoundException();
  }

  // Check ownership
  if (order.userId !== user.id && !user.roles.includes('admin')) {
    throw new ForbiddenException();
  }

  return order;
}

// 6. SECURITY MISCONFIGURATION
// Prevention: Secure defaults, remove debug endpoints

// Disable in production
if (process.env.NODE_ENV === 'production') {
  app.disable('x-powered-by');
  // Disable GraphQL playground
  // Disable Swagger in production
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// 7. CROSS-SITE SCRIPTING (XSS)
// Prevention: Output encoding, CSP, input validation

import { escape } from 'lodash';
import * as sanitizeHtml from 'sanitize-html';

// Sanitize user input
@Transform(({ value }) => sanitizeHtml(value, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {},
}))
content: string;

// Escape output
const safeOutput = escape(userInput);

// 8. INSECURE DESERIALIZATION
// Prevention: Validate and sanitize serialized data

// BAD - Never deserialize untrusted data
const obj = eval('(' + userInput + ')');
const obj = JSON.parse(userInput); // Then using with prototype

// GOOD - Use schema validation
const schema = z.object({
  name: z.string().max(100),
  age: z.number().int().positive(),
});

const validated = schema.parse(JSON.parse(userInput));

// 9. USING COMPONENTS WITH KNOWN VULNERABILITIES
// Prevention: Regular updates, security scanning

// package.json scripts
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "snyk": "snyk test"
  }
}

// CI/CD security checks
// - npm audit in pipeline
// - Snyk/Dependabot integration
// - Container image scanning

// 10. INSUFFICIENT LOGGING & MONITORING
// Prevention: Comprehensive logging, alerting

@Injectable()
export class SecurityLogger {
  private readonly logger = new Logger('Security');

  logAuthFailure(email: string, ip: string, reason: string) {
    this.logger.warn({
      event: 'AUTH_FAILURE',
      email,
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Alert on multiple failures
    this.checkForBruteForce(email, ip);
  }

  logAccessDenied(userId: string, resource: string, action: string) {
    this.logger.warn({
      event: 'ACCESS_DENIED',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  logSuspiciousActivity(details: any) {
    this.logger.error({
      event: 'SUSPICIOUS_ACTIVITY',
      ...details,
      timestamp: new Date().toISOString(),
    });

    // Send alert
    this.alertService.sendSecurityAlert(details);
  }
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });
  });

  next();
});
```

---

## API Design Patterns

### Q10: What are common API design patterns?

**Answer:**

```typescript
// 1. RESOURCE-BASED DESIGN
// Nouns, not verbs
// /users NOT /getUsers
// /orders/123/items NOT /getOrderItems?orderId=123

// 2. HATEOAS (Hypermedia As The Engine Of Application State)
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "_links": {
    "self": { "href": "/users/123" },
    "orders": { "href": "/users/123/orders" },
    "profile": { "href": "/users/123/profile" },
    "update": { "href": "/users/123", "method": "PATCH" },
    "delete": { "href": "/users/123", "method": "DELETE" }
  },
  "_actions": {
    "deactivate": {
      "href": "/users/123/deactivate",
      "method": "POST",
      "title": "Deactivate User"
    }
  }
}

// Implementation
@Injectable()
export class HateoasInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.addLinks(data, context)),
    );
  }

  private addLinks(data: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const baseUrl = `${request.protocol}://${request.get('host')}`;

    if (Array.isArray(data)) {
      return {
        data: data.map(item => this.addItemLinks(item, baseUrl)),
        _links: {
          self: { href: request.url },
        },
      };
    }

    return this.addItemLinks(data, baseUrl);
  }

  private addItemLinks(item: any, baseUrl: string) {
    if (!item?.id) return item;

    const resourcePath = this.getResourcePath(item);

    return {
      ...item,
      _links: {
        self: { href: `${baseUrl}${resourcePath}/${item.id}` },
        // Add more links based on resource type
      },
    };
  }
}

// 3. BULK OPERATIONS
@Controller('users')
export class UserController {
  // Bulk create
  @Post('bulk')
  @HttpCode(HttpStatus.MULTI_STATUS) // 207
  async bulkCreate(
    @Body() users: CreateUserDto[],
  ): Promise<BulkOperationResult[]> {
    const results = await Promise.allSettled(
      users.map(dto => this.userService.create(dto)),
    );

    return results.map((result, index) => ({
      index,
      status: result.status === 'fulfilled' ? 201 : 400,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }

  // Bulk update
  @Patch('bulk')
  @HttpCode(HttpStatus.MULTI_STATUS)
  async bulkUpdate(
    @Body() updates: Array<{ id: string; data: PatchUserDto }>,
  ): Promise<BulkOperationResult[]> {
    const results = await Promise.allSettled(
      updates.map(({ id, data }) => this.userService.update(id, data)),
    );

    return results.map((result, index) => ({
      id: updates[index].id,
      status: result.status === 'fulfilled' ? 200 : 400,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }

  // Bulk delete
  @Delete('bulk')
  async bulkDelete(@Body('ids') ids: string[]): Promise<{ deleted: number }> {
    const result = await this.userService.deleteMany(ids);
    return { deleted: result.affected };
  }
}

// 4. LONG-RUNNING OPERATIONS (Async)
@Controller('reports')
export class ReportController {
  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // 202
  async generateReport(
    @Body() dto: GenerateReportDto,
  ): Promise<{ jobId: string; statusUrl: string }> {
    const jobId = await this.reportService.queueGeneration(dto);

    return {
      jobId,
      statusUrl: `/reports/jobs/${jobId}`,
    };
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.reportService.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === 'completed') {
      return {
        status: 'completed',
        result: job.result,
        downloadUrl: `/reports/${job.reportId}/download`,
      };
    }

    if (job.status === 'failed') {
      return {
        status: 'failed',
        error: job.error,
      };
    }

    return {
      status: 'processing',
      progress: job.progress,
      estimatedCompletion: job.estimatedCompletion,
    };
  }
}

// 5. FIELD SELECTION (Sparse Fieldsets)
// GET /users?fields=id,name,email
@Get()
async findAll(
  @Query('fields') fields?: string,
): Promise<Partial<User>[]> {
  const users = await this.userService.findAll();

  if (fields) {
    const fieldList = fields.split(',');
    return users.map(user =>
      fieldList.reduce((acc, field) => {
        if (user[field] !== undefined) {
          acc[field] = user[field];
        }
        return acc;
      }, {}),
    );
  }

  return users;
}

// 6. EXPANDING RELATED RESOURCES
// GET /orders/123?expand=items,customer
@Get(':id')
async findOne(
  @Param('id') id: string,
  @Query('expand') expand?: string,
): Promise<Order> {
  const relations = expand?.split(',').filter(Boolean) || [];

  // Validate allowed relations
  const allowedRelations = ['items', 'customer', 'payments'];
  const validRelations = relations.filter(r => allowedRelations.includes(r));

  return this.orderRepository.findOne({
    where: { id },
    relations: validRelations,
  });
}

// 7. FILTERING, SORTING, SEARCHING
// GET /products?filter[category]=electronics&filter[price_gte]=100&sort=-price,name&search=phone
@Get()
async findAll(
  @Query() query: ProductQueryDto,
): Promise<PaginatedResponse<Product>> {
  const queryBuilder = this.productRepository.createQueryBuilder('product');

  // Filtering
  if (query.filter) {
    Object.entries(query.filter).forEach(([key, value]) => {
      if (key.endsWith('_gte')) {
        queryBuilder.andWhere(`product.${key.slice(0, -4)} >= :${key}`, { [key]: value });
      } else if (key.endsWith('_lte')) {
        queryBuilder.andWhere(`product.${key.slice(0, -4)} <= :${key}`, { [key]: value });
      } else {
        queryBuilder.andWhere(`product.${key} = :${key}`, { [key]: value });
      }
    });
  }

  // Searching
  if (query.search) {
    queryBuilder.andWhere(
      '(product.name ILIKE :search OR product.description ILIKE :search)',
      { search: `%${query.search}%` },
    );
  }

  // Sorting
  if (query.sort) {
    const sorts = query.sort.split(',');
    sorts.forEach(sort => {
      const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
      const field = sort.replace(/^-/, '');
      queryBuilder.addOrderBy(`product.${field}`, direction);
    });
  }

  return this.paginate(queryBuilder, query);
}
```

---

## Error Handling

### Q11: How should errors be handled in REST APIs?

**Answer:**

```typescript
// Consistent error response format
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  requestId: string;
}

// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error
    this.logger.error({
      ...errorResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const requestId = request.headers['x-request-id'] as string || uuid();

    // Handle different exception types
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        statusCode: status,
        error: HttpStatus[status],
        message: typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message,
        details: typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).details
          : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    }

    if (exception instanceof ValidationError) {
      return {
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Validation failed',
        details: this.formatValidationErrors(exception),
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    }

    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, request, requestId);
    }

    // Unknown error
    return {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };
  }

  private formatValidationErrors(error: ValidationError): object[] {
    return Object.entries(error.constraints || {}).map(([key, message]) => ({
      field: error.property,
      constraint: key,
      message,
    }));
  }

  private handleDatabaseError(
    error: QueryFailedError,
    request: Request,
    requestId: string,
  ): ErrorResponse {
    // PostgreSQL error codes
    if ((error as any).code === '23505') {
      return {
        statusCode: 409,
        error: 'Conflict',
        message: 'Resource already exists',
        details: { constraint: (error as any).constraint },
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    }

    if ((error as any).code === '23503') {
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Referenced resource does not exist',
        details: { constraint: (error as any).constraint },
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    }

    return {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Database operation failed',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };
  }
}

// Problem Details (RFC 7807)
@Catch(HttpException)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();

    const problemDetails = {
      type: `https://api.example.com/errors/${HttpStatus[status].toLowerCase()}`,
      title: HttpStatus[status],
      status,
      detail: exception.message,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    response
      .status(status)
      .type('application/problem+json')
      .json(problemDetails);
  }
}
```

---

## Quick Reference

| Topic | Key Points |
|-------|------------|
| GET | Read, idempotent, cacheable |
| POST | Create, not idempotent |
| PUT | Full update, idempotent |
| PATCH | Partial update |
| DELETE | Remove, idempotent |
| 2xx | Success |
| 4xx | Client error |
| 5xx | Server error |
| Pagination | Cursor > Offset for large datasets |
| Rate Limiting | Token bucket, sliding window |
| JWT | Stateless auth, short-lived access tokens |
| OWASP | Input validation, parameterized queries, encryption |

---

## Common Interview Questions

1. What's the difference between PUT and PATCH?
2. How do you handle versioning in REST APIs?
3. Explain different pagination strategies.
4. How do you implement rate limiting?
5. What is idempotency and why is it important?
6. Explain OAuth2 flows.
7. How do you prevent SQL injection?
8. What HTTP status code would you use for [scenario]?
9. How do you handle long-running operations?
10. What security headers should you set?
