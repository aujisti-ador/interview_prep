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

// 6b. OpenID Connect (OIDC) vs OAuth2
// Q: What is the difference between OAuth2 and OIDC?
// A: OAuth2 is for *Authorization* (delegated access, granting access to APIs).
//    OIDC is an identity layer built *on top* of OAuth2 for *Authentication* (verifying who the user is).
//    - OAuth2 gives you an Access Token (opaque string, meant for APIs).
//    - OIDC gives you an ID Token (always a JWT, contains user info like email, name, sub).
//    - In NestJS/Passport, if you request the 'openid', 'profile', and 'email' scopes, you are using OIDC.

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
11. How do you design a reliable webhook system?
12. Explain API gateway patterns and when to use them.
13. How do you handle backward compatibility and deprecation in APIs?
14. How do you document REST APIs with OpenAPI/Swagger?

---

## Webhook Design Patterns

### Q12: Webhook Design Patterns

**Answer:**

Webhooks are HTTP callbacks that notify external systems when events occur. Instead of consumers polling your API for changes, you push notifications to their registered endpoints.

**Webhooks vs Polling:**

| Aspect | Webhooks (Push) | Polling (Pull) |
|--------|----------------|----------------|
| Latency | Near real-time | Depends on interval |
| Server Load | Low (event-driven) | High (constant requests) |
| Complexity | Higher (delivery guarantees) | Lower (simple GET) |
| Reliability | Needs retry logic | Client controls retries |
| Network | Efficient | Wasteful (most polls return nothing) |
| Best for | Event-driven systems, integrations | Simple status checks, low-frequency |

