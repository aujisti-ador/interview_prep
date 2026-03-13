# NestJS Mastery - Interview Q&A

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Modules](#modules)
3. [Controllers](#controllers)
4. [Providers & Services](#providers--services)
5. [Dependency Injection](#dependency-injection)
6. [Guards](#guards)
7. [Interceptors](#interceptors)
8. [Pipes](#pipes)
9. [Exception Filters](#exception-filters)
10. [Middleware](#middleware)
11. [Custom Decorators](#custom-decorators)
12. [Microservices](#microservices)
13. [Testing](#testing)
14. [Best Practices](#best-practices)

---

## Core Concepts

### Q1: What is NestJS and why would you choose it over Express.js?

**Answer:**
NestJS is a progressive Node.js framework built with TypeScript, inspired by Angular's architecture. It provides a structured, opinionated approach to building scalable server-side applications.

**Why choose NestJS over Express:**

| Feature | NestJS | Express |
|---------|--------|---------|
| Architecture | Opinionated (modules, DI) | Unopinionated |
| TypeScript | First-class support | Manual setup |
| Dependency Injection | Built-in | Manual/third-party |
| Testing | Built-in testing utilities | Manual setup |
| Documentation | OpenAPI/Swagger integration | Third-party |
| Microservices | Built-in support | Third-party |
| WebSockets | Built-in | socket.io manual |
| Learning Curve | Steeper | Gentle |

```typescript
// Express - Manual wiring
const express = require('express');
const app = express();

const userService = new UserService(new UserRepository());
const userController = new UserController(userService);

app.get('/users', (req, res) => userController.findAll(req, res));

// NestJS - Automatic DI and structure
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

### Q2: Explain the request lifecycle in NestJS.

**Answer:**

```
Incoming Request
       │
       ▼
┌──────────────────┐
│   Middleware     │  Global → Module-bound
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Guards       │  Global → Controller → Route
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Interceptors    │  Global → Controller → Route (PRE)
│    (before)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Pipes        │  Global → Controller → Route → Parameter
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Controller      │  Route Handler execution
│   (Handler)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Service       │  Business Logic
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Interceptors    │  Route → Controller → Global (POST)
│    (after)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│Exception Filters │  Route → Controller → Global (if error)
└────────┬─────────┘
         │
         ▼
   Response Sent
```

```typescript
// Full example showing all components
@Controller('users')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @UsePipes(ValidationPipe)
  @UseFilters(HttpExceptionFilter)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }
}
```

---

## Modules

### Q3: What is a Module in NestJS? Explain its components.

**Answer:**
A module is a class decorated with `@Module()` that organizes the application into cohesive blocks of functionality.

```typescript
@Module({
  imports: [],      // Other modules this module depends on
  controllers: [],  // Controllers belonging to this module
  providers: [],    // Services/providers for DI container
  exports: [],      // Providers available to other modules
})
export class AppModule {}
```

**Example: Feature Module**

```typescript
// users/users.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile]),
    AuthModule, // Import other modules
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    {
      provide: 'CACHE_MANAGER',
      useFactory: () => new CacheManager(),
    },
  ],
  exports: [UserService], // Allow other modules to use UserService
})
export class UserModule {}
```

### Q4: What is the difference between a Feature Module, Shared Module, and Dynamic Module?

**Answer:**

```typescript
// 1. Feature Module - Encapsulates a specific feature
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}

// 2. Shared Module - Exports reusable providers
@Module({
  imports: [HttpModule],
  providers: [
    UtilityService,
    LoggerService,
    CacheService,
  ],
  exports: [
    UtilityService,
    LoggerService,
    CacheService,
    HttpModule, // Re-export HttpModule
  ],
})
export class SharedModule {}

// 3. Dynamic Module - Configurable module
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true, // Make it globally available
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        {
          provide: 'DATABASE_CONNECTION',
          useFactory: async (opts: DatabaseOptions) => {
            return await createConnection(opts);
          },
          inject: ['DATABASE_OPTIONS'],
        },
      ],
      exports: ['DATABASE_CONNECTION'],
    };
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    return {
      module: DatabaseModule,
      providers: entities.map(entity => ({
        provide: `${entity.name}_REPOSITORY`,
        useFactory: (connection: Connection) => connection.getRepository(entity),
        inject: ['DATABASE_CONNECTION'],
      })),
      exports: entities.map(entity => `${entity.name}_REPOSITORY`),
    };
  }
}

// Usage
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      database: 'myapp',
    }),
    DatabaseModule.forFeature([User, Order]),
  ],
})
export class AppModule {}
```

### Q5: How do you create a Global Module?

**Answer:**

```typescript
// Method 1: Using @Global() decorator
@Global()
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService],
})
export class CoreModule {}

// Method 2: In dynamic module
@Module({})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      global: true, // Makes module global
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService(options),
        },
      ],
      exports: [ConfigService],
    };
  }
}

// Now ConfigService is available everywhere without importing
@Injectable()
export class UserService {
  constructor(
    private configService: ConfigService, // Available without importing ConfigModule
  ) {}
}
```

---

## Controllers

### Q6: Explain Controllers and route handling in NestJS.

**Answer:**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  Ip,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Redirect,
  Header,
} from '@nestjs/common';

@Controller('users') // Base route: /users
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET /users
  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<User[]> {
    return this.userService.findAll({ page, limit });
  }

  // GET /users/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.findOne(id);
  }

  // POST /users
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  // PUT /users/:id (full update)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  // PATCH /users/:id (partial update)
  @Patch(':id')
  partialUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchUserDto: PatchUserDto,
  ): Promise<User> {
    return this.userService.partialUpdate(id, patchUserDto);
  }

  // DELETE /users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.userService.remove(id);
  }

  // Accessing request object
  @Get('profile')
  getProfile(
    @Req() request: Request,
    @Headers('authorization') auth: string,
    @Ip() ip: string,
  ) {
    return { user: request.user, ip };
  }

  // Redirect
  @Get('docs')
  @Redirect('https://docs.nestjs.com', 302)
  getDocs(@Query('version') version: string) {
    if (version === 'v9') {
      return { url: 'https://docs.nestjs.com/v9/' };
    }
  }

  // Custom response headers
  @Post('download')
  @Header('Content-Type', 'application/octet-stream')
  @Header('Content-Disposition', 'attachment; filename="data.csv"')
  downloadData() {
    return this.userService.exportToCsv();
  }
}
```

