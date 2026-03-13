# Security & Compliance — Interview Preparation Guide

> **Target Role:** Senior/Lead Backend Engineer
> **Stack Context:** Node.js, NestJS, TypeScript, AWS, PostgreSQL, Prisma
> **Scope:** Application security, authentication, secrets management, GDPR, SOC 2, Bangladesh regulations, supply chain security, infrastructure security, CI/CD security, data protection patterns

---

## Q1: Application Security Fundamentals

### Interview Question
> "Walk me through the OWASP Top 10 and how you mitigate each in a Node.js/NestJS backend."

### Answer

The OWASP Top 10 (2021 edition) is the industry-standard classification of the most critical web application security risks. Here is each risk with Node.js/NestJS-specific mitigations:

#### 1. A01:2021 — Broken Access Control

The most common vulnerability. Users act outside their intended permissions.

**Mitigations:**
- Role-based guards in NestJS
- Attribute-Based Access Control (ABAC) for fine-grained checks
- Ownership checks — users can only access their own resources
- Deny by default — every endpoint requires explicit permission

```typescript
// NestJS Role Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Ownership check in service layer
async getOrder(orderId: string, userId: string): Promise<Order> {
  const order = await this.prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  if (order.userId !== userId) {
    throw new ForbiddenException('You do not own this resource');
  }

  return order;
}
```

#### 2. A02:2021 — Cryptographic Failures

Exposing sensitive data due to weak or missing encryption.

**Mitigations:**
- Use bcrypt (cost factor 12+) or argon2 for password hashing — never MD5 or SHA for passwords
- Enforce TLS everywhere — redirect HTTP to HTTPS
- Never store secrets in source code or environment variables baked into Docker images
- Encrypt PII at rest using AES-256 or AWS KMS
- Use strong random generators (`crypto.randomBytes`, not `Math.random`)

#### 3. A03:2021 — Injection

SQL injection, NoSQL injection, OS command injection.

**Mitigations:**
- Use parameterized queries — Prisma and TypeORM do this by default
- Input validation with `class-validator` and `class-transformer`
- Never concatenate user input into queries or shell commands

```typescript
// class-validator DTO — input never reaches the query layer raw
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Invalid name characters' })
  name: string;
}
```

#### 4. A04:2021 — Insecure Design

Flaws in the design itself, not just implementation bugs.

**Mitigations:**
- Threat modeling during design phase (STRIDE methodology)
- Define security requirements alongside functional requirements
- Rate limit sensitive operations (login, password reset, OTP verification)
- Business logic abuse prevention — e.g., prevent coupon reuse, enforce quantity limits

#### 5. A05:2021 — Security Misconfiguration

Default configs, open cloud storage, verbose error messages.

**Mitigations:**
- Use `helmet.js` for security headers
- Disable `X-Powered-By` header
- Configure CORS strictly — never use `origin: '*'` in production
- Validate environment variables at startup
- Disable debug/stack traces in production

```typescript
// main.ts — NestJS security bootstrap
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS — explicit allowlist
  app.enableCors({
    origin: [
      'https://app.example.com',
      'https://admin.example.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Global validation — strips unknown properties, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Rate limiting (using @nestjs/throttler)
  // Configured in AppModule — see ThrottlerModule

  await app.listen(process.env.PORT || 3000);
}
```

#### 6. A06:2021 — Vulnerable and Outdated Components

Using libraries with known vulnerabilities.

**Mitigations:**
- Run `npm audit` in CI — fail on critical/high
- Enable Dependabot or Snyk for automated PRs
- Always commit `package-lock.json` / `yarn.lock`
- Review changelogs before major version bumps

#### 7. A07:2021 — Identification and Authentication Failures

Weak passwords, missing MFA, session fixation.

**Mitigations:**
- Enforce password complexity and length (12+ chars recommended)
- Implement MFA (TOTP via Google Authenticator / Authy)
- Short-lived JWT access tokens (15 min) with refresh token rotation
- Account lockout after repeated failed attempts (with exponential backoff)
- Invalidate sessions on password change

#### 8. A08:2021 — Software and Data Integrity Failures

Unverified updates, insecure CI/CD pipelines, unsigned artifacts.

**Mitigations:**
- Verify integrity of dependencies (lock files, checksum verification)
- Secure CI/CD pipelines — signed commits, protected branches, OIDC
- Use Subresource Integrity (SRI) for frontend CDN resources
- Sign Docker images with Docker Content Trust or cosign

#### 9. A09:2021 — Security Logging and Monitoring Failures

Not detecting breaches because there is no logging or alerting.

**Mitigations:**
- Structured logging with correlation IDs (Winston/Pino)
- Log authentication events: login, logout, failed attempts, password changes
- Log authorization failures — they may indicate probing
- Alert on anomalies: spike in 401/403 responses, unusual data exports
- Ship logs to centralized system (CloudWatch, ELK, Datadog)

#### 10. A10:2021 — Server-Side Request Forgery (SSRF)

Tricking the server into making requests to internal resources.

**Mitigations:**
- Validate and sanitize all URLs from user input
- Allowlist external services the backend is permitted to call
- Disable HTTP redirects in outbound requests
- Block requests to private IP ranges (10.x, 172.16.x, 192.168.x, 169.254.x)
- Use network-level controls (security groups) to limit egress

---

## Q2: Authentication & Authorization Deep Dive

### Interview Question
> "Design the authentication and authorization system for a multi-tenant SaaS platform. Discuss JWT best practices, OAuth2 flows, and when to use RBAC vs ABAC."

### Answer

#### Authentication Methods Comparison

| Method | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Session-based** | Traditional web apps | Simple, easy revocation | Stateful, harder to scale |
| **JWT** | SPAs, microservices | Stateless, scalable | Hard to revoke, payload size |
| **OAuth2** | Third-party integration | Standard, delegated auth | Complex flows |
| **API Keys** | Server-to-server, external devs | Simple | No user context, hard to rotate |
| **mTLS** | Service mesh, zero-trust | Very strong mutual auth | Complex certificate management |

#### JWT Best Practices

```typescript
// JWT Configuration — NestJS
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '15m',     // Short-lived access token
          issuer: 'api.example.com',
          audience: 'example.com',
          algorithm: 'HS256',   // Or RS256 for asymmetric
        },
      }),
    }),
  ],
})
export class AuthModule {}
```

**Key rules:**
- Access tokens: 15 minutes TTL — short enough that revocation is rarely needed
- Refresh tokens: 7 days TTL, stored in HttpOnly, Secure, SameSite=Strict cookie (never localStorage)
- Rotate refresh tokens on every use — issue a new refresh token when the old one is consumed
- Include only essential claims: `sub`, `email`, `roles`, `tenantId` — keep payload small
- Revocation strategy: maintain a Redis blacklist of revoked token JTIs, checked by auth middleware

```typescript
// Token service with refresh rotation
@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async generateTokenPair(user: User, tenantId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      tenantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshTokenId = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: refreshTokenId, type: 'refresh' },
      { expiresIn: '7d', secret: this.config.get('JWT_REFRESH_SECRET') },
    );

    // Store refresh token reference for rotation/revocation
    await this.redis.set(
      `refresh:${refreshTokenId}`,
      user.id,
      'EX',
      7 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(oldRefreshToken: string) {
    const decoded = this.jwtService.verify(oldRefreshToken, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });

    // Check if refresh token was already used (rotation detection)
    const stored = await this.redis.get(`refresh:${decoded.jti}`);
    if (!stored) {
      // Token reuse detected — potential theft. Revoke ALL user sessions.
      await this.revokeAllUserSessions(decoded.sub);
      throw new UnauthorizedException('Token reuse detected');
    }

    // Invalidate old refresh token
    await this.redis.del(`refresh:${decoded.jti}`);

    // Issue new pair
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: decoded.sub },
    });
    return this.generateTokenPair(user, decoded.tenantId);
  }

  async revokeAccessToken(jti: string, expiresIn: number) {
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', expiresIn);
  }
}
```