```typescript
// 1. Webhook Event Types and Payload Design
interface WebhookEvent {
  id: string;              // Unique event ID (for idempotency)
  type: string;            // Event type (e.g., "order.created")
  createdAt: string;       // ISO 8601 timestamp
  data: Record<string, any>;  // Event payload
  version: string;         // API version (e.g., "2026-03-01")
}

// Example event types:
// order.created, order.updated, order.cancelled
// payment.succeeded, payment.failed, payment.refunded
// user.registered, user.deactivated

// Example payload
const exampleEvent: WebhookEvent = {
  id: 'evt_abc123',
  type: 'order.created',
  createdAt: '2026-03-13T10:30:00Z',
  version: '2026-03-01',
  data: {
    orderId: 'ord_xyz789',
    customerId: 'cust_456',
    total: 99.99,
    currency: 'USD',
    items: [
      { productId: 'prod_001', quantity: 2, price: 49.99 },
    ],
  },
};

// 2. Webhook Registration Entity
@Entity()
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;          // Who owns this subscription

  @Column()
  url: string;             // Delivery URL (must be HTTPS)

  @Column('simple-array')
  events: string[];        // Subscribed event types

  @Column()
  secret: string;          // HMAC signing secret

  @Column({ default: true })
  active: boolean;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ nullable: true })
  disabledAt: Date;        // Auto-disabled after too many failures

  @CreateDateColumn()
  createdAt: Date;
}

// 3. Webhook Sender with Retry (Exponential Backoff)
@Injectable()
export class WebhookSenderService {
  private readonly logger = new Logger(WebhookSenderService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectQueue('webhooks') private readonly webhookQueue: Queue,
  ) {}

  async dispatchEvent(event: WebhookEvent): Promise<void> {
    // Find all active subscriptions for this event type
    const subscriptions = await this.subscriptionRepo.find({
      where: {
        active: true,
        events: Like(`%${event.type}%`),
      },
    });

    // Queue a delivery job for each subscription
    for (const sub of subscriptions) {
      await this.webhookQueue.add(
        'deliver',
        {
          subscriptionId: sub.id,
          event,
        },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 10000, // 10s, 20s, 40s, 80s, 160s
          },
          removeOnComplete: 100,
          removeOnFail: false, // Keep failed jobs for dead letter
        },
      );
    }
  }

  // Webhook delivery processor
  @Process('deliver')
  async handleDelivery(job: Job<{ subscriptionId: string; event: WebhookEvent }>) {
    const { subscriptionId, event } = job.data;
    const subscription = await this.subscriptionRepo.findOneOrFail({
      where: { id: subscriptionId },
    });

    // Generate HMAC signature
    const payload = JSON.stringify(event);
    const signature = this.signPayload(payload, subscription.secret);
    const timestamp = Math.floor(Date.now() / 1000);

    // Create delivery record
    const delivery = this.deliveryRepo.create({
      subscriptionId: subscription.id,
      eventId: event.id,
      eventType: event.type,
      url: subscription.url,
      requestBody: payload,
      attempt: job.attemptsMade + 1,
    });

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': event.id,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-Signature': `sha256=${signature}`,
          'User-Agent': 'MyApp-Webhook/1.0',
        },
        body: payload,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      delivery.statusCode = response.status;
      delivery.responseBody = await response.text().catch(() => '');
      delivery.success = response.status >= 200 && response.status < 300;

      if (!delivery.success) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      // Reset failure count on success
      await this.subscriptionRepo.update(subscription.id, { failureCount: 0 });
    } catch (error) {
      delivery.success = false;
      delivery.error = error.message;

      // Increment failure count
      const updated = await this.subscriptionRepo.increment(
        { id: subscription.id },
        'failureCount',
        1,
      );

      // Auto-disable after 15 consecutive failures
      const sub = await this.subscriptionRepo.findOne({
        where: { id: subscription.id },
      });
      if (sub && sub.failureCount >= 15) {
        await this.subscriptionRepo.update(subscription.id, {
          active: false,
          disabledAt: new Date(),
        });
        this.logger.warn(`Webhook subscription ${subscription.id} disabled after 15 failures`);
      }

      throw error; // Re-throw to trigger BullMQ retry
    } finally {
      await this.deliveryRepo.save(delivery);
    }
  }

  private signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}

// 4. Webhook Signature Verification (Receiver Side)
// The consumer verifies that webhooks are genuinely from your service

import { createHmac, timingSafeEqual } from 'crypto';

@Controller('webhooks')
export class WebhookReceiverController {
  @Post('incoming')
  async handleWebhook(
    @Headers('x-webhook-signature') signatureHeader: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Headers('x-webhook-id') eventId: string,
    @Body() rawBody: string, // Use raw body, not parsed JSON
  ): Promise<{ received: boolean }> {
    // Step 1: Verify timestamp freshness (prevent replay attacks)
    const eventTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const tolerance = 300; // 5 minutes

    if (Math.abs(currentTimestamp - eventTimestamp) > tolerance) {
      throw new ForbiddenException('Webhook timestamp too old');
    }

    // Step 2: Verify HMAC signature
    const secret = this.configService.get('WEBHOOK_SECRET');
    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const providedSignature = signatureHeader.replace('sha256=', '');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex'),
    );

    if (!isValid) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    // Step 3: Idempotency check (prevent duplicate processing)
    const alreadyProcessed = await this.redis.get(`webhook:${eventId}`);
    if (alreadyProcessed) {
      return { received: true }; // Acknowledge but skip processing
    }

    // Step 4: Process the event
    const event: WebhookEvent = JSON.parse(rawBody);

    // Process asynchronously — return 200 immediately
    await this.eventQueue.add('process-webhook', event);

    // Mark as processed (with TTL)
    await this.redis.setex(`webhook:${eventId}`, 86400, '1'); // 24h TTL

    return { received: true };
  }
}

// 5. Dead Letter Handling
@Injectable()
export class WebhookDeadLetterService {
  // Process failed webhook deliveries
  @Cron('0 */15 * * * *') // Every 15 minutes
  async processDeadLetters() {
    const failedDeliveries = await this.deliveryRepo.find({
      where: {
        success: false,
        retryExhausted: true,
        processedAt: IsNull(),
      },
      take: 100,
    });

    for (const delivery of failedDeliveries) {
      this.logger.warn({
        message: 'Dead letter webhook',
        eventId: delivery.eventId,
        subscriptionId: delivery.subscriptionId,
        attempts: delivery.attempt,
        lastError: delivery.error,
      });

      // Notify subscription owner
      await this.notificationService.sendWebhookFailureAlert(
        delivery.subscriptionId,
        delivery.eventId,
        delivery.error,
      );

      delivery.processedAt = new Date();
      await this.deliveryRepo.save(delivery);
    }
  }
}

// 6. Monitoring Webhook Delivery Success Rates
@Injectable()
export class WebhookMetricsService {
  async getDeliveryStats(subscriptionId: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await this.deliveryRepo
      .createQueryBuilder('d')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN d.success = true THEN 1 ELSE 0 END)', 'successful')
      .addSelect('SUM(CASE WHEN d.success = false THEN 1 ELSE 0 END)', 'failed')
      .addSelect('AVG(d.responseTimeMs)', 'avgResponseTime')
      .where('d.subscriptionId = :subscriptionId', { subscriptionId })
      .andWhere('d.createdAt >= :since', { since })
      .getRawOne();

    return {
      total: parseInt(stats.total),
      successful: parseInt(stats.successful),
      failed: parseInt(stats.failed),
      successRate: stats.total > 0
        ? (parseInt(stats.successful) / parseInt(stats.total)) * 100
        : 0,
      avgResponseTimeMs: Math.round(parseFloat(stats.avgResponseTime) || 0),
    };
  }
}
```

> **Interview Tip:** When discussing webhooks, always cover the reliability trifecta: HMAC signature verification, idempotent handlers, and exponential backoff retries. Explain that webhooks are "at-least-once" delivery — the receiver must handle duplicates. Mention auto-disabling subscriptions after repeated failures and dead letter queues for operational observability.

---

## API Gateway Patterns

### Q13: API Gateway Patterns