### Q7: How do you handle sub-routes and versioning?

**Answer:**

```typescript
// Sub-routes with nested controllers
@Controller('users/:userId/orders')
export class UserOrdersController {
  @Get()
  findOrders(@Param('userId') userId: string) {
    // GET /users/123/orders
  }

  @Get(':orderId')
  findOrder(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
  ) {
    // GET /users/123/orders/456
  }
}

// API Versioning
// main.ts
const app = await NestFactory.create(AppModule);
app.enableVersioning({
  type: VersioningType.URI, // v1/users
  // type: VersioningType.HEADER, // X-API-Version header
  // type: VersioningType.MEDIA_TYPE, // Accept: application/json;v=1
  defaultVersion: '1',
});

// Controller versioning
@Controller({
  path: 'users',
  version: '1',
})
export class UserControllerV1 {
  @Get()
  findAll() {
    return 'V1 response';
  }
}

@Controller({
  path: 'users',
  version: '2',
})
export class UserControllerV2 {
  @Get()
  findAll() {
    return 'V2 response with pagination';
  }
}

// Method-level versioning
@Controller('users')
export class UserController {
  @Get()
  @Version('1')
  findAllV1() {
    return 'V1';
  }

  @Get()
  @Version('2')
  findAllV2() {
    return 'V2';
  }

  @Get()
  @Version(['3', '4']) // Multiple versions
  findAllV3V4() {
    return 'V3 or V4';
  }
}
```

---

## Providers & Services

### Q8: What are Providers in NestJS? Explain different provider types.

**Answer:**
Providers are classes that can be injected as dependencies. They can be services, repositories, factories, helpers, etc.

```typescript
// 1. Standard Provider (Class Provider)
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
}

// Registration
@Module({
  providers: [UserService], // Shorthand for: { provide: UserService, useClass: UserService }
})

// 2. Value Provider
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useValue: {
        apiKey: 'secret-key',
        timeout: 3000,
      },
    },
    {
      provide: 'API_URL',
      useValue: 'https://api.example.com',
    },
  ],
})

// Usage
@Injectable()
export class ApiService {
  constructor(
    @Inject('CONFIG') private config: { apiKey: string; timeout: number },
    @Inject('API_URL') private apiUrl: string,
  ) {}
}

// 3. Factory Provider
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const options = configService.get('database');
        const connection = await createConnection(options);
        return connection;
      },
      inject: [ConfigService], // Dependencies for factory
    },
  ],
})

// Async factory with multiple dependencies
{
  provide: 'CACHE_CLIENT',
  useFactory: async (
    configService: ConfigService,
    logger: LoggerService,
  ) => {
    logger.log('Connecting to Redis...');
    const client = new Redis(configService.get('redis'));
    await client.connect();
    return client;
  },
  inject: [ConfigService, LoggerService],
}

// 4. Class Provider (with aliasing)
@Module({
  providers: [
    {
      provide: 'UserServiceInterface',
      useClass: process.env.NODE_ENV === 'test'
        ? MockUserService
        : UserService,
    },
  ],
})

// 5. Existing Provider (alias)
@Module({
  providers: [
    UserService,
    {
      provide: 'AliasedUserService',
      useExisting: UserService, // Points to same instance
    },
  ],
})
```

### Q9: What is the difference between @Injectable() scope options?

**Answer:**

```typescript
// 1. DEFAULT (Singleton) - One instance shared across entire app
@Injectable() // Same as @Injectable({ scope: Scope.DEFAULT })
export class UserService {
  private cache = new Map(); // Shared across all requests
}

// 2. REQUEST - New instance for each request
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  constructor(@Inject(REQUEST) private request: Request) {
    // Access to current request object
  }

  getUser() {
    return this.request.user;
  }
}

// 3. TRANSIENT - New instance every time it's injected
@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  private id = Math.random();

  getId() {
    return this.id; // Different for each injection
  }
}

// Scope bubbling - Parent inherits child's scope
@Injectable({ scope: Scope.REQUEST })
export class RequestService {}

@Injectable() // Becomes REQUEST scoped because it depends on RequestService
export class UserService {
  constructor(private requestService: RequestService) {}
}

// Controller with request scope
@Controller({ scope: Scope.REQUEST })
export class UserController {
  constructor(
    private userService: UserService,
    @Inject(REQUEST) private request: Request,
  ) {}
}

// Performance consideration
// DEFAULT: Best performance (singleton)
// REQUEST: New instance per request (more memory, slower)
// TRANSIENT: New instance every injection (most overhead)
```

---

## Dependency Injection

### Q10: Explain Dependency Injection in NestJS with advanced examples.

**Answer:**

