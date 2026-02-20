```markdown
# Phase 1: Core Programming & Languages - Detailed Interview Answers (Expanded with Advanced JS/TS)
**Prepared for: Fazle Rabbi Ador**  
**Target Role**: Senior / Lead Backend Engineer (Node.js, NestJS, TypeScript heavy)  
**Focus**: Deep JS internals + TypeScript mastery + real-world application (your Agora live streaming, Banglalink 41M users, Daraz performance)  
**Date**: February 2026  

**How to study**:
- One major section per day.
- Speak every answer out loud + record.
- Run/type every code example.
- After each Q, think of 1 follow-up question.
- Mark [x] when confident.

```

## 1. JavaScript Deep Dive – Advanced Questions

### Q1: Explain the JavaScript Event Loop in detail, including microtasks vs macrotasks. What happens in a starvation scenario?

**Detailed Answer**:
JavaScript is single-threaded but non-blocking thanks to the **Event Loop**.

**Components**:
- **Call Stack** — synchronous execution (LIFO).
- **Web APIs / Libuv** (Node) — async ops (timers, I/O, HTTP, DNS, crypto).
- **Microtask Queue** — Promise.then, async/await resolution, queueMicrotask.
- **Macrotask Queue** — setTimeout, setInterval, setImmediate (Node), I/O callbacks, UI rendering (browser).
- **Event Loop phases** (Node): timers → pending callbacks → idle/prepare → poll → check → close callbacks.

**Execution priority**:
1. Execute current script (call stack).
2. Clear **all** microtasks.
3. Take **one** macrotask.
4. Repeat.

**Code example**:
```js
console.log('Start');

setTimeout(() => console.log('setTimeout'), 0);           // macrotask

Promise.resolve().then(() => console.log('Promise 1'))     // microtask
  .then(() => console.log('Promise 2'));                   // chained microtask

queueMicrotask(() => console.log('queueMicrotask'));

console.log('End');
```
**Output**:
```
Start
End
Promise 1
Promise 2
queueMicrotask
setTimeout
```

**Starvation example** (infinite microtasks):
```js
Promise.resolve().then(function loop() {
  console.log('Microtask');
  Promise.resolve().then(loop);   // keeps adding microtasks
});
```
→ Macrotasks (like setTimeout) never run → timers starve. In production: infinite loop in Promise chain blocks timers, health checks, etc.

**Your resume connection**: In live streaming (Agora + WebSockets), heavy microtask usage (subscriptions via AppSync) can delay token expiry timers if not careful.

**Resources**:
- Node.js Event Loop docs: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- Excellent visual: https://www.youtube.com/watch?v=WNrHrwm1wkU

---

### Q2: Explain Closures in depth. Why are they useful in Node.js backends? Show memory leak risk.

**Detailed Answer**:
A closure is a function that remembers its outer scope even after the outer function has returned.

**Classic example**:
```js
function createCounter() {
  let count = 0;
  return function() {
    return ++count;   // remembers count
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

**Benefits in backend**:
- Data privacy (private variables without classes).
- Factory functions (your NestJS services often use them implicitly).
- Memoization / caching (e.g., rate limiter per user).
- Event handlers that need context (WebSocket onMessage).

**Memory leak risk** (common in Node):
```js
const users = new Map();

app.get('/subscribe/:id', (req, res) => {
  const id = req.params.id;
  users.set(id, req);   // request object kept alive forever

  setInterval(() => {
    console.log(users.get(id).ip);   // closure keeps req alive
  }, 10000);
});
```
→ Huge memory leak: each request object (headers, body, socket) stays in heap forever.

**Fix**: Use weak references or avoid capturing large objects in closures.

**Your experience**: In Banglalink notification service, closures in Redis pub/sub handlers must not capture large payloads → use weak refs or explicit cleanup.

---

### Q3: Explain Prototypal Inheritance vs ES6 Classes. When to prefer one over the other in Node.js?

**Detailed Answer**:
**Prototypal** (classic):
```js
function User(name) {
  this.name = name;
}
User.prototype.greet = function() { return `Hi ${this.name}`; };

const u = new User('Fazle');
console.log(u.greet());
```

**ES6 Class** (syntactic sugar over prototypes):
```js
class User {
  constructor(name) {
    this.name = name;
  }
  greet() {
    return `Hi ${this.name}`;
  }
}
```

**Key differences**:
- Classes are stricter (no hoisting, strict mode, no calling without new).
- Classes support `super()`, `extends`, static methods easily.
- Prototypes allow dynamic modification (monkey patching) — useful but dangerous.

**When to use in backend**:
- **Classes** — default in NestJS (decorators work best), readability, team consistency.
- **Prototypes** — performance-critical hot paths (rare), extending built-ins, or legacy code.

**Your resume**: NestJS uses classes everywhere → interviewers expect you to know it's still prototypal under the hood.

---

### Q4: What are Iterators and Generators in JS? Show a real backend use case.

**Detailed Answer**:
**Iterator** — object with `next()` method returning `{value, done}`.

**Generator** — function* that can pause/resume with yield.

```js
function* idGenerator() {
  let id = 1;
  while (true) yield id++;
}

const gen = idGenerator();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2
```

**Backend use cases**:
- Streaming large datasets (e.g., paginated DynamoDB scan without loading all).
- Custom async iterators for processing Kafka messages in batches.
- Rate-limited API calls (yield after each request).

**Async generator example** (your streaming context):
```js
async function* streamViewerIds() {
  while (true) {
    const viewers = await fetchActiveViewersFromDynamo(); // paginated
    for (const v of viewers) yield v.id;
    await delay(5000);
  }
}
```

**ES2025 note**: Iterator helpers (.map, .filter, .take) are now standard.

---

### Q5: Explain 'this' keyword pitfalls in Node.js. How does NestJS avoid them?

**Detailed Answer**:
`this` depends on **call site**:
- Arrow function → lexical this (no own this).
- Regular function → dynamic this.

**Common pitfall**:
```js
class StreamService {
  active = 0;