**Answer:**

An API gateway is a single entry point for all client requests. It sits between clients and backend services, handling cross-cutting concerns like authentication, rate limiting, routing, and request transformation.

**API Gateway vs Reverse Proxy vs Load Balancer:**

| Component | Purpose | Layer | Examples |
|-----------|---------|-------|----------|
| Load Balancer | Distribute traffic across instances | L4/L7 | AWS ALB/NLB, HAProxy |
| Reverse Proxy | Forward requests, SSL termination, caching | L7 | Nginx, Caddy |
| API Gateway | Routing + auth + rate limiting + transformation | L7 | Kong, AWS API Gateway, custom |

An API gateway is a specialized reverse proxy with API-specific features.

```typescript
// 1. API Gateway Responsibilities
/*
┌────────────────────────────────────────────────────┐
│                   API Gateway                       │
├────────────────────────────────────────────────────┤
│  - Request routing (path-based, header-based)      │
│  - Authentication & authorization                  │
│  - Rate limiting & throttling                      │
│  - Request/response transformation                 │
│  - API composition (aggregate multiple services)   │
│  - Caching                                         │
│  - Logging & monitoring                            │
│  - Circuit breaking                                │
│  - CORS handling                                   │
│  - Request validation                              │
│  - SSL termination                                 │
└────────────────────────────────────────────────────┘
*/

// 2. Simple API Gateway with NestJS
// gateway/src/app.module.ts
@Module({
  imports: [
    // HTTP module for proxying
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
    // Caching
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 30,
    }),
  ],
  controllers: [GatewayController],
  providers: [
    ServiceRegistryService,
    AuthMiddleware,
    CircuitBreakerService,
  ],
})
export class AppModule {}

// 3. Service Registry — map routes to backend services
@Injectable()
export class ServiceRegistryService {
  private readonly services: Map<string, ServiceConfig> = new Map([
    ['users', {
      url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
      healthCheck: '/health',
      timeout: 5000,
    }],
    ['orders', {
      url: process.env.ORDERS_SERVICE_URL || 'http://localhost:3002',
      healthCheck: '/health',
      timeout: 10000,
    }],
    ['products', {
      url: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3003',
      healthCheck: '/health',
      timeout: 5000,
    }],
    ['payments', {
      url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3004',
      healthCheck: '/health',
      timeout: 15000,
    }],
  ]);

  getService(name: string): ServiceConfig {
    const service = this.services.get(name);
    if (!service) {
      throw new NotFoundException(`Service ${name} not found`);
    }
    return service;
  }
}

// 4. Gateway Controller — route requests to backend services
@Controller('api')
@UseGuards(ThrottlerGuard)
export class GatewayController {
  constructor(
    private readonly httpService: HttpService,
    private readonly registry: ServiceRegistryService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  // Proxy all requests to appropriate services
  @All(':service/*')
  async proxy(
    @Param('service') serviceName: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const service = this.registry.getService(serviceName);
    const path = req.url.replace(`/api/${serviceName}`, '');
    const targetUrl = `${service.url}${path}`;

    // Use circuit breaker to prevent cascading failures
    return this.circuitBreaker.execute(serviceName, async () => {
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method: req.method as any,
            url: targetUrl,
            data: req.body,
            headers: {
              ...this.forwardHeaders(req),
              'X-Request-ID': req.headers['x-request-id'] || randomUUID(),
              'X-Forwarded-For': req.ip,
            },
            params: req.query,
            timeout: service.timeout,
          }),
        );

        // Forward response headers
        Object.entries(response.headers).forEach(([key, value]) => {
          if (value) res.setHeader(key, value as string);
        });

        res.status(response.status).json(response.data);
      } catch (error) {
        if (error.response) {
          res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNABORTED') {
          res.status(504).json({ message: 'Service timeout' });
        } else {
          res.status(502).json({ message: 'Service unavailable' });
        }
      }
    });
  }

  private forwardHeaders(req: Request): Record<string, string> {
    const headersToForward = ['authorization', 'content-type', 'accept', 'accept-language'];
    return headersToForward.reduce((acc, header) => {
      if (req.headers[header]) {
        acc[header] = req.headers[header] as string;
      }
      return acc;
    }, {} as Record<string, string>);
  }
}

// 5. Authentication Offloading — verify JWT at gateway, pass user context
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip auth for public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/health'];
    if (publicRoutes.some((route) => req.url.startsWith(route))) {
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Inject user context into headers for downstream services
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-email'] = payload.email;
      req.headers['x-user-roles'] = JSON.stringify(payload.roles);

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
}

// 6. API Composition Pattern — aggregate multiple service responses
@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly httpService: HttpService,
    private readonly registry: ServiceRegistryService,
  ) {}

  // Compose data from multiple services into one response
  @Get('summary')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 60 seconds
  async getDashboardSummary(
    @Headers('x-user-id') userId: string,
  ): Promise<DashboardSummary> {
    const usersService = this.registry.getService('users');
    const ordersService = this.registry.getService('orders');
    const productsService = this.registry.getService('products');

    // Parallel requests to multiple services
    const [userProfile, recentOrders, recommendations] = await Promise.all([
      firstValueFrom(
        this.httpService.get(`${usersService.url}/users/${userId}`),
      ).then((r) => r.data),

      firstValueFrom(
        this.httpService.get(`${ordersService.url}/orders?userId=${userId}&limit=5`),
      ).then((r) => r.data),

      firstValueFrom(
        this.httpService.get(`${productsService.url}/products/recommendations?userId=${userId}`),
      ).then((r) => r.data).catch(() => []), // Graceful degradation
    ]);

    return {
      user: userProfile,
      recentOrders,
      recommendations,
      composedAt: new Date().toISOString(),
    };
  }
}

// 7. Request/Response Transformation
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const apiVersion = request.headers['api-version'] || '2';

    return next.handle().pipe(
      map((data) => {
        // Transform response based on API version
        if (apiVersion === '1') {
          return this.transformToV1(data);
        }
        return this.wrapResponse(data, request);
      }),
    );
  }

  private wrapResponse(data: any, request: Request) {
    return {
      success: true,
      data,
      meta: {
        requestId: request.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  private transformToV1(data: any) {
    // Map v2 field names to v1 for backward compatibility
    if (data.firstName && data.lastName) {
      data.name = `${data.firstName} ${data.lastName}`;
      delete data.firstName;
      delete data.lastName;
    }
    return data;
  }
}
```