```typescript
// Basic DI
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}
}

// Constructor injection with token
@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT_GATEWAY') private gateway: PaymentGateway,
    @Inject('CONFIG') private config: AppConfig,
  ) {}
}

// Optional dependency
@Injectable()
export class AnalyticsService {
  constructor(
    @Optional() @Inject('ANALYTICS_CLIENT')
    private analyticsClient?: AnalyticsClient,
  ) {}

  track(event: string) {
    if (this.analyticsClient) {
      this.analyticsClient.track(event);
    }
  }
}

// Self-referencing injection (for tree structures)
@Injectable()
export class CategoryService {
  constructor(
    @Inject(forwardRef(() => CategoryService))
    private categoryService: CategoryService,
  ) {}
}

// Circular dependency resolution
// user.service.ts
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}
}

// order.service.ts
@Injectable()
export class OrderService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}
}

// Module-level forwardRef
@Module({
  imports: [forwardRef(() => OrderModule)],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

// Custom injection token
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
  ],
})

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private userRepo: UserRepositoryInterface,
  ) {}
}

// Interface-based DI with custom decorators
// injection.tokens.ts
export const INJECTION_TOKENS = {
  UserRepository: Symbol('UserRepository'),
  PaymentGateway: Symbol('PaymentGateway'),
  CacheService: Symbol('CacheService'),
} as const;

// Custom decorator for cleaner injection
export const InjectUserRepository = () =>
  Inject(INJECTION_TOKENS.UserRepository);

// Usage
@Injectable()
export class UserService {
  constructor(
    @InjectUserRepository() private userRepo: IUserRepository,
  ) {}
}
```

### Q11: How do you implement the Repository Pattern with DI in NestJS?

**Answer:**

```typescript
// 1. Define repository interface
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options?: FindOptions): Promise<User[]>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
}

// 2. Implement repository
@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const entity = this.repository.create(data);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: UserEntity): User {
    return new User({
      id: entity.id,
      email: entity.email,
      name: entity.name,
    });
  }
}

// 3. In-memory implementation for testing
@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = new User({ id: uuid(), ...data });
    this.users.set(user.id, user);
    return user;
  }
  // ... other methods
}

// 4. Module configuration
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    UserService,
  ],
  exports: [UserService],
})
export class UserModule {}

// 5. Service using repository
@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }
}

// 6. Testing with mock repository
describe('UserService', () => {
  let service: UserService;
  let repository: IUserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY,
          useClass: InMemoryUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<IUserRepository>(USER_REPOSITORY);
  });

  it('should return user by id', async () => {
    const user = await repository.create({ email: 'test@test.com', name: 'Test' });
    const found = await service.getUserById(user.id);
    expect(found.email).toBe('test@test.com');
  });
});
```

---

## Guards

### Q12: What are Guards in NestJS? Provide examples of different guard implementations.

**Answer:**
Guards determine whether a request should be handled by the route handler. They're executed after middleware but before interceptors/pipes.

```typescript
// 1. Simple Auth Guard
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const user = await this.authService.validateToken(token);
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}

// 2. Role-based Guard with custom decorator
// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new UnauthorizedException();
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// Usage
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles(Role.ADMIN)
  getDashboard() {
    return { message: 'Admin Dashboard' };
  }

  @Get('reports')
  @Roles(Role.ADMIN, Role.MANAGER)
  getReports() {
    return { message: 'Reports' };
  }
}

// 3. Permission-based Guard (more granular)
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions = await this.permissionService.getUserPermissions(user.id);

    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}

// Usage
@Post('users')
@RequirePermissions(Permission.CREATE_USER)
createUser(@Body() dto: CreateUserDto) {}

// 4. Resource Ownership Guard
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());

    // Admin can access all
    if (user.roles.includes(Role.ADMIN)) {
      return true;
    }

    // Check ownership based on resource type
    const resource = request.resource; // Set by previous guard/middleware
    return resource?.userId === user.id;
  }
}

// 5. Throttle Guard (Rate Limiting)
@Injectable()
export class ThrottleGuard implements CanActivate {
  private store = new Map<string, { count: number; resetTime: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip;
    const limit = 100;
    const windowMs = 60000; // 1 minute

    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    record.count++;
    return true;
  }
}

// Global guard registration
// main.ts
app.useGlobalGuards(new AuthGuard());

// Or via module
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
```

---

## Interceptors

### Q13: What are Interceptors? Explain their use cases with examples.

**Answer:**
Interceptors can transform the result returned from a function, transform exceptions, extend basic function behavior, or completely override a function.

```typescript
// 1. Logging Interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logger.log(`← ${method} ${url} ${Date.now() - now}ms`);
        },
        error: (error) => {
          this.logger.error(`← ${method} ${url} ${Date.now() - now}ms - Error: ${error.message}`);
        },
      }),
    );
  }
}

// 2. Transform Response Interceptor
export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}

// Response: { success: true, data: {...}, timestamp: "...", path: "/users" }

// 3. Cache Interceptor
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const ttl = this.reflector.get<number>('cacheTTL', context.getHandler()) ?? 60;
    const cacheKey = this.generateKey(request);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return of(cached);
    }

    return next.handle().pipe(
      tap((data) => {
        this.cacheService.set(cacheKey, data, ttl);
      }),
    );
  }

  private generateKey(request: Request): string {
    return `${request.url}:${JSON.stringify(request.query)}`;
  }
}

// Usage with custom TTL
@Get('products')
@SetMetadata('cacheTTL', 300) // 5 minutes
findAll() {}

// 4. Timeout Interceptor
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeout: number = 5000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeout),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timeout');
        }
        return throwError(() => err);
      }),
    );
  }
}

// 5. Serialization Interceptor (exclude fields)
@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: ClassConstructor<any>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}

// Custom decorator
export function Serialize(dto: ClassConstructor<any>) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

// DTO
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  // password is not exposed
}

// Usage
@Get(':id')
@Serialize(UserResponseDto)
findOne(@Param('id') id: string) {
  return this.userService.findOne(id);
  // password will be stripped from response
}

// 6. Error Mapping Interceptor
@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof QueryFailedError) {
          if (err.message.includes('duplicate key')) {
            throw new ConflictException('Resource already exists');
          }
        }
        if (err instanceof EntityNotFoundError) {
          throw new NotFoundException('Resource not found');
        }
        return throwError(() => err);
      }),
    );
  }
}
```