#### OAuth2 Flows

| Flow | Use Case | Notes |
|------|----------|-------|
| **Authorization Code** | Server-side web apps | Most secure, server exchanges code for token |
| **Authorization Code + PKCE** | SPAs, mobile apps | Prevents code interception, no client secret needed |
| **Client Credentials** | Machine-to-machine | No user context, service accounts |
| **Device Code** | Smart TVs, CLI tools | User authorizes on another device |

**Never use Implicit flow** — it is deprecated in OAuth 2.1.

#### RBAC Implementation

```typescript
// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// permissions.enum.ts
export enum Permission {
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  MANAGE_BILLING = 'manage:billing',
  VIEW_ANALYTICS = 'view:analytics',
}

// role-permission mapping
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),                     // everything
  [Role.MANAGER]: [
    Permission.CREATE_USER, Permission.READ_USER,
    Permission.UPDATE_USER, Permission.VIEW_ANALYTICS,
  ],
  [Role.MEMBER]: [Permission.READ_USER],
  [Role.VIEWER]: [Permission.READ_USER, Permission.VIEW_ANALYTICS],
};

// permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions = user.roles.flatMap(
      (role: Role) => RolePermissions[role] || [],
    );

    return requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );
  }
}

// Usage in controller
@Post()
@Permissions(Permission.CREATE_USER)
async createUser(@Body() dto: CreateUserDto) { ... }
```

#### ABAC with CASL

ABAC is needed when RBAC is too coarse-grained — e.g., "a user can edit only their own posts" or "a manager can view only their department's reports."

```typescript
// casl-ability.factory.ts
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility,
    );

    if (user.roles.includes(Role.ADMIN)) {
      can('manage', 'all'); // admin can do everything
    } else {
      // Users can read and update their own profile
      can('read', 'User', { id: user.id });
      can('update', 'User', { id: user.id });

      // Users can manage their own posts
      can('read', 'Post');
      can('create', 'Post');
      can('update', 'Post', { authorId: user.id });
      can('delete', 'Post', { authorId: user.id });

      // Managers can view reports in their department
      if (user.roles.includes(Role.MANAGER)) {
        can('read', 'Report', { departmentId: user.departmentId });
      }

      // Nobody can delete admin users
      cannot('delete', 'User', { roles: { $in: [Role.ADMIN] } });
    }

    return build();
  }
}

// Usage in service
async updatePost(postId: string, dto: UpdatePostDto, user: AuthenticatedUser) {
  const post = await this.prisma.post.findUniqueOrThrow({
    where: { id: postId },
  });

  const ability = this.caslAbilityFactory.createForUser(user);

  if (!ability.can('update', subject('Post', post))) {
    throw new ForbiddenException('Cannot update this post');
  }

  return this.prisma.post.update({ where: { id: postId }, data: dto });
}
```

#### Multi-Tenancy Authentication

```typescript
// JWT payload includes tenantId
interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  tenantId: string;    // Tenant isolation at the token level
}

// Tenant isolation middleware — every DB query scoped to tenant
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as AuthenticatedUser;
    if (user?.tenantId) {
      // Attach tenant context for Prisma middleware
      req['tenantId'] = user.tenantId;
    }
    next();
  }
}

// Prisma middleware for automatic tenant scoping
prisma.$use(async (params, next) => {
  const tenantId = cls.get('tenantId');

  if (tenantId && TENANT_SCOPED_MODELS.includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, tenantId };
    }
    if (params.action === 'create') {
      params.args.data = { ...params.args.data, tenantId };
    }
  }

  return next(params);
});
```

#### API Key Management

```typescript
@Injectable()
export class ApiKeyService {
  async generateApiKey(userId: string, name: string, scopes: string[]) {
    const rawKey = `sk_live_${randomBytes(32).toString('hex')}`;

    // Store ONLY the hash — never store the raw key
    const hashedKey = await argon2.hash(rawKey);
    const prefix = rawKey.substring(0, 12); // for identification

    await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        prefix,
        hashedKey,
        scopes,
        expiresAt: addMonths(new Date(), 6),
      },
    });

    // Return raw key ONCE — user must save it
    return { key: rawKey, prefix, expiresAt: addMonths(new Date(), 6) };
  }

  async validateApiKey(rawKey: string): Promise<ApiKeyPayload | null> {
    const prefix = rawKey.substring(0, 12);

    const apiKeys = await this.prisma.apiKey.findMany({
      where: { prefix, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    for (const apiKey of apiKeys) {
      if (await argon2.verify(apiKey.hashedKey, rawKey)) {
        // Update last used timestamp
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });
        return { userId: apiKey.userId, scopes: apiKey.scopes };
      }
    }

    return null;
  }
}
```

---

## Q3: Secrets Management

### Interview Question
> "How do you manage secrets in a production environment? Compare AWS Secrets Manager, Parameter Store, and HashiCorp Vault."

### Answer

#### Where Secrets Should Never Live

| Location | Risk |
|----------|------|
| Source code | Committed to git, visible to all developers |
| `.env` files in Docker images | Baked into image layers, extractable |
| Environment variables in Dockerfiles | Visible in `docker history` |
| Config files in repos | Same risk as source code |
| Slack/email | Searchable, logged, no access control |

#### AWS Secrets Manager

**Best for:** Database credentials, API keys, anything that needs automatic rotation.

```typescript
// NestJS Config Module loading from Secrets Manager
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        async () => {
          const client = new SecretsManagerClient({
            region: 'ap-southeast-1',
          });

          const dbSecret = await client.send(
            new GetSecretValueCommand({
              SecretId: 'prod/myapp/database',
            }),
          );

          const apiSecret = await client.send(
            new GetSecretValueCommand({
              SecretId: 'prod/myapp/api-keys',
            }),
          );

          const db = JSON.parse(dbSecret.SecretString);
          const api = JSON.parse(apiSecret.SecretString);

          return {
            database: {
              host: db.host,
              port: db.port,
              username: db.username,
              password: db.password,
              name: db.dbname,
            },
            jwt: {
              accessSecret: api.jwtAccessSecret,
              refreshSecret: api.jwtRefreshSecret,
            },
            stripe: {
              secretKey: api.stripeSecretKey,
            },
          };
        },
      ],
    }),
  ],
})
export class AppModule {}
```

**Features:**
- Automatic rotation for RDS, Redshift, DocumentDB with Lambda rotation functions
- Cross-account access via resource policies
- Versioning — roll back to previous secret values
- Cost: $0.40 per secret per month + $0.05 per 10,000 API calls

#### AWS Systems Manager Parameter Store

**Best for:** Non-rotating configuration values, feature flags, simple key-value config.

| Feature | Standard | Advanced |
|---------|----------|----------|
| **Cost** | Free | $0.05/parameter/month |
| **Max parameters** | 10,000 | 100,000 |
| **Max value size** | 4 KB | 8 KB |
| **Policies** | No | TTL, expiration notifications |
| **Throughput** | 40 TPS | 1,000 TPS |

```typescript
// Loading config from Parameter Store
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

async function loadParameterStoreConfig(prefix: string) {
  const client = new SSMClient({ region: 'ap-southeast-1' });
  const params: Record<string, string> = {};

  let nextToken: string | undefined;

  do {
    const response = await client.send(
      new GetParametersByPathCommand({
        Path: prefix,
        Recursive: true,
        WithDecryption: true, // Decrypt SecureString parameters
        NextToken: nextToken,
      }),
    );

    for (const param of response.Parameters || []) {
      const key = param.Name!.replace(prefix, '').replace(/\//g, '_');
      params[key] = param.Value!;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return params;
}

// Usage: loadParameterStoreConfig('/prod/myapp/')
// /prod/myapp/database/host → database_host
// /prod/myapp/feature/new_ui → feature_new_ui
```