**Comparison of API Gateway solutions:**

| Feature | AWS API Gateway | Kong | Custom (NestJS) |
|---------|----------------|------|-----------------|
| Setup | Managed, zero ops | Self-hosted or cloud | Self-hosted |
| Cost | Per-request pricing | Free (OSS) / Enterprise | Compute cost only |
| Plugins | Limited | 100+ plugins | Unlimited (code) |
| Customization | Low | Medium | Full control |
| Performance | ~30ms overhead | ~2-5ms overhead | Minimal overhead |
| Auth | Cognito, Lambda auth | JWT, OAuth, LDAP | Any (code it) |
| Rate Limiting | Built-in | Built-in plugin | Manual (throttler) |
| Best For | Serverless (Lambda) | Kubernetes/Docker | Small-medium teams |

> **Interview Tip:** When asked about API gateways, distinguish between the gateway pattern (architecture) and gateway products (Kong, AWS). Emphasize that the gateway handles cross-cutting concerns so services stay focused on business logic. Mention the API composition pattern for BFF (Backend for Frontend) scenarios. Always note the trade-off: a gateway is a single point of failure and adds latency.

---

## API Backward Compatibility & Deprecation

### Q14: API Backward Compatibility & Deprecation

**Answer:**

Backward compatibility means existing clients continue working when you update your API. Breaking this contract is the fastest way to lose consumer trust.

**What constitutes a breaking change:**

| Change Type | Breaking? | Example |
|-------------|-----------|---------|
| Add new endpoint | No | `POST /api/v2/exports` |
| Add optional field to response | No | Add `avatarUrl` to user response |
| Add optional query parameter | No | `?include=profile` |
| Remove field from response | YES | Remove `name` from user response |
| Rename field | YES | `name` -> `fullName` |
| Change field type | YES | `id: number` -> `id: string` |
| Remove endpoint | YES | Remove `DELETE /users/:id` |
| Change required params | YES | Make optional param required |
| Change error format | YES | Different error response structure |
| Change status codes | YES | 200 -> 201 for create |

```typescript
// 1. Additive Changes (Safe)
// Adding new fields — old clients ignore them

// Before:
// { "id": 1, "name": "John" }

// After (safe — old clients just ignore new fields):
// { "id": 1, "name": "John", "avatarUrl": "https://...", "createdAt": "2026-01-01" }

// 2. Deprecation Headers
// Signal that a feature will be removed

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  private readonly deprecatedEndpoints = new Map<string, {
    sunset: string;
    alternative: string;
    link: string;
  }>([
    ['GET /api/v1/users', {
      sunset: '2026-09-01',
      alternative: 'GET /api/v2/users',
      link: 'https://docs.example.com/migration/v2-users',
    }],
    ['POST /api/v1/orders', {
      sunset: '2026-09-01',
      alternative: 'POST /api/v2/orders',
      link: 'https://docs.example.com/migration/v2-orders',
    }],
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const key = `${request.method} ${request.route?.path || request.url}`;
    const deprecation = this.deprecatedEndpoints.get(key);

    if (deprecation) {
      // Standard deprecation headers (RFC 8594)
      response.setHeader('Deprecation', 'true');
      response.setHeader('Sunset', deprecation.sunset);
      response.setHeader('Link', `<${deprecation.link}>; rel="deprecation"`);
      response.setHeader(
        'X-Deprecated-Message',
        `This endpoint is deprecated. Use ${deprecation.alternative} instead. ` +
        `Sunset date: ${deprecation.sunset}`,
      );

      // Track usage of deprecated endpoints
      this.metricsService.increment('api.deprecated.usage', {
        endpoint: key,
      });
    }

    return next.handle();
  }
}

// 3. Supporting Multiple API Versions Simultaneously
// Version via URL prefix
@Controller('v1/users')
export class UsersV1Controller {
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserV1Response> {
    const user = await this.userService.findById(id);
    // V1 response format
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`, // V1 had combined name
      email: user.email,
    };
  }
}