---

## Pipes

### Q14: Explain Pipes and validation in NestJS.

**Answer:**
Pipes transform input data or validate it. They run before the route handler.

```typescript
// 1. Built-in Pipes
@Get(':id')
findOne(
  @Param('id', ParseIntPipe) id: number,       // Validates & transforms to int
  @Query('uuid', ParseUUIDPipe) uuid: string,   // Validates UUID format
  @Query('active', ParseBoolPipe) active: boolean,
  @Query('tags', ParseArrayPipe) tags: string[],
) {}

// With options
@Get(':id')
findOne(
  @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }))
  id: number,
) {}

// Optional validation
@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
) {}

// 2. Validation Pipe with class-validator
// create-user.dto.ts
export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsPostalCode('any')
  postalCode: string;
}

// Global validation pipe
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error for extra properties
    transform: true,           // Auto-transform to DTO type
    transformOptions: {
      enableImplicitConversion: true, // Convert primitives
    },
    exceptionFactory: (errors) => {
      const messages = errors.map(error => ({
        field: error.property,
        constraints: Object.values(error.constraints || {}),
      }));
      return new BadRequestException({ errors: messages });
    },
  }),
);

// 3. Custom Pipe
@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date format: ${value}`);
    }
    return date;
  }
}

// Usage
@Get('events')
findEvents(
  @Query('startDate', ParseDatePipe) startDate: Date,
  @Query('endDate', ParseDatePipe) endDate: Date,
) {}

// 4. File Validation Pipe
@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(
    private readonly allowedMimeTypes: string[],
    private readonly maxSize: number,
  ) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed`,
      );
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxSize / 1024 / 1024}MB limit`,
      );
    }

    return file;
  }
}

// Usage
@Post('upload')
uploadFile(
  @UploadedFile(
    new FileValidationPipe(['image/jpeg', 'image/png'], 5 * 1024 * 1024),
  )
  file: Express.Multer.File,
) {}

// 5. Custom validation with transform
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'object' && value !== null) {
      return this.trimObject(value);
    }
    return value;
  }

  private trimObject(obj: Record<string, any>): Record<string, any> {
    const trimmed: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      trimmed[key] = this.transform(value);
    }
    return trimmed;
  }
}
```

---

## Exception Filters

### Q15: How do you handle exceptions in NestJS?

**Answer:**

```typescript
// 1. Built-in Exception Classes
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Access denied');
throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');
throw new InternalServerErrorException('Something went wrong');
throw new HttpException('Custom message', HttpStatus.I_AM_A_TEAPOT);

// With details
throw new BadRequestException({
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Invalid email format' },
  ],
});

// 2. Custom Exception
export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

export class InsufficientBalanceException extends BusinessException {
  constructor(required: number, available: number) {
    super(
      'INSUFFICIENT_BALANCE',
      `Insufficient balance. Required: ${required}, Available: ${available}`,
    );
  }
}

// 3. Global Exception Filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message;
      code = (exceptionResponse as any).code || 'HTTP_EXCEPTION';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }
}

// 4. HTTP Exception Filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof exceptionResponse === 'object' ? exceptionResponse : { message: exceptionResponse }),
    });
  }
}

// 5. Database Exception Filter
@Catch(QueryFailedError, EntityNotFoundError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError | EntityNotFoundError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof EntityNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
      return;
    }

    if (exception instanceof QueryFailedError) {
      // Handle duplicate key error
      if (exception.message.includes('duplicate key')) {
        response.status(HttpStatus.CONFLICT).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Resource already exists',
          },
        });
        return;
      }
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
    });
  }
}

// Register filters
// main.ts
app.useGlobalFilters(
  new AllExceptionsFilter(),
  new HttpExceptionFilter(),
  new DatabaseExceptionFilter(),
);

// Or via module
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

---

## Middleware

### Q16: Explain middleware in NestJS with practical examples.

**Answer:**

```typescript
// 1. Function Middleware
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

// 2. Class Middleware
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const duration = Date.now() - startTime;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${duration}ms`,
      );
    });

    next();
  }
}

// 3. Applying middleware in module
@Module({
  imports: [UserModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // All routes

    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');

    consumer
      .apply(JsonBodyMiddleware, UrlencodedBodyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.POST });

    consumer
      .apply(AdminMiddleware)
      .forRoutes(AdminController);
  }
}

// 4. Correlation ID Middleware
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuid();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // Attach to request for use in services
    (req as any).correlationId = correlationId;
    next();
  }
}

// 5. Rate Limiting Middleware
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store = new Map<string, { count: number; resetTime: number }>();

  constructor(
    @Inject('RATE_LIMIT_OPTIONS')
    private options: { windowMs: number; max: number },
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip;
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.options.windowMs,
      });
      return next();
    }

    if (record.count >= this.options.max) {
      res.status(429).json({
        message: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  }
}

// 6. Security Headers Middleware
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
  }
}

// Middleware vs Guard vs Interceptor
// Middleware: Request/Response transformation, early exit, external library integration
// Guard: Authorization logic, access control
// Interceptor: Response transformation, logging, caching, exception mapping
```

---

## Custom Decorators

### Q17: How do you create custom decorators in NestJS?

**Answer:**

```typescript
// 1. Parameter Decorator - Extract user from request
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Usage
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

