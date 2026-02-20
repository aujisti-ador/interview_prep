```markdown
# Phase 1: Core Programming & Languages - Detailed Interview Answers
**Prepared for: Fazle Rabbi Ador**  
**Target Role**: Senior / Lead Backend Engineer  
**Focus**: Deep understanding + real-world application (your Agora live streaming, Banglalink 41M users, Daraz performance work)  
**Date**: February 2026  

**How to study this file**:
- Read one major section per day.
- Speak every answer out loud (record yourself on phone).
- Type & run every code example.
- After each section, ask yourself the "Follow-up Questions".
- Mark [x] when confident.

---

## 1. JavaScript / TypeScript Deep Dive

### Q1: Explain the JavaScript Event Loop in detail. How does it make JavaScript asynchronous even though it's single-threaded?

**Detailed Answer**:
JavaScript runs on a single thread (main thread) but appears asynchronous because of the **Event Loop + Libuv (in Node.js)**.

**Core Components**:
1. **Call Stack** — Executes synchronous code (LIFO).
2. **Web APIs / Libuv** — Handles async operations (setTimeout, HTTP, DB, file I/O, Agora SDK calls).
3. **Microtask Queue** — High priority (Promises, async/await, queueMicrotask, MutationObserver).
4. **Macrotask Queue (Task Queue)** — Lower priority (setTimeout, setInterval, I/O callbacks, DOM events).
5. **Event Loop** — Continuously checks: "Is Call Stack empty? → If yes, move one microtask, then one macrotask."

**Visual Execution Order**:
```js
console.log("1");                    // Call Stack

setTimeout(() => console.log("2"), 0); // Macrotask Queue

Promise.resolve().then(() => console.log("3")); // Microtask Queue

console.log("4");                    // Call Stack
```
**Output**:
```
1
4
3
2
```

**Why this matters in your projects**:
- In your **Right Tracks live streaming app**, when 500 viewers join simultaneously:
  - Agora token generation + DynamoDB write = async I/O.
  - Event Loop keeps the main thread free → no blocking → 99.9% uptime.
- If you used blocking code (e.g., `for` loop for 1M users), the whole server would freeze.

**Follow-up Questions interviewers ask**:
- What is the difference between microtask and macrotask? (Microtasks run after current script, before next macrotask)
- What happens if you have an infinite microtask loop? (Starves the macrotask queue → UI freeze in browser, starvation in Node)
- How does `await` work under the hood? (It returns a Promise and pauses the function via microtask)

**Best Resources**:
- MDN Official: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop
- Excellent 2025 Explanation: https://dev.to/buildwithgagan/javascript-event-loop-explained-a-beginners-guide-with-examples-4kae
- YouTube (visual): https://www.youtube.com/watch?v=WNrHrwm1wkU (4 min)

---

### Q2: var vs let vs const — Explain with memory and hoisting differences. When to use each in production backend code?

**Detailed Answer**:
| Feature       | var                  | let                     | const                     |
|---------------|----------------------|-------------------------|---------------------------|
| Scope         | Function             | Block                   | Block                     |
| Hoisting      | Yes (undefined)      | Yes (TDZ)               | Yes (TDZ)                 |
| Re-declare    | Yes                  | No                      | No                        |
| Re-assign     | Yes                  | Yes                     | No (but object mutation OK)|
| Temporal Dead Zone | No              | Yes                     | Yes                       |

**Production Rule (NestJS style)**:
```ts
// ✅ Good
const MAX_CONCURRENT_STREAMS = 5000;           // never changes
let activeViewers = 0;                         // changes often
// Never use var

// Object example
const config = { db: "dynamo" };
config.port = 3000;   // Allowed (mutation)
```

**Your resume connection**: In Banglalink Notification Service, you used `const` for Redis client and `let` for dynamic counters.

**Follow-up**:
- What is Temporal Dead Zone? (Time between declaration and initialization where accessing throws error)

---

### Q3: What is Hoisting? Show with code and explain why it can cause bugs in large codebases.

**Detailed Answer**:
Hoisting = JavaScript engine moves all variable and function declarations to the top of their scope **before** execution.

```js
// What you write
console.log(x);   // undefined
var x = 10;

// What JS actually runs
var x;
console.log(x);   // undefined
x = 10;
```

**let/const are hoisted but in Temporal Dead Zone** → ReferenceError.

**Real bug you might face**:
In a large NestJS module, if you use `var` in a service and call it before declaration → silent `undefined` bug → hard to debug in production.

---

### Q4: async/await vs Promises vs Callbacks. Show a real NestJS controller example.

**Detailed Answer**:
```ts
// 1. Callbacks (avoid)
getUser(id, (err, user) => { ... });

// 2. Promises (better)
getUser(id).then(user => ...).catch(err => ...);