Use `SecureString` type for sensitive values — encrypted with KMS at rest.

#### HashiCorp Vault

**Best for:** Multi-cloud environments, dynamic database credentials, complex rotation policies, advanced use cases.

**Key features:**
- Dynamic secrets: generates short-lived database credentials on demand
- Leases and automatic revocation
- Transit secrets engine: encrypt/decrypt without exposing keys
- PKI engine: issue and manage TLS certificates
- Policy-based access control

**When to choose Vault over AWS-native:**
- Multi-cloud or hybrid infrastructure
- Need dynamic secrets with automatic lease expiration
- Need transit encryption (encrypt data without accessing the key)
- Complex organizational policies across teams

#### Comparison Table

| Feature | Secrets Manager | Parameter Store | HashiCorp Vault |
|---------|----------------|-----------------|-----------------|
| **Auto rotation** | Yes (built-in) | No | Yes (dynamic secrets) |
| **Cost** | $0.40/secret/mo | Free (standard) | Self-hosted or cloud |
| **Dynamic secrets** | No | No | Yes |
| **Multi-cloud** | AWS only | AWS only | Any cloud |
| **Complexity** | Low | Very low | High |
| **Encryption** | KMS | KMS (SecureString) | Built-in |
| **Best for** | DB creds, API keys | Config, flags | Enterprise multi-cloud |

#### CI/CD Secrets — No Long-Lived Credentials

```yaml
# GitHub Actions — use OIDC to assume AWS role (no stored access keys)
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: ap-southeast-1
          # No access keys stored in GitHub secrets!

      - name: Deploy
        run: |
          aws ecs update-service --cluster prod --service api --force-new-deployment
```

---

## Q4: GDPR Compliance (For International/Remote Roles)

### Interview Question
> "Your SaaS product serves EU customers. How do you ensure GDPR compliance from a backend engineering perspective?"

### Answer

#### What GDPR Is

The General Data Protection Regulation is an EU regulation that governs how organizations collect, process, and store personal data of EU residents. It applies to any company processing EU residents' data, regardless of where the company is based.

**Fines:** Up to 4% of global annual revenue or 20 million EUR, whichever is higher. Major fines include Amazon (746M EUR), WhatsApp (225M EUR), Meta (1.2B EUR).

#### Six Principles of GDPR

1. **Lawfulness, fairness, transparency** — Have a legal basis for processing (consent, contract, legitimate interest)
2. **Purpose limitation** — Collect data only for specified, explicit purposes
3. **Data minimization** — Collect only what you need
4. **Accuracy** — Keep data up to date, correct errors
5. **Storage limitation** — Delete data when it is no longer needed
6. **Integrity and confidentiality** — Protect data with appropriate security

#### Engineering Requirements and Implementation

##### Right to Access (Article 15)

Users can request all data you hold about them.

```typescript
@Controller('users')
export class UserDataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Get('me/data-export')
  @UseGuards(AuthGuard)
  async exportUserData(@CurrentUser() user: AuthenticatedUser) {
    // Collect ALL user data across tables
    const [profile, orders, addresses, activityLogs, consents] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
            // Exclude internal fields like hashedPassword
          },
        }),
        this.prisma.order.findMany({
          where: { userId: user.id },
          include: { items: true, payments: true },
        }),
        this.prisma.address.findMany({ where: { userId: user.id } }),
        this.prisma.activityLog.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        this.prisma.consent.findMany({ where: { userId: user.id } }),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      orders,
      addresses,
      activityLogs,
      consents,
    };

    // Return as JSON (machine-readable format for data portability)
    return exportData;
  }
}
```

##### Right to Erasure / Right to Be Forgotten (Article 17)

```typescript
@Injectable()
export class UserDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly queue: QueueService,
    private readonly logger: Logger,
  ) {}

  async deleteUserData(userId: string): Promise<void> {
    // Use a transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymize data that must be retained (e.g., financial records)
      await tx.order.updateMany({
        where: { userId },
        data: {
          customerName: 'DELETED_USER',
          customerEmail: 'deleted@anonymized.local',
          customerPhone: null,
          // Keep order data for accounting, but remove PII
        },
      });

      // 2. Delete data that can be fully removed
      await tx.address.deleteMany({ where: { userId } });
      await tx.activityLog.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.consent.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });

      // 3. Anonymize the user record (soft-delete + anonymize)
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@anonymized.local`,
          name: 'Deleted User',
          phone: null,
          avatarUrl: null,
          hashedPassword: 'DELETED',
          deletedAt: new Date(),
        },
      });
    });

    // 4. Delete files from S3
    await this.s3.deleteUserFiles(userId);

    // 5. Purge from search indexes, caches, analytics
    await this.queue.add('purge-user-from-external-systems', {
      userId,
      systems: ['elasticsearch', 'redis', 'mixpanel', 'intercom'],
    });

    // 6. Audit log — record that deletion was performed
    this.logger.log({
      event: 'USER_DATA_DELETED',
      userId,
      timestamp: new Date().toISOString(),
      // Do NOT log any PII here
    });
  }
}
```

##### Consent Management

```typescript
// Track what users consented to and when
model Consent {
  id          String   @id @default(uuid())
  userId      String
  purpose     String   // e.g., "marketing_emails", "analytics", "third_party_sharing"
  granted     Boolean
  grantedAt   DateTime?
  revokedAt   DateTime?
  ipAddress   String   // Record where consent was given
  userAgent   String
  version     String   // Consent policy version
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
}

// Service
@Injectable()
export class ConsentService {
  async grantConsent(userId: string, purpose: string, req: Request) {
    return this.prisma.consent.upsert({
      where: { userId_purpose: { userId, purpose } },
      create: {
        userId,
        purpose,
        granted: true,
        grantedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        version: '2.1', // current consent policy version
      },
      update: {
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        version: '2.1',
      },
    });
  }

  async revokeConsent(userId: string, purpose: string) {
    return this.prisma.consent.update({
      where: { userId_purpose: { userId, purpose } },
      data: { granted: false, revokedAt: new Date() },
    });
  }