@Get('email')
getEmail(@CurrentUser('email') email: string) {
  return { email };
}

// 2. Combining decorators
export function Auth(...roles: Role[]) {
  return applyDecorators(
    UseGuards(AuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden' }),
  );
}

// Usage
@Get('admin')
@Auth(Role.ADMIN)
adminOnly() {}

// 3. Public route decorator
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// In AuthGuard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}

// Usage
@Public()
@Get('public-endpoint')
publicRoute() {}

// 4. Pagination decorator
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const Pagination = createParamDecorator(
  (data: { maxLimit?: number }, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const maxLimit = data?.maxLimit || 100;

    const page = Math.max(1, parseInt(request.query.page) || 1);
    const limit = Math.min(
      maxLimit,
      Math.max(1, parseInt(request.query.limit) || 10),
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  },
);

// Usage
@Get()
findAll(@Pagination({ maxLimit: 50 }) pagination: PaginationParams) {
  return this.service.findAll(pagination);
}

// 5. API Response decorator for Swagger
export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};

// Usage
@Get()
@ApiPaginatedResponse(UserDto)
findAll() {}

// 6. Custom validation decorator
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          return (
            value.length >= 8 &&
            /[A-Z]/.test(value) &&
            /[a-z]/.test(value) &&
            /[0-9]/.test(value) &&
            /[!@#$%^&*]/.test(value)
          );
        },
        defaultMessage() {
          return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
        },
      },
    });
  };
}

// Usage in DTO
export class CreateUserDto {
  @IsStrongPassword()
  password: string;
}

// 7. Cache key decorator
export const CacheKey = (key: string) => SetMetadata('cacheKey', key);
export const CacheTTL = (ttl: number) => SetMetadata('cacheTTL', ttl);

// Usage
@Get(':id')
@CacheKey('user')
@CacheTTL(300)
findOne(@Param('id') id: string) {}
```

---

## Microservices

### Q18: How do you implement microservices in NestJS?

**Answer:**

```typescript
// 1. Hybrid Application (HTTP + Microservice)
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect to message broker
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: 'localhost',
      port: 6379,
    },
  });

  // Or Kafka
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'user-service',
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'user-service-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}

// 2. Message Patterns (Request-Response)
@Controller()
export class UserController {
  @MessagePattern({ cmd: 'get_user' })
  async getUser(@Payload() data: { id: string }): Promise<User> {
    return this.userService.findById(data.id);
  }

  @MessagePattern('user.created')
  handleUserCreated(@Payload() data: CreateUserEvent) {
    return this.userService.processUserCreation(data);
  }
}

// Client sending message
@Injectable()
export class OrderService {
  constructor(
    @Inject('USER_SERVICE') private client: ClientProxy,
  ) {}

  async getUser(userId: string): Promise<User> {
    return this.client
      .send<User>({ cmd: 'get_user' }, { id: userId })
      .toPromise();
  }
}

// 3. Event Patterns (Fire-and-Forget)
@Controller()
export class NotificationController {
  @EventPattern('user.registered')
  handleUserRegistered(@Payload() data: UserRegisteredEvent) {
    // Send welcome email
    this.emailService.sendWelcomeEmail(data.email);
    // No response needed
  }

  @EventPattern('order.completed')
  async handleOrderCompleted(
    @Payload() data: OrderCompletedEvent,
    @Ctx() context: RedisContext,
  ) {
    const channel = context.getChannel();
    console.log(`Received from channel: ${channel}`);
    await this.notificationService.sendOrderConfirmation(data);
  }
}

// Client emitting event
@Injectable()
export class UserService {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private client: ClientProxy,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const user = await this.userRepository.create(data);

    // Emit event (fire-and-forget)
    this.client.emit('user.registered', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    return user;
  }
}

// 4. Client Module Registration
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
    // Or async registration
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get('KAFKA_CLIENT_ID'),
              brokers: configService.get('KAFKA_BROKERS').split(','),
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
})
export class AppModule {}

// 5. Error Handling in Microservices
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToRpc();

    // Log error
    console.error('Microservice error:', exception);

    // Transform to RpcException
    if (exception instanceof HttpException) {
      throw new RpcException({
        status: exception.getStatus(),
        message: exception.message,
      });
    }

    throw new RpcException({
      status: 500,
      message: exception.message || 'Internal error',
    });
  }
}

// 6. Saga Pattern Implementation
@Injectable()
export class OrderSaga {
  constructor(
    @Inject('PAYMENT_SERVICE') private paymentClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private inventoryClient: ClientProxy,
    @Inject('SHIPPING_SERVICE') private shippingClient: ClientProxy,
  ) {}

  async processOrder(order: Order): Promise<void> {
    const sagaLog: SagaStep[] = [];

    try {
      // Step 1: Reserve inventory
      await this.inventoryClient
        .send('inventory.reserve', { orderId: order.id, items: order.items })
        .toPromise();
      sagaLog.push({ step: 'inventory', status: 'completed' });

      // Step 2: Process payment
      await this.paymentClient
        .send('payment.process', { orderId: order.id, amount: order.total })
        .toPromise();
      sagaLog.push({ step: 'payment', status: 'completed' });

      // Step 3: Create shipment
      await this.shippingClient
        .send('shipping.create', { orderId: order.id, address: order.address })
        .toPromise();
      sagaLog.push({ step: 'shipping', status: 'completed' });

    } catch (error) {
      // Compensate in reverse order
      await this.compensate(sagaLog, order.id);
      throw error;
    }
  }