@Controller('v2/users')
export class UsersV2Controller {
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserV2Response> {
    const user = await this.userService.findById(id);
    // V2 response format
    return {
      id: user.id,
      firstName: user.firstName,  // V2 separated name fields
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,  // New in V2
      createdAt: user.createdAt,  // New in V2
    };
  }
}

// Both controllers share the same service layer
// Only the response shape differs

// 4. Expand-Contract Pattern for Safe Database Migrations
/*
Phase 1: EXPAND — Add new column alongside old
  - Add "first_name" and "last_name" columns
  - Write to both old ("name") and new columns
  - Read from old column
  - Deploy all services

Phase 2: MIGRATE — Backfill data
  - Run migration to split existing "name" into "first_name"/"last_name"
  - Verify data integrity

Phase 3: SWITCH — Read from new column
  - Update API to read from new columns
  - Still write to both columns (for rollback safety)
  - Deploy all services

Phase 4: CONTRACT — Remove old column
  - Stop writing to "name" column
  - Drop "name" column in migration
  - Remove V1 controller after sunset date
*/

// Implementation example
@Entity()
export class User {
  @Column({ nullable: true })
  name: string; // Old column — will be removed

  @Column({ nullable: true })
  firstName: string; // New column

  @Column({ nullable: true })
  lastName: string; // New column

  // During expand phase, set both
  @BeforeInsert()
  @BeforeUpdate()
  syncNameFields() {
    if (this.firstName && this.lastName && !this.name) {
      this.name = `${this.firstName} ${this.lastName}`;
    }
    if (this.name && !this.firstName) {
      const parts = this.name.split(' ');
      this.firstName = parts[0];
      this.lastName = parts.slice(1).join(' ');
    }
  }
}

// 5. API Lifecycle Management
/*
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Alpha   │───>│  Beta    │───>│  Stable  │───>│  Deprecated  │───>│  Removed │
│          │    │          │    │          │    │              │    │          │
│ Internal │    │ Selected │    │ General  │    │ Sunset date  │    │ 410 Gone │
│ only     │    │ partners │    │ release  │    │ announced    │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────────┘    └──────────┘
   0-3 mo         1-3 mo        Indefinite       6-12 months        After sunset
*/

// After sunset date — return 410 Gone
@Controller('v1/legacy-endpoint')
export class LegacyController {
  @All('*')
  handleLegacy(@Res() res: Response) {
    res.status(410).json({
      error: 'Gone',
      message: 'This API version has been removed.',
      migration: 'https://docs.example.com/migration/v1-to-v2',
      currentVersion: 'https://api.example.com/v2',
    });
  }
}

// 6. Communication Strategies for API Consumers
/*
 - Changelog: Maintain a public changelog for every release
 - Email notifications: Notify registered developers of breaking changes
 - Developer portal: Show deprecation warnings in API documentation
 - Response headers: Deprecation and Sunset headers on every response
 - Monitoring: Track which consumers still use deprecated endpoints
 - Grace period: Minimum 6 months between deprecation announcement and removal
 - Migration guide: Provide step-by-step migration documentation
*/
```

> **Interview Tip:** When asked about API versioning and deprecation, lead with the principle "never break existing clients." Explain the expand-contract pattern for database changes and the Sunset header (RFC 8594) for communicating deprecation timelines. Mention that you track deprecated endpoint usage to know when it is safe to remove them. This shows operational maturity beyond just writing code.

---

## OpenAPI/Swagger Documentation

### Q15: OpenAPI/Swagger Documentation

**Answer:**

OpenAPI (formerly Swagger) is the industry standard for describing REST APIs. It provides a machine-readable specification that powers documentation, client SDK generation, testing, and validation.

**API-first vs Code-first approach:**

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| API-first | Write OpenAPI spec first, then implement | Better design, parallel work | Extra upfront effort |
| Code-first | Generate spec from code decorators | Spec always matches code | Design influenced by implementation |

```typescript
// ===== CODE-FIRST APPROACH WITH NestJS (@nestjs/swagger) =====