  startMonitoring() {
    setInterval(function() {
      this.active++;   // this = global / undefined in strict mode
    }, 1000);
  }
}
```

**Fixes**:
- Arrow: `setInterval(() => this.active++)`
- bind: `setInterval(this.increment.bind(this))`
- NestJS: Dependency injection + class methods usually use arrow or class fields → safe.

**Your code style**: In NestJS controllers/services, prefer arrow functions for callbacks.

---

### Q6: What is Memoization? Implement a simple memoized function for expensive computation.

**Detailed Answer**:
Memoization = caching function results for same inputs.

**Implementation**:
```js
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const expensiveCalc = memoize((n) => {
  console.log('Computing...');
  return n * n; // pretend heavy
});

console.log(expensiveCalc(5)); // Computing... 25
console.log(expensiveCalc(5)); // 25 (cached)
```

**Backend use**: Cache Agora token generation per channel (if tokens are expensive to mint).

---

### Q7: Explain Temporal Dead Zone (TDZ). Why is it better than var hoisting?

**Detailed Answer**:
TDZ = time between entering scope and variable declaration where let/const throw ReferenceError.

```js
console.log(a); // ReferenceError (TDZ)
let a = 10;
```

**Why better**:
- Prevents bugs from using variables before init.
- Forces better code discipline (declare before use).

**In NestJS**: TypeScript + let/const everywhere → no TDZ surprises.

---

## 2. Advanced TypeScript for Node.js / NestJS

### Q8: Explain Generics in TypeScript. Show a real NestJS service example.

**Detailed Answer**:
Generics = reusable components with type safety.

**Example**:
```ts
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

@Injectable()
export class UserService {
  async findOne<T>(id: string): Promise<ApiResponse<T>> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return { success: true, data: user as T };
  }
}
```

**NestJS built-in**: Many modules use generics (e.g., `Repository<T>` in TypeORM).

---

### Q9: What are Decorators in TypeScript? How does NestJS use them?

**Detailed Answer**:
Decorators = functions that modify classes/methods/properties at design time (metadata reflection).

**Example**:
```ts
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    console.log(`Calling ${propertyKey}`);
    return original.apply(this, args);
  };
}

class Service {
  @Log
  async heavyTask() { /* ... */ }
}
```

**NestJS usage**:
- `@Injectable()`, `@Controller()`, `@Get()`, `@UseGuards()`, `@Body()` — all decorators.
- Enable via `experimentalDecorators` + `emitDecoratorMetadata` in tsconfig.

**Why powerful**: DI, routing, validation all declarative.

---

### Q10: Explain Type Narrowing. Give 3 ways + NestJS validation example.

**Detailed Answer**:
Narrowing = TypeScript refines type inside block.

**Ways**:
1. `typeof` guard
2. `instanceof`
3. User-defined type guard
4. `in` operator
5. Discriminated unions

**Example**:
```ts
type StreamEvent = { type: 'join'; userId: string } | { type: 'leave'; userId: string };

function handleEvent(event: StreamEvent) {
  if (event.type === 'join') {
    // event narrowed to { type: 'join'; userId: string }
    console.log(`User ${event.userId} joined`);
  }
}
```

**In NestJS**: DTO validation with class-validator + ValidationPipe narrows types automatically.

---

### Q11: What is `never` type? When do you use it in backend code?

**Detailed Answer**:
`never` = type that never occurs (exhaustive checks, impossible values).

**Uses**:
```ts
function throwError(msg: string): never {
  throw new Error(msg);
}

function assertNever(x: never): never {
  throw new Error("Unexpected: " + x);
}

// Exhaustive switch
function getStatus(code: 'ok' | 'error' | 'pending'): string {
  switch (code) {
    case 'ok': return 'OK';
    case 'error': return 'Error';
    case 'pending': return 'Pending';
    default: return assertNever(code); // TypeScript knows if new case added → error
  }
}
```

**Your use case**: In error handling filters or exhaustive event handlers in streaming.

---

### Q12: Explain `unknown` vs `any`. How should you use them in NestJS?

**Detailed Answer**:
- `any` → disables type checking (dangerous).
- `unknown` → safer: you must narrow before using.

**Best practice**:
```ts
async handleRawData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'userId' in data) {
    // safe access
  } else {
    throw new BadRequestException('Invalid payload');
  }
}
```

**NestJS**: Use `unknown` for raw body parsers, then validate with DTOs.

---

## 3. Practice Tasks – Advanced Level
1. Implement a memoized rate limiter using closure + Map<userId, {count, resetTime}>.
2. Create an async generator that yields paginated DynamoDB results.
3. Write a custom NestJS decorator `@RateLimit(100)` using metadata reflection.
4. Solve these LeetCode (JS/TS): LRU Cache, Median of Two Sorted Arrays, Word Ladder, Trapping Rain Water (hard level).

**Extra Resources (2025–2026 focus)**:
- Advanced TS: https://www.typescriptlang.org/docs/handbook/2/generics.html
- JS Patterns: https://javascript.info/
- Event Loop deep dive: https://www.youtube.com/watch?v=cCOL7MC4Pl0
- GreatFrontend advanced JS: https://www.greatfrontend.com/

---

You now have a **very strong, senior-level Phase 1** with 12+ advanced questions.

When ready, reply **"Phase 2"** for GraphQL + AppSync + Agora + Event-Driven deep dive.

Good luck — you're building elite-level knowledge! 🚀
```