  private async compensate(sagaLog: SagaStep[], orderId: string): Promise<void> {
    for (const step of sagaLog.reverse()) {
      if (step.status === 'completed') {
        switch (step.step) {
          case 'shipping':
            await this.shippingClient.send('shipping.cancel', { orderId }).toPromise();
            break;
          case 'payment':
            await this.paymentClient.send('payment.refund', { orderId }).toPromise();
            break;
          case 'inventory':
            await this.inventoryClient.send('inventory.release', { orderId }).toPromise();
            break;
        }
      }
    }
  }
}
```

---

## Testing

### Q19: How do you test NestJS applications?

**Answer:**

```typescript
// 1. Unit Testing Service
describe('UserService', () => {
  let service: UserService;
  let repository: MockType<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('findById', () => {
    it('should return a user', async () => {
      const user = { id: '1', name: 'John', email: 'john@test.com' };
      repository.findOne.mockReturnValue(user);

      const result = await service.findById('1');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findOne.mockReturnValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = { name: 'John', email: 'john@test.com', password: 'pass123' };
      const createdUser = { id: '1', ...dto };

      repository.create.mockReturnValue(createdUser);
      repository.save.mockReturnValue(createdUser);

      const result = await service.create(dto);

      expect(result).toEqual(createdUser);
      expect(repository.save).toHaveBeenCalled();
    });
  });
});

// Mock factory
export const repositoryMockFactory: () => MockType<Repository<any>> = jest.fn(() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

// 2. Integration Testing Controller
describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserService)
      .useValue({
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue({ id: '1', name: 'Test' }),
        create: jest.fn().mockImplementation((dto) => ({ id: '1', ...dto })),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should return array of users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect([]);
    });
  });

  describe('/users (POST)', () => {
    it('should create a user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'john@test.com', password: 'Password123!' })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('John');
          expect(res.body.email).toBe('john@test.com');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'invalid', password: 'Password123!' })
        .expect(400);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return a user', () => {
      return request(app.getHttpServer())
        .get('/users/1')
        .expect(200)
        .expect({ id: '1', name: 'Test' });
    });
  });
});

// 3. Testing Guards
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockExecutionContext({
      user: { roles: [Role.ADMIN] },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockExecutionContext({
      user: { roles: [Role.USER] },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

function createMockExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

// 4. Testing Interceptors
describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should transform response', (done) => {
    const mockData = { id: 1, name: 'Test' };
    const mockCallHandler: CallHandler = {
      handle: () => of(mockData),
    };

    const context = createMockExecutionContext({ url: '/test' });

    interceptor.intercept(context, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: mockData,
        timestamp: expect.any(String),
        path: '/test',
      });
      done();
    });
  });
});

// 5. Testing with Database (TypeORM)
describe('UserService (Integration)', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  beforeEach(async () => {
    await repository.clear();
  });

  it('should create and retrieve user', async () => {
    const created = await service.create({
      name: 'John',
      email: 'john@test.com',
      password: 'password',
    });

    const found = await service.findById(created.id);
    expect(found.email).toBe('john@test.com');
  });
});
```

---

## Best Practices

### Q20: What are NestJS best practices and common patterns?

**Answer:**

```typescript
// 1. Use DTOs for validation and documentation
export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  readonly email: string;

  @ApiProperty({ minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50)
  readonly name: string;
}

// 2. Use entities/domain models separate from DTOs
// user.entity.ts (database model)
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string; // Hashed

  @CreateDateColumn()
  createdAt: Date;
}

// 3. Use mapper pattern
@Injectable()
export class UserMapper {
  toDto(entity: User): UserDto {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      // password excluded
    };
  }

  toEntity(dto: CreateUserDto): Partial<User> {
    return {
      email: dto.email,
      name: dto.name,
    };
  }
}

// 4. Configuration management
// config/database.config.ts
export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
}));

// Usage with validation
@Injectable()
export class DatabaseConfigService {
  constructor(private configService: ConfigService) {}

  get host(): string {
    return this.configService.get<string>('database.host');
  }

  get port(): number {
    return this.configService.get<number>('database.port');
  }
}

// 5. Error handling - centralized and consistent
// errors/app.error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

// 6. Use custom repositories for complex queries
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findActiveUsers(pagination: PaginationDto): Promise<[User[], number]> {
    return this.repository.findAndCount({
      where: { isActive: true },
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findWithOrders(userId: string): Promise<User> {
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.orders', 'orders')
      .where('user.id = :userId', { userId })
      .andWhere('orders.status != :status', { status: OrderStatus.CANCELLED })
      .getOne();
  }
}

// 7. Use health checks
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}

// 8. Graceful shutdown
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const server = await app.listen(3000);

  // Handle shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.log('Server closed');
      process.exit(0);
    });
  });
}

// 9. API versioning structure
// src/
//   modules/
//     users/
//       v1/
//         users.controller.v1.ts
//         dto/
//       v2/
//         users.controller.v2.ts
//         dto/
//       users.service.ts (shared)
//       users.module.ts

// 10. Security best practices
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  });

  // Security headers
  app.use(helmet());

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }));

  // Body size limit
  app.use(express.json({ limit: '10kb' }));

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(3000);
}
```

---

## Q15: Caching Strategies with Redis in NestJS

**Q: How do you implement caching in a NestJS application?**

**A:**

### NestJS Cache Manager
```typescript
// Install: npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: { host: 'localhost', port: 6379 },
          ttl: 60000, // 60 seconds default TTL
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

### Controller-Level Caching (Simple)
```typescript
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor) // Auto-cache all GET endpoints
export class ProductsController {
  @Get()
  @CacheTTL(30000) // 30 seconds
  findAll() {
    return this.productService.findAll(); // Cached automatically
  }

  @Get(':id')
  @CacheKey('product') // Custom cache key prefix
  @CacheTTL(60000) // 60 seconds
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }
}
```