// 3. async/await (best for readability)
async function getUserOrders(req: Request) {
  try {
    const user = await this.userService.findOne(req.params.id);
    const orders = await this.orderService.findByUser(user.id);
    return { user, orders };
  } catch (err) {
    throw new HttpException(err.message, 500);
  }
}
```

**Your experience**: You used async/await heavily in Agora token generation endpoints.

**Follow-up**:
- How to handle multiple awaits in parallel? → `Promise.all([await1, await2])`

**Resource**: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await

---

## 2. Node.js Fundamentals

### Q5: Node.js is single-threaded. How does it handle thousands of concurrent requests?

**Detailed Answer**:
- Single thread for JavaScript execution.
- **Libuv** (C++ library) provides thread pool (default 4 threads) for I/O operations.
- Non-blocking I/O → requests are offloaded to OS/kernel.

**Real example from your live streaming app**:
- 1000 viewers → 1000 WebSocket connections.
- Each Agora token + S3 upload = I/O → handled by Libuv thread pool.
- Main event loop stays free → handles new connections instantly.

**When it fails**: CPU-heavy work (image processing, JSON parsing 10MB payload) → blocks the loop.

---

### Q6: Explain Node.js Clustering vs Worker Threads. When to use which?

**Detailed Answer**:
**Clustering** (for scaling across CPU cores):
```js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  console.log(`Master ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
} else {
  require('./app'); // NestJS starts here on each core
}
```

**Worker Threads** (for CPU-intensive tasks inside same process):
```js
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-calc.js');
```

**Your decision matrix**:
- I/O heavy (your apps) → PM2 cluster or AWS Auto Scaling
- CPU heavy (video transcoding) → Worker Threads

**Resources**:
- Official: https://nodejs.org/api/cluster.html
- Excellent guide: https://medium.com/@obada.almaleh/scaling-node-js-applications-with-clustering-and-worker-threads-2ae8695e663a

---

## 3. NestJS Mastery (Most Important for Senior/Lead)

### Q7: What is Dependency Injection in NestJS? Show full example.

**Detailed Answer**:
NestJS uses **Inversion of Control** via decorators.

```ts
// user.service.ts
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,   // ← Injected
    private readonly agoraService: AgoraService
  ) {}
}

// user.controller.ts
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {} // ← DI magic

  @Post('token')
  async generateToken(@Body() dto: TokenDto) {
    return this.userService.generateAgoraToken(dto); // uses injected service
  }
}
```

**Why interviewers love this**:
- Testable (easy to mock)
- Scalable for 10+ member teams
- Used in your Right Tracks project for separating concerns (Agora logic separate from DB)

---

### Q8: Explain Guards, Interceptors, Pipes, Exception Filters with real use cases from your projects.

**Detailed Answer**:

| Feature            | Purpose                              | Your Real Use Case                              |
|--------------------|--------------------------------------|-------------------------------------------------|
| **Guard**          | Authorization before handler         | JwtAuthGuard on streaming endpoints             |
| **Interceptor**    | Transform response / logging         | Log every Agora token request + response time   |
| **Pipe**           | Validation & transformation          | ValidationPipe + class-validator for subscription tiers |
| **Exception Filter**| Custom error format                  | Global filter: { "status": "error", "message": ..., "code": "STREAM_NOT_FOUND" } |

**Code for Global Exception Filter** (you should know this):
```ts
@Catch(HttpException)
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(400).json({
      status: 'error',
      message: exception.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

### Q9: How do you structure a large NestJS project for a team of 8+ developers?

**Answer** (draw this on whiteboard):
```
src/
├── common/          # filters, guards, interceptors, decorators, constants
├── config/          # configuration module (ConfigModule)
├── database/        # Prisma / TypeORM module
├── modules/
│   ├── auth/
│   ├── user/
│   ├── stream/      # your live streaming module
│   ├── subscription/
│   └── notification/
├── shared/          # shared services (Redis, Agora)
└── main.ts
```

This is exactly how enterprise teams (Banglalink, Daraz) structure code.

---

### Q10: NestJS vs Express vs Fastify. Why did you choose NestJS?

**Answer**:
- Express → simple but no structure
- Fastify → fastest but less features
- NestJS → TypeScript first, modular, built-in DI, testing, GraphQL support, microservices ready → perfect for scalable backend (your choice)

---

## 4. Django / Python (Quick but Important)

### Q11: When would you choose Django over NestJS in 2026?

**Answer**:
- Need powerful Admin panel quickly → Django Admin
- Heavy data science / reporting → Python ecosystem
- Your Banglalink experience: Used Django REST Framework for reporting microservices because of excellent ORM and admin.

### Q12: Explain Django Signals with a real example.

**Answer**:
```python
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        send_welcome_notification.delay(instance.id)  # Celery task
```

Used in your Banglalink IAM system for automatic profile + notification.

---

## 5. Practice Tasks for Phase 1 (Must Complete)

1. Build a NestJS + Prisma CRUD API for "Subscription" module (with validation, exception filter, interceptor).
2. Implement custom JwtAuthGuard.
3. Add clustering to your local NestJS app using PM2.
4. Solve these LeetCode problems in TypeScript (medium-hard):
   - Two Sum, LRU Cache, Group Anagrams, Word Break, Course Schedule (Graph)
   - Target: 25 problems this week

**Resources for Practice**:
- NestJS Official Docs: https://docs.nestjs.com/
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- Advanced TS: https://dev.to/niharikaa/top-10-advanced-typescript-concepts-that-every-developer-should-know-4kg4

---

**You have now completed Phase 1 preparation!**

Copy this entire content into your folder:
`Phase_1_Core_Programming/answers.md`

When you are ready, reply with **"Phase 2"** and I will give you the full detailed `answers.md` for Phase 2 (GraphQL, AppSync, Agora, Event-Driven Architecture, Kafka, RabbitMQ, etc.) with even more code examples and your resume connections.

You are building a very strong foundation. Keep speaking the answers daily — you will sound extremely confident in interviews.

Good luck, Fazle! You've got this. 🚀
```

**Copy everything above** and paste directly into your `answers.md` file.  
Let me know when you want **Phase 2**!