// 1. Setup in main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('REST API for managing orders, products, and users')
    .setVersion('2.0')
    .setContact('API Team', 'https://docs.example.com', 'api@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('https://api.example.com', 'Production')
    .addServer('https://staging-api.example.com', 'Staging')
    .addServer('http://localhost:3000', 'Local Development')
    // Security schemes
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      'API-key',
    )
    // Tags for grouping endpoints
    .addTag('Users', 'User management operations')
    .addTag('Orders', 'Order processing operations')
    .addTag('Products', 'Product catalog operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Save OpenAPI spec to file (for SDK generation)
  const fs = require('fs');
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(3000);
}

// 2. Fully Documented DTOs
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Array of order items',
    type: () => [OrderItemDto],
    minItems: 1,
    example: [{ productId: 'prod_001', quantity: 2 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description: 'Shipping address for the order',
    type: () => AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiPropertyOptional({
    description: 'Coupon code for discount',
    example: 'SAVE20',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @ApiProperty({
    description: 'Payment method identifier',
    example: 'pm_card_visa_4242',
  })
  @IsString()
  paymentMethodId: string;
}

export class OrderItemDto {
  @ApiProperty({
    description: 'Product identifier',
    example: 'prod_001',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Quantity to order',
    minimum: 1,
    maximum: 100,
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}

// 3. Documented Response Types
export class OrderResponse {
  @ApiProperty({ example: 'ord_abc123' })
  id: string;

  @ApiProperty({ example: 'CONFIRMED', enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ example: 149.98, description: 'Total order amount in USD' })
  total: number;

  @ApiProperty({ type: () => [OrderItemResponse] })
  items: OrderItemResponse[];

  @ApiProperty({ example: '2026-03-13T10:30:00Z' })
  createdAt: string;
}

export class PaginatedOrderResponse {
  @ApiProperty({ type: () => [OrderResponse] })
  data: OrderResponse[];

  @ApiProperty({
    example: { total: 150, page: 1, limit: 20, totalPages: 8 },
  })
  meta: PaginationMeta;
}

export class ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({
    example: [{ field: 'email', message: 'must be a valid email' }],
    required: false,
  })
  details?: Array<{ field: string; message: string }>;
}

// 4. Fully Documented NestJS Controller with Swagger Decorators
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('v2/orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates an order, processes payment, and reserves inventory. ' +
      'Requires a valid payment method and at least one item.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key for idempotent order creation',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or insufficient stock',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 402,
    description: 'Payment failed',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate idempotency key with different request body',
    type: ErrorResponse,
  })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponse> {
    return this.orderService.create(dto, user, idempotencyKey);
  }

  @Get()
  @ApiOperation({
    summary: 'List orders for the authenticated user',
    description: 'Returns paginated orders with optional status filtering.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort field with direction prefix (- for DESC)',
    example: '-createdAt',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of orders',
    type: PaginatedOrderResponse,
  })
  async listOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @CurrentUser() user?: User,
  ): Promise<PaginatedOrderResponse> {
    return this.orderService.findByUser(user.id, { page, limit, status, sort });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({
    name: 'id',
    description: 'Order identifier',
    example: 'ord_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    type: OrderResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
    type: ErrorResponse,
  })
  async getOrder(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponse> {
    return this.orderService.findOneForUser(id, user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Can only cancel orders in PENDING or CONFIRMED status. ' +
      'Triggers refund if payment was processed.',
  })
  @ApiParam({ name: 'id', description: 'Order identifier' })
  @ApiResponse({ status: 200, description: 'Order cancelled', type: OrderResponse })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled in current status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponse> {
    return this.orderService.cancel(id, user.id);
  }
}

// 5. Generating Client SDKs from OpenAPI Spec
// Use openapi-generator to create typed clients
/*
# Generate TypeScript client
npx openapi-generator-cli generate \
  -i http://localhost:3000/docs-json \
  -g typescript-axios \
  -o ./generated/api-client

# Generate Python client
npx openapi-generator-cli generate \
  -i ./openapi.json \
  -g python \
  -o ./generated/python-client

# Generate Go client
npx openapi-generator-cli generate \
  -i ./openapi.json \
  -g go \
  -o ./generated/go-client
*/

// Usage of generated client:
// import { OrdersApi, Configuration } from './generated/api-client';
//
// const api = new OrdersApi(new Configuration({
//   basePath: 'https://api.example.com',
//   accessToken: 'your-jwt-token',
// }));
//
// const orders = await api.listOrders(1, 20, 'CONFIRMED');
// const order = await api.createOrder({ items: [...], shippingAddress: {...} });

// 6. OpenAPI Spec Validation in Tests
// Ensure responses match the documented schema
import { OpenApiValidator } from 'express-openapi-validator';

describe('Orders API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();

    // Add OpenAPI validation middleware for tests
    app.use(
      OpenApiValidator.middleware({
        apiSpec: './openapi.json',
        validateRequests: true,
        validateResponses: true,
      }),
    );

    await app.init();
  });

  it('POST /v2/orders should match OpenAPI spec', async () => {
    const response = await request(app.getHttpServer())
      .post('/v2/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ productId: 'prod_001', quantity: 2 }],
        shippingAddress: { street: '123 Main St', city: 'NYC', zip: '10001' },
        paymentMethodId: 'pm_test_123',
      })
      .expect(201);

    // If response doesn't match OpenAPI spec, the validator
    // middleware throws automatically
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status');
  });
});
```

> **Interview Tip:** When discussing API documentation, advocate for the code-first approach with NestJS/Swagger because the spec is always in sync with the code. Mention that OpenAPI enables three powerful workflows: interactive documentation (Swagger UI), client SDK generation (openapi-generator), and contract testing (validating responses against the spec). This shows you think about APIs as products, not just endpoints.

---

## Q12: Webhook Patterns & Reliability

**Q: How do you design reliable webhook systems?**

**A:**

Webhooks are HTTP callbacks that notify external systems when events occur. Unlike polling, webhooks push data in real-time.

### Webhook Architecture
```
Your Service → HTTP POST → Consumer's URL
     ↓ (on failure)
  Retry Queue → Exponential Backoff → Dead Letter Queue