### Service-Level Caching (More Control)
```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ProductService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private productRepo: ProductRepository,
  ) {}

  async findById(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    // Check cache first
    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) return cached;

    // Cache miss → fetch from DB
    const product = await this.productRepo.findOne(id);
    if (product) {
      await this.cache.set(cacheKey, product, 60000); // Cache for 60s
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.update(id, dto);

    // Invalidate cache on write
    await this.cache.del(`product:${id}`);
    await this.cache.del('products:list'); // Invalidate list cache too

    return product;
  }
}
```

### Cache Invalidation Patterns
```
1. TTL-based: Set expiry, accept stale data within TTL
   → Best for: Product catalogs, configuration data

2. Write-through: Update cache on every write
   → Best for: User profiles, frequently read data

3. Write-behind: Queue cache updates, write to DB async
   → Best for: Analytics counters, non-critical data

4. Cache-aside (Lazy loading): Read → miss → fetch → cache
   → Best for: Most use cases (shown above)

5. Event-based invalidation: Listen for change events
   → Best for: Microservices (Service A publishes "ProductUpdated", Service B invalidates its cache)
```

### Multi-Tier Caching
```typescript
// In-memory (fastest) → Redis (shared) → Database (slowest)
@Injectable()
export class MultiTierCacheService {
  private localCache = new Map<string, { data: any; expiry: number }>();

  constructor(@Inject(CACHE_MANAGER) private redis: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    // Tier 1: In-memory (same process)
    const local = this.localCache.get(key);
    if (local && local.expiry > Date.now()) return local.data;

    // Tier 2: Redis (shared across instances)
    const cached = await this.redis.get<T>(key);
    if (cached) {
      this.localCache.set(key, { data: cached, expiry: Date.now() + 5000 }); // 5s local
      return cached;
    }

    return null; // Cache miss → caller fetches from DB
  }
}
```

**Interview Tip:** "I use cache-aside as the default pattern. For invalidation, I prefer event-based invalidation in microservices — when the product service updates a product, it emits 'ProductUpdated', and any service caching that product invalidates its cache. At Banglalink, we used Redis with TTL-based caching for frequently accessed subscriber data."

---

## Q16: Configuration & Environment Validation

**Q: How do you manage configuration in NestJS production apps?**

**A:**

### Config Module with Validation
```typescript
// Install: npm install @nestjs/config joi

// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
});

// config/validation.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(), // Minimum 32 chars
  REDIS_HOST: Joi.string().default('localhost'),
});

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: true }, // Fail fast on first error
    }),
  ],
})
export class AppModule {}

// If JWT_SECRET is missing → app crashes at startup with clear error message
// This is intentional: fail fast, don't run with missing config
```

### Typed Config Service
```typescript
@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  get host(): string {
    return this.configService.get<string>('database.host');
  }

  get port(): number {
    return this.configService.get<number>('database.port');
  }

  get connectionString(): string {
    const { host, port } = this;
    const name = this.configService.get('database.name');
    const user = this.configService.get('database.username');
    const pass = this.configService.get('database.password');
    return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  }
}
```

**Interview Tip:** "I always validate environment variables at startup with Joi or Zod. It's better to crash immediately with a clear 'JWT_SECRET is required' error than to discover it's missing when the first user tries to log in."

---

## Q17: Circular Dependencies in NestJS

**Q: How do you handle circular dependencies in NestJS?**

**A:**

### The Problem
```typescript
// ServiceA depends on ServiceB
@Injectable()
export class ServiceA {
  constructor(private serviceB: ServiceB) {} // ServiceB not yet defined
}

// ServiceB depends on ServiceA
@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {} // Circular!
}
// NestJS throws: "A circular dependency has been detected"
```

### Solution 1: forwardRef()
```typescript
@Injectable()
export class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB))
    private serviceB: ServiceB,
  ) {}
}

@Injectable()
export class ServiceB {
  constructor(
    @Inject(forwardRef(() => ServiceA))
    private serviceA: ServiceA,
  ) {}
}

// For modules too:
@Module({
  imports: [forwardRef(() => ModuleB)],
})
export class ModuleA {}
```

### Solution 2: Refactor to Remove Circular Dependency (Better)
```typescript
// Extract shared logic into a third service
@Injectable()
export class SharedService {
  // Methods that both ServiceA and ServiceB need
}

@Injectable()
export class ServiceA {
  constructor(private shared: SharedService) {}
}

@Injectable()
export class ServiceB {
  constructor(private shared: SharedService) {}
}
// No circular dependency!
```

### Solution 3: Event-Based Decoupling (Best for Complex Cases)
```typescript
// Instead of direct dependency, communicate via events
@Injectable()
export class OrderService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.orderRepo.save(dto);
    // Don't call PaymentService directly — emit event
    this.eventEmitter.emit('order.created', order);
    return order;
  }
}

@Injectable()
export class PaymentService {
  @OnEvent('order.created')
  handleOrderCreated(order: Order) {
    // Process payment without depending on OrderService
    this.processPayment(order);
  }
}
```

**Interview Tip:** "forwardRef is a quick fix, but it's a code smell. If I see circular dependencies, I refactor: either extract shared logic into a new service, or use events to decouple the modules. Circular dependencies usually mean the module boundaries are wrong."

---

## Q18: NestJS Database Transactions

**Q: How do you handle database transactions across multiple operations in NestJS?**

**A:**