  async hasConsent(userId: string, purpose: string): Promise<boolean> {
    const consent = await this.prisma.consent.findUnique({
      where: { userId_purpose: { userId, purpose } },
    });
    return consent?.granted === true;
  }
}
```

##### Data Retention and Automated Deletion

```typescript
// Cron job for automated data cleanup
@Injectable()
export class DataRetentionService {
  private readonly retentionPolicies = [
    { model: 'activityLog', field: 'createdAt', maxAge: 90 },  // 90 days
    { model: 'session', field: 'lastActiveAt', maxAge: 30 },   // 30 days
    { model: 'otpCode', field: 'createdAt', maxAge: 1 },       // 1 day
    { model: 'passwordResetToken', field: 'createdAt', maxAge: 1 },
    { model: 'emailVerification', field: 'createdAt', maxAge: 7 },
  ];

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async enforceRetentionPolicies() {
    for (const policy of this.retentionPolicies) {
      const cutoff = subDays(new Date(), policy.maxAge);

      const deleted = await this.prisma[policy.model].deleteMany({
        where: { [policy.field]: { lt: cutoff } },
      });

      this.logger.log(
        `Retention: deleted ${deleted.count} ${policy.model} records older than ${policy.maxAge} days`,
      );
    }
  }
}
```

##### Field-Level Encryption for PII

```typescript
// Encrypt sensitive fields before storing
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly kms: KMSService) {}

  async encrypt(plaintext: string): Promise<string> {
    // Get data key from KMS (envelope encryption)
    const { plainKey, encryptedKey } = await this.kms.generateDataKey();

    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, plainKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Pack: encryptedDataKey + iv + authTag + ciphertext
    const packed = JSON.stringify({
      k: encryptedKey.toString('base64'),
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      data: encrypted,
    });

    return Buffer.from(packed).toString('base64');
  }

  async decrypt(packed: string): Promise<string> {
    const { k, iv, tag, data } = JSON.parse(
      Buffer.from(packed, 'base64').toString('utf8'),
    );

    const plainKey = await this.kms.decryptDataKey(
      Buffer.from(k, 'base64'),
    );

    const decipher = createDecipheriv(
      this.algorithm,
      plainKey,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage: encrypting PII fields
const user = await prisma.user.create({
  data: {
    email: dto.email,                                  // Indexed, not encrypted
    encryptedPhone: await encryption.encrypt(dto.phone), // Encrypted
    encryptedNid: await encryption.encrypt(dto.nid),     // Encrypted
    name: dto.name,
  },
});
```

---

## Q5: SOC 2 Compliance

### Interview Question
> "Your company is going through SOC 2 Type II certification. What engineering changes are required?"

### Answer

#### What SOC 2 Is

SOC 2 (Service Organization Control 2) is an auditing standard developed by the AICPA. It evaluates how well a service organization protects customer data based on five Trust Service Criteria.

#### Five Trust Service Criteria

| Criteria | What It Covers |
|----------|---------------|
| **Security** (required) | Protection against unauthorized access |
| **Availability** | System uptime and performance commitments |
| **Processing Integrity** | Data processed accurately and completely |
| **Confidentiality** | Data classified as confidential is protected |
| **Privacy** | Personal information handled per privacy notice |

#### SOC 2 Type I vs Type II

- **Type I:** Point-in-time snapshot — "Do you have the right controls in place today?"
- **Type II:** Assessment over 6-12 months — "Have you consistently followed those controls?"
- Type II is far more valuable and what most enterprise customers require.

#### Engineering Requirements

##### 1. Audit Logging for All Data Access

```typescript
// audit-log.interceptor.ts — logs every API call
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    const auditEntry = {
      userId: request.user?.id || 'anonymous',
      action: `${request.method} ${request.route?.path || request.url}`,
      resource: context.getClass().name,
      method: context.getHandler().name,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestBody: this.sanitizeBody(request.body),
      timestamp: new Date(),
    };

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.logAuditEvent({
            ...auditEntry,
            statusCode: context.switchToHttp().getResponse().statusCode,
            duration: Date.now() - startTime,
            success: true,
          });
        },
        error: (error) => {
          this.logAuditEvent({
            ...auditEntry,
            statusCode: error.status || 500,
            duration: Date.now() - startTime,
            success: false,
            errorMessage: error.message,
          });
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    // Never log passwords, tokens, or secrets
    const sensitiveFields = [
      'password', 'token', 'secret', 'creditCard',
      'ssn', 'nid', 'accessToken', 'refreshToken',
    ];
    for (const field of sensitiveFields) {
      if (sanitized[field]) sanitized[field] = '[REDACTED]';
    }
    return sanitized;
  }

  private async logAuditEvent(event: any) {
    // Write to audit log table (append-only, no updates/deletes)
    await this.prisma.auditLog.create({ data: event });

    // Also ship to CloudWatch / external SIEM
    this.logger.log({ ...event, type: 'AUDIT' });
  }
}

// Apply globally in AppModule
// providers: [{ provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }]
```

##### 2. Access Reviews and Least Privilege

```typescript
// Track all permission changes
@Injectable()
export class AccessControlService {
  async changeUserRole(
    targetUserId: string,
    newRole: Role,
    changedBy: string,
    reason: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
    });

    const oldRoles = user.roles;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { roles: [newRole] },
      }),
      // Immutable access change log — required for SOC 2 audit
      this.prisma.accessChangeLog.create({
        data: {
          targetUserId,
          changedByUserId: changedBy,
          oldRoles,
          newRoles: [newRole],
          reason,
          timestamp: new Date(),
        },
      }),
    ]);

    // Invalidate all active sessions for the user
    await this.sessionService.revokeAllSessions(targetUserId);
  }
}
```

##### 3. Change Management — Enforced PR Reviews

```yaml
# .github/branch-protection.md (for documentation, actual config in GitHub settings)
# Required for SOC 2:
# - Protected main/production branches
# - Require at least 1 approving review
# - Require status checks to pass (tests, lint, security scan)
# - No direct pushes to main
# - Signed commits (recommended)

# .github/CODEOWNERS
* @backend-team
/infrastructure/ @devops-team @security-team
/src/auth/ @security-team @backend-team
```

##### 4. Automated Vulnerability Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  pull_request:
  schedule:
    - cron: '0 6 * * 1' # Weekly Monday 6am

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high
        # Fails PR if high/critical vulnerabilities found

  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

##### 5. Incident Response Logging

```typescript
// Structured security event logging for SIEM integration
@Injectable()
export class SecurityEventService {
  constructor(private readonly logger: Logger) {}