```

### Sending Webhooks — Implementation
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(@InjectQueue('webhooks') private webhookQueue: Queue) {}

  async dispatch(event: string, payload: any, subscriberUrl: string, secret: string) {
    const timestamp = Date.now();
    const body = JSON.stringify({ event, data: payload, timestamp });

    // Sign the payload for verification
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    await this.webhookQueue.add('deliver', {
      url: subscriberUrl,
      body,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-ID': crypto.randomUUID(),
      },
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s, 40s, 80s
      },
    });
  }
}
```

### Receiving Webhooks — Signature Verification
```typescript
@Post('webhooks/payments')
async handlePaymentWebhook(
  @Body() body: any,
  @Headers('x-webhook-signature') signature: string,
  @Headers('x-webhook-timestamp') timestamp: string,
) {
  // Prevent replay attacks — reject if timestamp > 5 minutes old
  const age = Date.now() - parseInt(timestamp);
  if (age > 5 * 60 * 1000) {
    throw new BadRequestException('Webhook timestamp too old');
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature.replace('sha256=', '')), Buffer.from(expectedSig))) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  // Process idempotently using webhook ID
  const webhookId = body.id;
  if (await this.processedWebhooks.has(webhookId)) {
    return { status: 'already_processed' };
  }

  await this.handlePaymentEvent(body);
  await this.processedWebhooks.set(webhookId, true);

  return { status: 'ok' };
}
```

### Webhook Reliability Best Practices
| Practice | Why |
|----------|-----|
| Sign payloads (HMAC-SHA256) | Prevent spoofing |
| Include timestamp | Prevent replay attacks |
| Unique webhook ID | Enable idempotent processing |
| Exponential backoff retries | Handle temporary failures |
| Dead letter queue | Don't lose failed deliveries |
| Timeout (5-10s) | Don't hang on slow consumers |
| Return 2xx quickly | Process async, acknowledge fast |
| Allow re-delivery | Consumer should be idempotent |

**Interview Tip:** "In my Banglalink notification system, we used webhook-like patterns for notifying downstream services. The key was HMAC signing + idempotency keys + exponential backoff with a dead letter queue for manual review."

---

## Q13: API Gateway Pattern

**Q: What is the API Gateway pattern and when do you use it?**

**A:**

An API Gateway is a single entry point that sits in front of your microservices, handling cross-cutting concerns.

### What an API Gateway Does
```
Client → API Gateway → Service A
                     → Service B
                     → Service C

Gateway handles:
- Routing (path-based, header-based)
- Authentication / Authorization
- Rate limiting
- Request/Response transformation
- Load balancing
- Caching
- Logging & monitoring
- SSL termination
- API versioning
- Circuit breaking
```

### API Gateway vs Direct Service Communication
| Aspect | Direct | API Gateway |
|--------|--------|-------------|
| Client complexity | High (knows all services) | Low (single endpoint) |
| Cross-cutting concerns | Duplicated in each service | Centralized |
| Performance | Fewer hops | +1 hop (gateway) |
| Security | Each service handles auth | Centralized auth |
| Deployment coupling | Low | Gateway is a dependency |

### AWS API Gateway (REST vs HTTP APIs)
| Feature | REST API | HTTP API |
|---------|----------|----------|
| Cost | ~$3.50/million requests | ~$1.00/million requests |
| Latency | Higher | ~60% lower |
| Features | Full (caching, WAF, API keys) | Basic (JWT auth, CORS) |
| Use case | Public APIs needing full features | Internal/simple APIs |

### BFF (Backend for Frontend) Pattern
```
Mobile App    → Mobile BFF Gateway    → Microservices
Web App       → Web BFF Gateway       → Microservices
Partner API   → Partner BFF Gateway   → Microservices
```
- Each client type gets a tailored gateway
- Mobile BFF returns less data (bandwidth optimization — especially relevant for BD networks)
- Web BFF can return richer responses