### TypeORM Transactions
```typescript
@Injectable()
export class OrderService {
  constructor(
    private dataSource: DataSource,
    private orderRepo: Repository<Order>,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Use QueryRunner for manual transaction control
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create order
      const order = queryRunner.manager.create(Order, {
        userId: dto.userId,
        total: dto.total,
      });
      await queryRunner.manager.save(order);

      // 2. Create order items
      const items = dto.items.map(item =>
        queryRunner.manager.create(OrderItem, { ...item, orderId: order.id })
      );
      await queryRunner.manager.save(items);

      // 3. Deduct inventory
      for (const item of dto.items) {
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(Product)
          .set({ stock: () => `stock - ${item.quantity}` })
          .where('id = :id AND stock >= :qty', { id: item.productId, qty: item.quantity })
          .execute();

        if (result.affected === 0) {
          throw new BadRequestException(`Product ${item.productId} out of stock`);
        }
      }

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### Prisma Transactions
```typescript
@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async transferFunds(fromId: string, toId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      // All operations use `tx` instead of `this.prisma`
      const sender = await tx.account.update({
        where: { id: fromId },
        data: { balance: { decrement: amount } },
      });

      if (sender.balance < 0) {
        throw new BadRequestException('Insufficient funds');
        // Transaction automatically rolls back on throw
      }

      await tx.account.update({
        where: { id: toId },
        data: { balance: { increment: amount } },
      });

      // Create audit log within same transaction
      await tx.transactionLog.create({
        data: { fromId, toId, amount, type: 'TRANSFER' },
      });
    });
  }
}
```

### Transaction Isolation Levels
```typescript
// Prisma
await prisma.$transaction(callback, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
});

// TypeORM
await queryRunner.startTransaction('SERIALIZABLE');
```

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|-------|-----------|-------------------|--------------|----------|
| READ UNCOMMITTED | Yes | Yes | Yes | Never use |
| READ COMMITTED | No | Yes | Yes | Default (PostgreSQL) |
| REPEATABLE READ | No | No | Yes | Default (MySQL) |
| SERIALIZABLE | No | No | No | Financial transactions |

**Interview Tip:** "For financial operations like the Daraz voucher system, I use SERIALIZABLE isolation to prevent race conditions. For most CRUD operations, READ COMMITTED is sufficient. The key is knowing the trade-off: higher isolation = more locks = lower throughput."

---

## Q19: NestJS Task Scheduling & Queue Processing

**Q: How do you handle background tasks and scheduled jobs in NestJS?**

**A:**

### Cron Jobs with @nestjs/schedule
```typescript
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class TaskService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens() {
    const deleted = await this.tokenRepo.deleteExpired();
    this.logger.log(`Cleaned up ${deleted} expired tokens`);
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async syncInventory() {
    await this.inventoryService.syncWithWarehouse();
  }

  // Dynamic cron job (can be created/deleted at runtime)
  addDynamicJob(name: string, cronExpression: string, callback: () => void) {
    const job = new CronJob(cronExpression, callback);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }
}
```

### Queue Processing with Bull
```typescript
import { BullModule, Process, Processor, InjectQueue } from '@nestjs/bull';

// Module setup
@Module({
  imports: [
    BullModule.forRoot({ redis: { host: 'localhost', port: 6379 } }),
    BullModule.registerQueue({ name: 'email' }),
  ],
})

// Producer: Add jobs to queue
@Injectable()
export class NotificationService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string) {
    await this.emailQueue.add('welcome', { userId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,  // Keep last 100 completed jobs
      removeOnFail: 200,      // Keep last 200 failed jobs
    });
  }

  async sendBulkEmails(userIds: string[]) {
    const jobs = userIds.map(userId => ({
      name: 'marketing',
      data: { userId },
      opts: { delay: Math.random() * 60000 }, // Spread over 1 minute
    }));
    await this.emailQueue.addBulk(jobs);
  }
}

// Consumer: Process jobs
@Processor('email')
export class EmailProcessor {
  @Process('welcome')
  async handleWelcome(job: Job<{ userId: string }>) {
    const user = await this.userService.findById(job.data.userId);
    await this.emailService.send({
      to: user.email,
      template: 'welcome',
      data: { name: user.name },
    });
  }

  @Process('marketing')
  async handleMarketing(job: Job) {
    // Process marketing email
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
    // Alert if final attempt
    if (job.attemptsMade >= job.opts.attempts) {
      this.alertService.notify(`Email job permanently failed: ${job.id}`);
    }
  }
}
```

### Cron vs Queue Decision
| Use Case | Cron | Queue |
|----------|------|-------|
| Run at specific times | ✅ | ❌ |
| Background job triggered by event | ❌ | ✅ |
| Needs retry on failure | ❌ | ✅ |
| Distributed across workers | ❌ | ✅ |
| Rate limiting / concurrency control | ❌ | ✅ |
| Cleanup/maintenance tasks | ✅ | ❌ |

**Interview Tip:** "At Banglalink, we used Bull queues for sending notifications to 41M users — we could control concurrency (max 1000 parallel), retry failures, and distribute across multiple worker pods. Cron jobs handled cleanup tasks like purging expired tokens nightly."

---

## Quick Reference Table

| Component | Purpose | Execution Order |
|-----------|---------|-----------------|
| Middleware | Request transformation | 1st |
| Guards | Authorization | 2nd |
| Interceptors (before) | Pre-processing | 3rd |
| Pipes | Validation/transformation | 4th |
| Controller | Business logic | 5th |
| Interceptors (after) | Post-processing | 6th |
| Exception Filters | Error handling | On error |

| Scope | Instance Creation |
|-------|-------------------|
| DEFAULT | Singleton (once) |
| REQUEST | Per request |
| TRANSIENT | Per injection |

| Provider Type | Use Case |
|--------------|----------|
| useClass | Class instance |
| useValue | Static value |
| useFactory | Dynamic creation |
| useExisting | Alias |