  logLoginSuccess(userId: string, ip: string, userAgent: string) {
    this.logger.log({
      event: 'AUTH_LOGIN_SUCCESS',
      severity: 'INFO',
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  logLoginFailure(email: string, ip: string, reason: string) {
    this.logger.warn({
      event: 'AUTH_LOGIN_FAILURE',
      severity: 'WARN',
      email, // Not userId — user may not exist
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  logSuspiciousActivity(userId: string, activity: string, details: any) {
    this.logger.error({
      event: 'SECURITY_SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      userId,
      activity,
      details,
      timestamp: new Date().toISOString(),
    });

    // Trigger alert to security team (PagerDuty, Slack, etc.)
    this.alertService.notifySecurityTeam({
      title: `Suspicious activity: ${activity}`,
      userId,
      details,
    });
  }
}
```

---

## Q6: Bangladesh-Specific Compliance

### Interview Question
> "You are building a fintech product in Bangladesh. What regulatory requirements affect your backend architecture?"

### Answer

#### Bangladesh Digital Security Act (2018)

The DSA governs digital crimes and data security in Bangladesh. Key provisions that affect backend engineering:

| Section | Provision | Engineering Impact |
|---------|-----------|-------------------|
| Section 15 | Unauthorized access to computer systems | Strong authentication, intrusion detection, access logs |
| Section 17 | Unauthorized access to critical infrastructure | Enhanced security for government-integrated systems |
| Section 26 | Identity fraud in electronic form | Robust identity verification, NID integration |
| Section 32 | Breach of government secrecy | Encryption for government data, audit trails |

**Engineering implications:**
- Implement comprehensive access logging — every login, every data access
- Use MFA for admin and sensitive operations
- Encrypt sensitive data at rest and in transit
- Maintain immutable audit trails for at least 3 years
- Implement intrusion detection and automated alerting

#### Bangladesh Bank Guidelines (Fintech/Payment Systems)

```typescript
// Architecture decisions driven by Bangladesh Bank regulations

// 1. Data Localization — financial data must be stored in Bangladesh
// Use ap-south-1 (Mumbai) or local data centers
const dbConfig = {
  host: process.env.DB_HOST, // Must be in BD or nearest region
  // Bangladesh does not have an AWS region, so nearest is ap-south-1
  // Some regulations require physical servers in BD — use local DC
};

// 2. KYC (Know Your Customer) Requirements
@Injectable()
export class KycService {
  // NID Verification via Bangladesh Election Commission API
  async verifyNid(nidNumber: string, dateOfBirth: string): Promise<KycResult> {
    // Encrypt NID before transmission
    const encryptedNid = await this.encrypt(nidNumber);

    const response = await this.httpService.post(
      this.config.get('NID_VERIFICATION_API_URL'),
      {
        nid: encryptedNid,
        dob: dateOfBirth,
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.get('NID_API_TOKEN')}`,
          'X-Organization-Id': this.config.get('NID_ORG_ID'),
        },
        httpsAgent: new https.Agent({
          cert: fs.readFileSync(this.config.get('NID_CLIENT_CERT')),
          key: fs.readFileSync(this.config.get('NID_CLIENT_KEY')),
          // mTLS required by EC API
        }),
      },
    );

    // Store verification result, NOT the raw NID response
    await this.prisma.kycVerification.create({
      data: {
        userId: user.id,
        verificationType: 'NID',
        verified: response.data.verified,
        verifiedAt: new Date(),
        // Store encrypted NID, never plaintext
        encryptedNid: await this.encryption.encrypt(nidNumber),
        nidLastFour: nidNumber.slice(-4), // For display purposes only
      },
    });

    return {
      verified: response.data.verified,
      name: response.data.name,
    };
  }

  // Tier-based KYC levels per Bangladesh Bank
  async determineKycTier(userId: string): Promise<KycTier> {
    const verifications = await this.prisma.kycVerification.findMany({
      where: { userId },
    });

    const hasNid = verifications.some((v) => v.verificationType === 'NID' && v.verified);
    const hasAddress = verifications.some((v) => v.verificationType === 'ADDRESS' && v.verified);
    const hasFaceMatch = verifications.some((v) => v.verificationType === 'FACE_MATCH' && v.verified);

    if (hasNid && hasAddress && hasFaceMatch) return KycTier.FULL;
    if (hasNid) return KycTier.BASIC;
    return KycTier.NONE;
  }
}
```

##### Transaction Monitoring and Reporting

```typescript
// Bangladesh Bank requires suspicious transaction reporting (STR)
@Injectable()
export class TransactionMonitoringService {
  // Bangladesh Bank thresholds (as of current regulations)
  private readonly SINGLE_TXN_THRESHOLD = 500_000;   // BDT 5 lakh
  private readonly DAILY_TXN_THRESHOLD = 1_000_000;   // BDT 10 lakh
  private readonly MONTHLY_TXN_THRESHOLD = 5_000_000;  // BDT 50 lakh

  async monitorTransaction(transaction: Transaction): Promise<void> {
    const flags: string[] = [];

    // 1. Single large transaction
    if (transaction.amount >= this.SINGLE_TXN_THRESHOLD) {
      flags.push('LARGE_SINGLE_TRANSACTION');
    }

    // 2. Daily aggregation check
    const dailyTotal = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: transaction.userId,
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
        status: 'COMPLETED',
      },
    });

    if ((dailyTotal._sum.amount || 0) >= this.DAILY_TXN_THRESHOLD) {
      flags.push('DAILY_LIMIT_EXCEEDED');
    }

    // 3. Structuring detection (splitting transactions to avoid threshold)
    const recentTxns = await this.prisma.transaction.findMany({
      where: {
        userId: transaction.userId,
        createdAt: { gte: subHours(new Date(), 24) },
      },
    });

    if (this.detectStructuring(recentTxns, transaction)) {
      flags.push('POSSIBLE_STRUCTURING');
    }

    // 4. Unusual pattern detection
    if (await this.isUnusualForUser(transaction)) {
      flags.push('UNUSUAL_PATTERN');
    }

    // File Suspicious Transaction Report if flagged
    if (flags.length > 0) {
      await this.prisma.suspiciousTransactionReport.create({
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
          amount: transaction.amount,
          flags,
          status: 'PENDING_REVIEW',
          createdAt: new Date(),
        },
      });

      // Alert compliance team
      await this.alertService.notifyComplianceTeam({
        type: 'STR',
        transactionId: transaction.id,
        flags,
      });
    }
  }

  private detectStructuring(
    recentTxns: Transaction[],
    current: Transaction,
  ): boolean {
    const allTxns = [...recentTxns, current];
    const total = allTxns.reduce((sum, t) => sum + t.amount, 0);

    // Many small transactions that together exceed the threshold
    return (
      allTxns.length >= 5 &&
      total >= this.SINGLE_TXN_THRESHOLD &&
      allTxns.every((t) => t.amount < this.SINGLE_TXN_THRESHOLD * 0.3)
    );
  }
}
```

##### PCI-DSS Requirements (Card Payments)

```
PCI-DSS compliance levels for Bangladesh payment processors:

Level 1: >6 million transactions/year — on-site audit
Level 2: 1-6 million — SAQ + quarterly network scan
Level 3: 20,000-1 million e-commerce — SAQ
Level 4: <20,000 — SAQ (simplified)

Key engineering requirements:
- NEVER store full card numbers, CVV, or PIN
- Use tokenization (Stripe, SSLCommerz handles this)
- Encrypt cardholder data in transit (TLS 1.2+)
- Network segmentation — card processing in isolated subnet
- Quarterly vulnerability scans by ASV (Approved Scanning Vendor)
- Penetration testing annually
- Immutable audit logs for card data access
```

#### BTRC Regulations (Telecom Applications)

```typescript
// For apps integrated with telecom services (mobile billing, SMS, etc.)

// 1. SIM Registration Verification
// BTRC requires real SIM owner verification for mobile services
async verifyMobileOwnership(phoneNumber: string): Promise<boolean> {
  // Send OTP to verify the user actually owns the number
  const otp = this.generateSecureOtp();
  await this.smsService.send(phoneNumber, `Your OTP is: ${otp}`);

  // Store OTP with short TTL
  await this.redis.set(`otp:${phoneNumber}`, otp, 'EX', 300); // 5 min
  return true;
}

// 2. User data protection — BTRC data localization
// Telecom user data must be stored within Bangladesh jurisdiction
// Use local hosting or ensure compliance via contractual agreements

// 3. QoS (Quality of Service) reporting
// Some telecom-adjacent apps must report uptime and response times to BTRC
```

#### Impact on Architecture Summary

```
Bangladesh Compliance Architecture Decisions:
┌─────────────────────────────────────────────────────┐
│                   Application Layer                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ NID/KYC  │  │ Txn       │  │ Consent          │  │
│  │ Service  │  │ Monitor   │  │ Management       │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│                   Security Layer                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Field    │  │ Audit     │  │ Access           │  │
│  │ Encrypt  │  │ Logging   │  │ Control          │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│                   Data Layer                          │
│  ┌──────────────────────────────────────────────┐    │
│  │ Primary DB: Bangladesh/South Asia Region      │    │
│  │ (Data Residency Compliance)                   │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │ Encrypted Backups: Same region, KMS encrypted │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Q7: Dependency Security & Supply Chain

### Interview Question
> "How do you protect your Node.js application from supply chain attacks?"

### Answer

Supply chain attacks exploit trust in third-party packages. A single compromised npm package can give an attacker full access to your production environment. Notable incidents: `event-stream` (2018), `ua-parser-js` (2021), `colors`/`faker` (2022).

#### Defense Layers

##### 1. npm audit — Built-in Vulnerability Scanning

```bash
# Run in CI — fail on high/critical
npm audit --audit-level=high

# Generate report
npm audit --json > audit-report.json

# Fix automatically where possible
npm audit fix
```

##### 2. Snyk — Continuous Monitoring

```yaml
# .github/workflows/snyk.yml
name: Snyk Security
on:
  pull_request:
  push:
    branches: [main]

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --fail-on=all
      - name: Monitor (push only)
        if: github.event_name == 'push'
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: monitor
```

##### 3. Dependabot — Automated Updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '06:00'
      timezone: Asia/Dhaka
    open-pull-requests-limit: 10
    reviewers:
      - backend-team
    labels:
      - dependencies
      - security
    # Group minor and patch updates to reduce PR noise
    groups:
      minor-and-patch:
        update-types:
          - minor
          - patch
    # Ignore major version bumps for stability (review manually)
    ignore:
      - dependency-name: '*'
        update-types: ['version-update:semver-major']
```

##### 4. Socket.dev — Detect Supply Chain Attacks

Socket detects behaviors that vulnerability scanners miss:
- Install scripts that run arbitrary code
- Typosquatting (e.g., `lodsah` instead of `lodash`)
- Network access from packages that should not need it
- Filesystem access, shell execution, environment variable access

##### 5. Lock Files — Always Commit Them

```bash
# Ensure lock file is committed
# .gitignore should NOT include package-lock.json

# In CI, use ci instead of install
npm ci  # Uses exact versions from lock file, fails if lock file is outdated
```

##### 6. Private Registry

```bash
# Verdaccio for private packages and caching
# .npmrc
registry=https://registry.npmjs.org/
@mycompany:registry=https://npm.mycompany.com/

# Or use GitHub Packages
@mycompany:registry=https://npm.pkg.github.com/
```

##### 7. Complete CI Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security Pipeline
on:
  pull_request:
  push:
    branches: [main]

jobs:
  # Stage 1: Dependency audit
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high

  # Stage 2: Static analysis
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3

  # Stage 3: Secret scanning
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for secret scanning
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  # Stage 4: License compliance
  licenses:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx license-checker --failOn "GPL-3.0;AGPL-3.0"
        # Block copyleft licenses in commercial projects

  # Stage 5: Container scanning (if using Docker)
  container-scan:
    runs-on: ubuntu-latest
    needs: [audit, sast, secrets]
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1
```

---

## Q8: Infrastructure Security

### Interview Question
> "Design the network architecture for a production backend on AWS. Explain how each layer provides security."

### Answer

#### VPC Architecture for a Typical Backend

```
┌─────────────────────────────── VPC (10.0.0.0/16) ───────────────────────────────┐
│                                                                                   │
│  ┌─────────────── Public Subnets (10.0.1.0/24, 10.0.2.0/24) ────────────────┐  │
│  │                                                                             │  │
│  │  ┌─────────┐          ┌──────────┐         ┌─────────────────────┐        │  │
│  │  │ Internet│          │   ALB    │         │    NAT Gateway      │        │  │
│  │  │ Gateway │────────▶ │ (HTTPS)  │         │ (Outbound traffic)  │        │  │
│  │  └─────────┘          └────┬─────┘         └──────────┬──────────┘        │  │
│  │                             │                          │                    │  │
│  └─────────────────────────────┼──────────────────────────┼────────────────────┘  │
│                                │                          │                       │
│  ┌──────────── Private Subnets - App (10.0.10.0/24, 10.0.11.0/24) ───────────┐  │
│  │                             ▼                          │                    │  │
│  │  ┌──────────────────────────────────────────────┐     │                    │  │
│  │  │    ECS Fargate / EC2 Instances               │     │                    │  │
│  │  │    (NestJS Application)                      │─────┘                    │  │
│  │  │    SG: Allow 3000 from ALB SG only           │  (outbound via NAT)     │  │
│  │  └──────────────────┬───────────────────────────┘                          │  │
│  │                     │                                                       │  │
│  └─────────────────────┼───────────────────────────────────────────────────────┘  │
│                        │                                                          │
│  ┌──────────── Private Subnets - Data (10.0.20.0/24, 10.0.21.0/24) ──────────┐  │
│  │                     ▼                                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐                         │  │
│  │  │ RDS Postgres│  │   Redis    │  │ ElastiCache  │                         │  │
│  │  │ (encrypted) │  │ (encrypted)│  │              │                         │  │
│  │  │ SG: 5432    │  │ SG: 6379   │  │ SG: 6379    │                         │  │
│  │  │ from App SG │  │ from App SG│  │ from App SG  │                         │  │
│  │  └────────────┘  └────────────┘  └──────────────┘                         │  │
│  │                                                                             │  │
│  │  NO internet access — no NAT, no IGW route                                 │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

#### Security Groups (Virtual Firewalls)

```typescript
// Infrastructure as Code (CDK/Terraform concept)

// ALB Security Group — only accept HTTPS from the internet
const albSg = {
  inbound: [
    { port: 443, source: '0.0.0.0/0', protocol: 'HTTPS' },
    // Redirect HTTP to HTTPS at ALB level
    { port: 80, source: '0.0.0.0/0', protocol: 'HTTP' },
  ],
  outbound: [
    { port: 3000, destination: 'app-sg', protocol: 'TCP' },
  ],
};

// Application Security Group — only accept from ALB
const appSg = {
  inbound: [
    { port: 3000, source: 'alb-sg', protocol: 'TCP' },
    // No SSH — use SSM Session Manager instead
  ],
  outbound: [
    { port: 5432, destination: 'db-sg', protocol: 'TCP' },
    { port: 6379, destination: 'redis-sg', protocol: 'TCP' },
    { port: 443, destination: '0.0.0.0/0', protocol: 'HTTPS' }, // AWS APIs, etc.
  ],
};

// Database Security Group — only accept from application
const dbSg = {
  inbound: [
    { port: 5432, source: 'app-sg', protocol: 'TCP' },
    // No public access, no bastion — use RDS Proxy or SSM
  ],
  outbound: [], // Databases should not initiate outbound connections
};
```

#### Encryption at Rest

| Service | Encryption Method | Key Management |
|---------|-------------------|----------------|
| **RDS PostgreSQL** | AES-256 via KMS | AWS managed or customer managed CMK |
| **S3** | SSE-S3, SSE-KMS, or SSE-C | Bucket policy enforces encryption |
| **EBS Volumes** | AES-256 via KMS | Default encryption enabled account-wide |
| **ElastiCache Redis** | At-rest encryption | KMS managed |
| **Secrets Manager** | AES-256 via KMS | Automatic |
| **DynamoDB** | AES-256 | AWS owned or customer managed |

#### WAF (Web Application Firewall)

```
AWS WAF Rules (attached to ALB/CloudFront):

1. Rate limiting:         100 requests per 5 minutes per IP
2. SQL injection:         AWS managed rule set
3. XSS protection:        AWS managed rule set
4. Known bad inputs:       AWS managed rule set
5. Geographic blocking:    Block traffic from high-risk countries (if applicable)
6. IP reputation:          AWS managed IP reputation list
7. Bot control:           Challenge suspected bots
8. Custom rules:          Block specific attack patterns observed in logs
```

#### DDoS Protection

```
AWS Shield Standard (Free):
- Automatic protection against common L3/L4 DDoS attacks
- Included with CloudFront, ALB, Route 53

AWS Shield Advanced ($3,000/month):
- L7 DDoS protection
- Real-time attack visibility
- DDoS Response Team (DRT) support
- Cost protection (refund for scaling during attack)
- Recommended for: financial services, high-profile targets
```

#### IAM Best Practices

```json
// Least privilege IAM policy for ECS task role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:prod/myapp/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::myapp-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": "arn:aws:sqs:ap-southeast-1:123456789012:myapp-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:ap-southeast-1:123456789012:key/your-key-id"
    }
  ]
}
```

**Rules:**
- Use IAM roles (not users) for applications — ECS task roles, Lambda execution roles
- Never create long-lived access keys for applications
- Enable MFA for all human IAM users
- Use AWS Organizations SCPs to enforce guardrails
- Review IAM Access Analyzer findings regularly

---

## Q9: Security in CI/CD Pipeline

### Interview Question
> "How do you implement shift-left security in your CI/CD pipeline?"

### Answer

Shift-left security means catching vulnerabilities as early as possible in the development lifecycle — at code time, not after deployment.

#### Security Testing Types

| Type | What It Does | When | Tools |
|------|-------------|------|-------|
| **SAST** | Scans source code for vulnerabilities | PR / commit | SonarQube, CodeQL, Semgrep |
| **SCA** | Scans dependencies for known CVEs | PR / commit | Snyk, npm audit, Dependabot |
| **DAST** | Tests running application for vulnerabilities | Post-deploy (staging) | OWASP ZAP, Burp Suite |
| **Container Scanning** | Scans Docker images for vulnerabilities | Build | Trivy, Docker Scout, Snyk |
| **Secret Scanning** | Detects committed secrets | PR / commit | TruffleHog, git-secrets, GitHub |
| **License Scanning** | Checks dependency licenses | PR | license-checker |
| **IaC Scanning** | Scans Terraform/CDK for misconfigs | PR | Checkov, tfsec |

#### Complete Security Pipeline

```yaml
# .github/workflows/ci-security.yml
name: CI Security Pipeline
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  # ──────────────────────────────────────────────
  # Stage 1: Fast checks (parallel, <2 min each)
  # ──────────────────────────────────────────────

  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: npm audit
        run: npm audit --audit-level=high
      - name: Snyk test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  secret-scanning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: TruffleHog scan
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified --fail

  # ──────────────────────────────────────────────
  # Stage 2: Deep analysis (parallel, 5-15 min)
  # ──────────────────────────────────────────────

  sast:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: +security-extended
      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v3

  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/nodejs
            p/typescript
            p/owasp-top-ten
            p/security-audit

  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:cov
      - name: Check coverage thresholds
        run: |
          # Ensure security-critical code has >90% coverage
          npx istanbul check-coverage --branches 80 --functions 80 --lines 80

  # ──────────────────────────────────────────────
  # Stage 3: Build and scan image
  # ──────────────────────────────────────────────

  build-and-scan:
    needs: [lint-and-typecheck, dependency-audit, tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1
          format: sarif
          output: trivy-results.sarif

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

  # ──────────────────────────────────────────────
  # Stage 4: Deploy to staging + DAST
  # ──────────────────────────────────────────────

  dast:
    needs: [build-and-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: echo "Deploy to staging environment"

      - name: OWASP ZAP baseline scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: https://staging-api.example.com
          rules_file_name: .zap/rules.tsv
          fail_action: true
```

#### Pipeline Security Controls

```
Pipeline Hardening Checklist:
✓ Signed commits required on protected branches
✓ Branch protection: 1+ required reviews, status checks must pass
✓ OIDC for cloud access (no stored access keys)
✓ Least-privilege CI runner permissions
✓ Pin action versions to SHA (not tags) to prevent supply chain attacks
✓ Artifact signing for Docker images (cosign/Notation)
✓ Separate deploy keys per environment
✓ Immutable build artifacts — same image from staging goes to production
```

```yaml
# Pin actions to SHA for security (tags can be moved)
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
# Instead of:
- uses: actions/checkout@v4  # Tag could be moved to malicious commit
```

---

## Q10: Data Protection Patterns

### Interview Question
> "Explain the different data protection techniques you use and when to apply each."

### Answer

#### Encryption

##### At Rest — AES-256

```typescript
// Field-level encryption for PII columns
// Use envelope encryption: KMS generates data key, data key encrypts data

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class FieldEncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly kmsService: KmsService) {}

  async encryptField(plaintext: string): Promise<EncryptedField> {
    // 1. Get data encryption key from KMS (envelope encryption)
    const { plaintextKey, encryptedKey } =
      await this.kmsService.generateDataKey();

    // 2. Encrypt data with the plaintext key
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, plaintextKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // 3. Clear plaintext key from memory
    plaintextKey.fill(0);

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedKey: encryptedKey.toString('base64'),
      keyId: this.kmsService.getCurrentKeyId(),
    };
  }

  async decryptField(encrypted: EncryptedField): Promise<string> {
    // 1. Decrypt the data key using KMS
    const plaintextKey = await this.kmsService.decryptDataKey(
      Buffer.from(encrypted.encryptedKey, 'base64'),
    );

    // 2. Decrypt data with the plaintext key
    const decipher = createDecipheriv(
      this.algorithm,
      plaintextKey,
      Buffer.from(encrypted.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));

    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    // 3. Clear plaintext key from memory
    plaintextKey.fill(0);

    return plaintext;
  }
}
```

##### In Transit — TLS 1.2+ and mTLS

```typescript
// mTLS for service-to-service communication
import * as https from 'https';
import * as fs from 'fs';

// Server: require client certificate
const httpsOptions = {
  key: fs.readFileSync('/certs/server-key.pem'),
  cert: fs.readFileSync('/certs/server-cert.pem'),
  ca: fs.readFileSync('/certs/ca-cert.pem'),    // CA that signed client certs
  requestCert: true,       // Require client certificate
  rejectUnauthorized: true, // Reject invalid client certs
};

// Client: present certificate to server
const clientOptions = {
  cert: fs.readFileSync('/certs/client-cert.pem'),
  key: fs.readFileSync('/certs/client-key.pem'),
  ca: fs.readFileSync('/certs/ca-cert.pem'),
};

const agent = new https.Agent(clientOptions);
// Use this agent in HttpService/axios calls to other services
```

#### Password Hashing — bcrypt or argon2

```typescript
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  // argon2id is the recommended variant (resistant to side-channel + GPU attacks)
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,    // 64 MB
      timeCost: 3,          // 3 iterations
      parallelism: 4,       // 4 threads
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  // Alternative: bcrypt (simpler, widely used)
  // Cost factor 12 is minimum for production (2024+)
  async hashBcrypt(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

// NEVER use for passwords: MD5, SHA-1, SHA-256 (too fast, vulnerable to brute force)
// NEVER use: plain text, Base64 encoding, reversible encryption
```

#### Tokenization

Replace sensitive data with non-sensitive tokens. The mapping is stored securely (or by a third-party vault).

```typescript
// Tokenization for payment card numbers
@Injectable()
export class TokenizationService {
  constructor(private readonly vault: VaultService) {}

  async tokenize(cardNumber: string): Promise<string> {
    // Generate a random token
    const token = `tok_${randomBytes(16).toString('hex')}`;

    // Store mapping in secure vault (NOT in your main database)
    await this.vault.store(token, cardNumber);

    return token;
  }

  async detokenize(token: string): Promise<string> {
    // Only authorized services can detokenize
    return this.vault.retrieve(token);
  }
}

// Usage: Store token in your DB, only detokenize when processing payment
// Your DB never sees the real card number
```

#### Data Masking

```typescript
// Utility for displaying partial sensitive data
export class DataMasker {
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${local[1]}${'*'.repeat(local.length - 2)}@${domain}`;
  }

  static maskPhone(phone: string): string {
    // Show last 4 digits: ********1234
    const digits = phone.replace(/\D/g, '');
    return '*'.repeat(digits.length - 4) + digits.slice(-4);
  }

  static maskCardNumber(cardNumber: string): string {
    // Show first 6 (BIN) and last 4: 424242******4242
    const digits = cardNumber.replace(/\D/g, '');
    return digits.slice(0, 6) + '******' + digits.slice(-4);
  }

  static maskNid(nid: string): string {
    // Show last 4 digits only
    return '*'.repeat(nid.length - 4) + nid.slice(-4);
  }

  static maskName(name: string): string {
    const parts = name.split(' ');
    return parts.map((p) => p[0] + '*'.repeat(p.length - 1)).join(' ');
  }
}

// Usage in API response serializer
@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ value }) => DataMasker.maskEmail(value))
  email: string;

  @Expose()
  @Transform(({ value }) => value ? DataMasker.maskPhone(value) : null)
  phone: string;
}
```

#### Key Rotation

```typescript
// Automated key rotation strategy
@Injectable()
export class KeyRotationService {
  // AWS KMS automatic rotation (annual by default, configurable)
  // When KMS rotates, old key versions are kept for decryption
  // New encryptions use the new key version automatically

  // For application-level keys (e.g., JWT signing keys)
  async rotateJwtKeys() {
    // 1. Generate new key pair
    const newKeyPair = await generateKeyPair('RS256');

    // 2. Store new key with version
    const version = Date.now().toString();
    await this.secretsManager.createSecret(
      `jwt-signing-key-${version}`,
      newKeyPair.privateKey,
    );

    // 3. Update current key pointer
    await this.secretsManager.updateSecret(
      'jwt-signing-key-current',
      version,
    );

    // 4. Keep old keys for validation (tokens signed with old key are still valid)
    // Old keys are removed after max token lifetime (7 days for refresh tokens)
  }

  // For API keys: notify users, grace period, then revoke old key
  async rotateApiKey(apiKeyId: string) {
    const newKey = await this.apiKeyService.generateApiKey(/* ... */);

    // Mark old key for deprecation with grace period
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        deprecatedAt: new Date(),
        expiresAt: addDays(new Date(), 30), // 30-day grace period
      },
    });

    // Notify user
    await this.notificationService.send(/* ... */);

    return newKey;
  }
}
```

#### Data Classification

| Classification | Examples | Protection Level |
|---------------|----------|-----------------|
| **Public** | Marketing content, public APIs | Integrity only |
| **Internal** | Internal docs, non-sensitive configs | Access control |
| **Confidential** | User PII, financial data, API keys | Encryption + access control + audit |
| **Restricted** | Passwords, payment cards, NID numbers | Field-level encryption + tokenization + strict access + audit |

---

## Quick Reference

### Security Checklist for NestJS Apps

```
Pre-Production Security Checklist:
──────────────────────────────────
[ ] helmet.js enabled (security headers)
[ ] CORS configured with explicit allowlist (not *)
[ ] Rate limiting enabled (@nestjs/throttler)
[ ] Global ValidationPipe with whitelist: true, forbidNonWhitelisted: true
[ ] All endpoints require authentication (deny by default)
[ ] RBAC/ABAC guards on sensitive operations
[ ] JWT: short access tokens (15 min), HttpOnly refresh cookies
[ ] Passwords hashed with bcrypt (12+) or argon2
[ ] PII encrypted at rest (field-level encryption)
[ ] All secrets in Secrets Manager / Parameter Store (not env files)
[ ] npm audit passes with no high/critical
[ ] Dependabot or Snyk enabled
[ ] SAST (CodeQL/Semgrep) in CI pipeline
[ ] Container image scanned (Trivy)
[ ] Secret scanning in CI (TruffleHog)
[ ] Structured audit logging for all data access
[ ] Error responses do not leak stack traces or internal details
[ ] HTTPS enforced (TLS 1.2+)
[ ] Database in private subnet, no public access
[ ] Security groups: least privilege, no 0.0.0.0/0 on DB
[ ] IAM roles with least privilege (no AdministratorAccess)
[ ] MFA enabled for all human users (AWS, GitHub, etc.)
[ ] Monitoring and alerting for security events
[ ] Incident response plan documented
```

### Compliance Comparison Table

| Aspect | GDPR | SOC 2 | BD Digital Security Act |
|--------|------|-------|------------------------|
| **Scope** | EU data subjects | Service organizations | Bangladesh digital systems |
| **Focus** | Data privacy rights | Security controls | Cybercrime prevention |
| **Data export right** | Yes (Article 15) | No requirement | No explicit provision |
| **Right to erasure** | Yes (Article 17) | No requirement | No explicit provision |
| **Consent tracking** | Required | Recommended | Not specified |
| **Audit logging** | Required | Required | Required |
| **Encryption** | Required (appropriate) | Required | Implied |
| **Breach notification** | 72 hours to DPA | Varies by contract | Required (not time-bound) |
| **Penalty** | 4% revenue / 20M EUR | Loss of certification | Imprisonment + fines |
| **Data localization** | No (with adequacy) | No | Yes (some financial data) |
| **Certification** | No formal cert | Type I / Type II audit | No formal cert |
| **Applicability** | If processing EU data | If selling to enterprise | If operating in BD |

### OWASP Top 10 Mitigation Cheat Sheet

| # | Risk | NestJS Mitigation | One-liner |
|---|------|-------------------|-----------|
| A01 | Broken Access Control | `@Roles()`, CASL, ownership checks | Deny by default, check every request |
| A02 | Cryptographic Failures | argon2, KMS, TLS | Encrypt everything, hash passwords |
| A03 | Injection | Prisma, class-validator | Never concatenate user input |
| A04 | Insecure Design | Threat modeling, rate limits | Security in design phase |
| A05 | Security Misconfiguration | helmet, CORS, ValidationPipe | Secure defaults, validate env |
| A06 | Vulnerable Components | npm audit, Snyk, Dependabot | Scan and update dependencies |
| A07 | Auth Failures | Short JWT, MFA, lockout | Defense in depth for auth |
| A08 | Integrity Failures | Signed artifacts, lock files | Verify everything in CI/CD |
| A09 | Logging Failures | Structured logging, alerting | Log security events, alert on anomalies |
| A10 | SSRF | URL validation, allowlists | Never trust user-provided URLs |

### Common Interview Questions

**Rapid-fire answers for final-round interviews:**

1. **"How do you store passwords?"** — argon2id (or bcrypt cost 12+). Never MD5/SHA. Never plaintext. Never reversible encryption.

2. **"How do you handle JWT revocation?"** — Short-lived access tokens (15 min) + refresh token rotation. Redis blacklist for immediate revocation of access tokens by JTI.

3. **"What is the difference between authentication and authorization?"** — Authentication verifies identity (who are you?). Authorization verifies permissions (what can you do?).

4. **"How do you prevent SQL injection?"** — Use parameterized queries (Prisma/TypeORM do this by default). Validate all input with class-validator. Never concatenate user input into queries.

5. **"What is CORS and how do you configure it?"** — Cross-Origin Resource Sharing. Allowlist specific origins, never use `*` in production. Configure methods, headers, and credentials explicitly.

6. **"How do you manage secrets?"** — AWS Secrets Manager for rotating secrets, Parameter Store for config. Never in code, never in env files committed to git. Use OIDC in CI/CD to avoid long-lived credentials.

7. **"What is the principle of least privilege?"** — Give every user, service, and system only the minimum permissions needed to perform their function. Applied to IAM, security groups, database users, API scopes.

8. **"How do you handle GDPR data deletion?"** — Anonymize data needed for legal retention (financial records). Delete everything else. Purge from backups, caches, search indexes, and third-party systems. Log that deletion occurred.

9. **"What is SOC 2 and why does engineering care?"** — Audit standard for service organizations. Engineering must implement audit logging, access controls, change management (PR reviews), vulnerability scanning, and incident response.

10. **"How do you secure a CI/CD pipeline?"** — SAST (CodeQL), SCA (Snyk), secret scanning (TruffleHog), container scanning (Trivy), signed commits, protected branches, OIDC for cloud access, pin action versions to SHA.

---

> **Study tip:** For interviews, focus on being able to explain WHY each control exists and what attack it prevents, not just listing tools. Interviewers want to see that you understand the threat model, not just that you know how to install helmet.js.