### NestJS as API Gateway
```typescript
// Simple gateway that aggregates multiple services
@Controller('dashboard')
export class DashboardGatewayController {
  constructor(
    private readonly userService: UserServiceClient,
    private readonly orderService: OrderServiceClient,
    private readonly analyticsService: AnalyticsServiceClient,
  ) {}

  @Get(':userId')
  async getDashboard(@Param('userId') userId: string) {
    // Parallel calls to multiple services
    const [user, recentOrders, stats] = await Promise.all([
      this.userService.getUser(userId),
      this.orderService.getRecentOrders(userId),
      this.analyticsService.getUserStats(userId),
    ]);

    // Aggregate and transform for client
    return {
      user: { name: user.name, avatar: user.avatar },
      orders: recentOrders.map(o => ({ id: o.id, total: o.total, status: o.status })),
      stats: { totalSpent: stats.totalSpent, orderCount: stats.orderCount },
    };
  }
}
```

### Gateway Rate Limiting Example
```typescript
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },   // 3 requests/second
      { name: 'medium', ttl: 10000, limit: 20 }, // 20 requests/10 seconds
      { name: 'long', ttl: 60000, limit: 100 },  // 100 requests/minute
    ]),
  ],
})
export class GatewayModule {}
```

**Interview Tip:** "For a BD startup, I'd start with AWS HTTP API (cheaper) as the gateway. As complexity grows, move to a NestJS-based custom gateway or Kong for fine-grained control."

---

## Q14: API Backward Compatibility & Versioning Strategy

**Q: How do you maintain backward compatibility when evolving APIs?**

**A:**

### Breaking vs Non-Breaking Changes
| Change Type | Breaking? | Example |
|------------|-----------|---------|
| Add optional field to response | No | Adding `avatar_url` to user response |
| Add optional query parameter | No | Adding `?include_archived=true` |
| Remove a field from response | YES | Removing `legacy_id` |
| Rename a field | YES | `user_name` → `username` |
| Change field type | YES | `id: number` → `id: string` |
| Change HTTP method | YES | POST → PUT |
| Change error format | YES | Different error response shape |
| Add required field to request | YES | New required `phone` field |

### Versioning Strategies
```
# URL Path (most common, clearest)
GET /api/v1/users
GET /api/v2/users

# Header-based
GET /api/users
Accept-Version: v2

# Query parameter
GET /api/users?version=2
```

### NestJS API Versioning
```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI, // /v1/users, /v2/users
  defaultVersion: '1',
});

// Controller
@Controller('users')
export class UsersController {
  @Get()
  @Version('1')
  findAllV1() {
    return this.usersService.findAll(); // Original format
  }

  @Get()
  @Version('2')
  findAllV2() {
    return this.usersService.findAllEnriched(); // New format with extra fields
  }
}
```

### Deprecation Strategy
```typescript
// Deprecation middleware
@Injectable()
export class DeprecationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.startsWith('/api/v1')) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', 'Sat, 01 Jun 2026 00:00:00 GMT');
      res.setHeader('Link', '</api/v2>; rel="successor-version"');
    }
    next();
  }
}
```

### Expand-Contract Pattern for API Evolution
```
Phase 1 (Expand): Add new field alongside old
  Response: { user_name: "fazle", username: "fazle" }

Phase 2 (Migrate): Update all clients to use new field
  Monitor: Track usage of old field via analytics

Phase 3 (Contract): Remove old field after no usage
  Response: { username: "fazle" }
```

### Semantic Versioning for APIs
- **Major (v1 → v2)**: Breaking changes — give clients 6-12 months to migrate
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes only

**Interview Tip:** "I always start with URL-based versioning for clarity. For non-breaking additions, I don't version — I just add optional fields. I use the expand-contract pattern to safely remove fields over time."

---

## Q15: API Documentation with OpenAPI/Swagger

**Q: How do you approach API documentation?**

**A:**

### NestJS + Swagger Setup
```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Order Service API')
  .setDescription('API for managing orders')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('orders')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### DTO Documentation with Decorators
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Array of product IDs to order', example: ['prod_123', 'prod_456'] })
  @IsArray()
  productIds: string[];

  @ApiProperty({ description: 'Shipping address', example: '123 Gulshan Ave, Dhaka' })
  @IsString()
  shippingAddress: string;

  @ApiPropertyOptional({ description: 'Discount coupon code', example: 'SAVE20' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
```

### Controller Documentation
```typescript
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.orderService.create(dto);
  }
}
```

### Best Practices
- Generate docs from code (single source of truth)
- Include request/response examples
- Document error responses
- Keep docs in sync via CI checks
- Export OpenAPI spec for client SDK generation

**Interview Tip:** "I treat API documentation as a contract. Using NestJS Swagger decorators ensures docs stay in sync with the code. For public APIs, I also generate client SDKs from the OpenAPI spec."
