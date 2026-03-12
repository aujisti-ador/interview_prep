# JavaScript / TypeScript Deep Dive - Interview Q&A

## Table of Contents
1. [Event Loop](#event-loop)
2. [Closures](#closures)
3. [Prototypes & Inheritance](#prototypes--inheritance)
4. [Async/Await & Promises](#asyncawait--promises)
5. [Error Handling](#error-handling)
6. [Modules (ESM vs CommonJS)](#modules-esm-vs-commonjs)
7. [Hoisting](#hoisting)
8. [The `this` Keyword](#the-this-keyword)
9. [TypeScript Specific](#typescript-specific)

---

## Event Loop

### Q1: Explain the JavaScript Event Loop. How does it work?

**Answer:**
The Event Loop is JavaScript's mechanism for handling asynchronous operations despite being single-threaded. It continuously checks if the call stack is empty and if there are callbacks waiting to be executed.

**Components:**
1. **Call Stack** - Where synchronous code executes (LIFO)
2. **Web APIs/Node APIs** - Handle async operations (setTimeout, fetch, I/O)
3. **Callback Queue (Task Queue)** - Holds callbacks from setTimeout, setInterval, I/O
4. **Microtask Queue** - Holds Promise callbacks, queueMicrotask, MutationObserver
5. **Event Loop** - Coordinates between all these

**Execution Order:**
1. Execute all synchronous code in call stack
2. When stack is empty, process ALL microtasks
3. Process ONE macrotask (callback queue)
4. Repeat

```javascript
console.log('1'); // Sync

setTimeout(() => console.log('2'), 0); // Macrotask

Promise.resolve().then(() => console.log('3')); // Microtask

console.log('4'); // Sync

// Output: 1, 4, 3, 2
```

**Advanced Example:**
```javascript
console.log('Start');

setTimeout(() => {
  console.log('Timeout 1');
  Promise.resolve().then(() => console.log('Promise inside Timeout'));
}, 0);

setTimeout(() => console.log('Timeout 2'), 0);

Promise.resolve()
  .then(() => {
    console.log('Promise 1');
    return Promise.resolve();
  })
  .then(() => console.log('Promise 2'));

console.log('End');

// Output: Start, End, Promise 1, Promise 2, Timeout 1, Promise inside Timeout, Timeout 2
```

### Q2: What is the difference between Microtasks and Macrotasks?

**Answer:**

| Aspect | Microtasks | Macrotasks |
|--------|------------|------------|
| Examples | Promise.then/catch/finally, queueMicrotask, MutationObserver | setTimeout, setInterval, setImmediate, I/O, UI rendering |
| Priority | Higher (executes first) | Lower |
| Processing | ALL microtasks run before next macrotask | ONE macrotask per event loop iteration |
| Queue Draining | Completely drained each cycle | One at a time |

```javascript
// Demonstrating priority
setTimeout(() => console.log('Macrotask'), 0);
queueMicrotask(() => console.log('Microtask 1'));
Promise.resolve().then(() => console.log('Microtask 2'));

// Output: Microtask 1, Microtask 2, Macrotask
```

### Q3: What is process.nextTick() in Node.js and how is it different from setImmediate()?

**Answer:**

```javascript
// process.nextTick() - Executes BEFORE microtask queue (highest priority)
// setImmediate() - Executes in the check phase of event loop (after I/O)

setImmediate(() => console.log('setImmediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('Promise'));

// Output: nextTick, Promise, setImmediate
```

**Priority Order in Node.js:**
1. `process.nextTick()` - Highest
2. Microtasks (Promises)
3. Macrotasks (timers)
4. `setImmediate()` - Check phase

**Warning:** Overusing `process.nextTick()` can starve I/O operations.

---

## Closures

### Q4: What is a closure? Provide practical examples.

**Answer:**
A closure is a function that remembers and accesses variables from its outer (lexical) scope even after the outer function has finished executing.

**Basic Example:**
```javascript
function createCounter() {
  let count = 0; // This variable is "enclosed"

  return {
    increment: function() {
      count++;
      return count;
    },
    decrement: function() {
      count--;
      return count;
    },
    getCount: function() {
      return count;
    }
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount());  // 1
// count is private - cannot be accessed directly
```

**Practical Use Case - Data Privacy:**
```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance;
  const transactions = [];

  return {
    deposit(amount) {
      if (amount > 0) {
        balance += amount;
        transactions.push({ type: 'deposit', amount, date: new Date() });
        return balance;
      }
      throw new Error('Invalid amount');
    },
    withdraw(amount) {
      if (amount > 0 && amount <= balance) {
        balance -= amount;
        transactions.push({ type: 'withdraw', amount, date: new Date() });
        return balance;
      }
      throw new Error('Insufficient funds or invalid amount');
    },
    getBalance() {
      return balance;
    },
    getTransactionHistory() {
      return [...transactions]; // Return copy to prevent mutation
    }
  };
}

const account = createBankAccount(1000);
account.deposit(500);
account.withdraw(200);
console.log(account.getBalance()); // 1300
// balance and transactions are private
```

### Q5: Explain the common "closure in loop" problem and how to fix it.

**Answer:**

**The Problem:**
```javascript
// WRONG - All callbacks reference the same 'i'
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 (not 0, 1, 2)
```

**Solutions:**

```javascript
// Solution 1: Use 'let' (block scoping)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2

// Solution 2: IIFE (Immediately Invoked Function Expression)
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100);
  })(i);
}
// Output: 0, 1, 2

// Solution 3: Closure with factory function
for (var i = 0; i < 3; i++) {
  setTimeout(((j) => () => console.log(j))(i), 100);
}
// Output: 0, 1, 2
```

---

## Prototypes & Inheritance

### Q6: Explain prototypal inheritance in JavaScript.

**Answer:**
JavaScript uses prototypal inheritance where objects can inherit directly from other objects. Every object has an internal `[[Prototype]]` link to another object.

```javascript
// Constructor function approach
function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function() {
  console.log(`${this.name} makes a sound`);
};

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor
  this.breed = breed;
}

// Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function() {
  console.log(`${this.name} barks!`);
};

const dog = new Dog('Max', 'German Shepherd');
dog.speak(); // Max makes a sound
dog.bark();  // Max barks!

console.log(dog instanceof Dog);    // true
console.log(dog instanceof Animal); // true
```

**ES6 Class Syntax (syntactic sugar):**
```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  bark() {
    console.log(`${this.name} barks!`);
  }
}
```

### Q7: What is the prototype chain? How does property lookup work?

**Answer:**

```javascript
const obj = { a: 1 };

// Prototype chain: obj -> Object.prototype -> null

console.log(obj.a);          // 1 (own property)
console.log(obj.toString()); // [object Object] (from Object.prototype)
console.log(obj.foo);        // undefined (not found anywhere)

// Checking property existence
console.log(obj.hasOwnProperty('a'));        // true
console.log(obj.hasOwnProperty('toString')); // false
console.log('toString' in obj);              // true (includes prototype chain)
```

**Custom Prototype Chain:**
```javascript
const grandparent = { familyName: 'Smith' };
const parent = Object.create(grandparent);
parent.parentTrait = 'hardworking';

const child = Object.create(parent);
child.name = 'John';

console.log(child.name);        // John (own)
console.log(child.parentTrait); // hardworking (from parent)
console.log(child.familyName);  // Smith (from grandparent)

// Chain: child -> parent -> grandparent -> Object.prototype -> null
```

---

## Async/Await & Promises

### Q8: Explain Promises and their states.

**Answer:**
A Promise is an object representing the eventual completion or failure of an async operation.

**Three States:**
1. **Pending** - Initial state, neither fulfilled nor rejected
2. **Fulfilled** - Operation completed successfully
3. **Rejected** - Operation failed

```javascript
// Creating a Promise
const myPromise = new Promise((resolve, reject) => {
  const success = true;

  setTimeout(() => {
    if (success) {
      resolve({ data: 'Success!' });
    } else {
      reject(new Error('Operation failed'));
    }
  }, 1000);
});

// Consuming a Promise
myPromise
  .then(result => {
    console.log(result.data);
    return 'Chained value';
  })
  .then(value => console.log(value))
  .catch(error => console.error(error.message))
  .finally(() => console.log('Cleanup'));
```

### Q9: Explain Promise.all, Promise.allSettled, Promise.race, and Promise.any.

**Answer:**

```javascript
const promise1 = Promise.resolve(1);
const promise2 = new Promise(resolve => setTimeout(() => resolve(2), 100));
const promise3 = Promise.reject(new Error('Failed'));
const promise4 = new Promise(resolve => setTimeout(() => resolve(4), 50));

// Promise.all - Fails fast, rejects if ANY promise rejects
Promise.all([promise1, promise2])
  .then(results => console.log(results)); // [1, 2]

Promise.all([promise1, promise3])
  .catch(err => console.log(err.message)); // 'Failed'

// Promise.allSettled - Waits for ALL, never rejects
Promise.allSettled([promise1, promise2, promise3])
  .then(results => console.log(results));
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'fulfilled', value: 2 },
//   { status: 'rejected', reason: Error: Failed }
// ]

// Promise.race - First to settle (resolve OR reject) wins
Promise.race([promise2, promise4])
  .then(result => console.log(result)); // 4 (fastest)

// Promise.any - First to RESOLVE wins (ignores rejections)
Promise.any([promise3, promise1, promise2])
  .then(result => console.log(result)); // 1 (first successful)
```

### Q10: What are common async/await patterns and error handling strategies?

**Answer:**

```javascript
// Basic async/await
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('User not found');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error; // Re-throw for caller to handle
  }
}

// Parallel execution (GOOD - runs concurrently)
async function fetchAllData() {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/comments').then(r => r.json())
  ]);
  return { users, posts, comments };
}

// Sequential execution (when order matters)
async function processInOrder(items) {
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);
  }
  return results;
}

// Error handling with fallback
async function fetchWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await fetch(primaryUrl).then(r => r.json());
  } catch {
    console.log('Primary failed, trying fallback');
    return await fetch(fallbackUrl).then(r => r.json());
  }
}

// Retry pattern
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url).then(r => r.json());
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); // Exponential backoff
    }
  }
}
```

---

## Error Handling

### Q11: Explain error handling best practices in JavaScript/Node.js.

**Answer:**

```javascript
// Custom Error Classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    Error.captureStackTrace(this, ValidationError);
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

// Usage
function validateUser(user) {
  if (!user.email) {
    throw new ValidationError('Email is required', 'email');
  }
  if (!user.email.includes('@')) {
    throw new ValidationError('Invalid email format', 'email');
  }
}

// Centralized error handling
function handleError(error) {
  if (error instanceof ValidationError) {
    return { status: 400, message: error.message, field: error.field };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, message: error.message };
  }
  // Unknown error - log and return generic message
  console.error('Unexpected error:', error);
  return { status: 500, message: 'Internal server error' };
}

// Async error handling in Express
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) throw new NotFoundError('User', req.params.id);
  res.json(user);
}));
```

### Q12: How do you handle unhandled promise rejections and uncaught exceptions in Node.js?

**Answer:**

```javascript
// Unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application should log this and potentially exit gracefully
  // In production, you might want to exit:
  // process.exit(1);
});

// Uncaught Exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Clean up resources, log error, then exit
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  // Close database connections
  await db.close();
  // Close HTTP server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

---

## Modules (ESM vs CommonJS)

### Q13: What are the differences between ESM and CommonJS?

**Answer:**

| Feature | CommonJS (CJS) | ES Modules (ESM) |
|---------|----------------|------------------|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Asynchronous |
| Evaluation | Runtime | Static (compile time) |
| Tree Shaking | Not possible | Supported |
| Top-level await | Not supported | Supported |
| `this` at top level | `exports` object | `undefined` |
| File extension | `.js` or `.cjs` | `.mjs` or `.js` with `"type": "module"` |

```javascript
// CommonJS
// math.js
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
module.exports = { add, subtract };

// app.js
const { add, subtract } = require('./math');
const math = require('./math'); // Can also import whole module

// ES Modules
// math.mjs
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
export default { add, subtract };

// app.mjs
import { add, subtract } from './math.mjs';
import math from './math.mjs'; // Default import
import * as mathModule from './math.mjs'; // Namespace import

// Dynamic import (both)
const module = await import('./math.mjs');
```

### Q14: How do you use ESM and CommonJS together (interoperability)?

**Answer:**

```javascript
// ESM can import CJS
// cjs-module.cjs
module.exports = { name: 'CommonJS Module' };
module.exports.greet = () => 'Hello from CJS';

// esm-module.mjs
import cjsModule from './cjs-module.cjs'; // Default import
console.log(cjsModule.name); // 'CommonJS Module'

// CJS importing ESM (must use dynamic import)
// cjs-app.cjs
async function loadESM() {
  const esmModule = await import('./esm-module.mjs');
  console.log(esmModule.default);
}
loadESM();

// package.json configurations
{
  "type": "module", // Treats .js as ESM
  "exports": {
    "import": "./dist/esm/index.js",
    "require": "./dist/cjs/index.cjs"
  }
}
```

---

## Hoisting

### Q15: Explain hoisting in JavaScript with examples.

**Answer:**
Hoisting is JavaScript's behavior of moving declarations to the top of their scope during compilation.

```javascript
// Variable hoisting with var
console.log(x); // undefined (not ReferenceError)
var x = 5;
console.log(x); // 5

// What actually happens:
var x;
console.log(x); // undefined
x = 5;
console.log(x); // 5

// let and const - Temporal Dead Zone (TDZ)
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;

// Function declarations are fully hoisted
greet(); // "Hello!" - works!
function greet() {
  console.log("Hello!");
}

// Function expressions are NOT fully hoisted
sayHi(); // TypeError: sayHi is not a function
var sayHi = function() {
  console.log("Hi!");
};

// Arrow functions behave like function expressions
sayBye(); // TypeError: sayBye is not a function
var sayBye = () => console.log("Bye!");

// Class declarations are NOT hoisted (TDZ applies)
const pet = new Animal(); // ReferenceError
class Animal {}
```

---

## The `this` Keyword

### Q16: Explain the `this` keyword and how its value is determined.

**Answer:**
The value of `this` depends on HOW a function is called, not where it's defined.

```javascript
// 1. Global context
console.log(this); // Window (browser) or global (Node.js in non-strict)
// In strict mode or ESM: undefined

// 2. Object method - this = the object
const obj = {
  name: 'John',
  greet() {
    console.log(this.name); // 'John'
  }
};
obj.greet();

// 3. Regular function call - this = global/undefined
function showThis() {
  'use strict';
  console.log(this); // undefined in strict mode
}
showThis();

// 4. Arrow functions - inherit this from enclosing scope
const person = {
  name: 'Alice',
  greet: () => {
    console.log(this.name); // undefined! Arrow doesn't have own 'this'
  },
  greetCorrect() {
    const inner = () => {
      console.log(this.name); // 'Alice' - inherited from greetCorrect
    };
    inner();
  }
};

// 5. Constructor call - this = new instance
function User(name) {
  this.name = name;
}
const user = new User('Bob');
console.log(user.name); // 'Bob'

// 6. Explicit binding - call, apply, bind
function introduce(greeting) {
  console.log(`${greeting}, I'm ${this.name}`);
}

const person1 = { name: 'Charlie' };

introduce.call(person1, 'Hello');     // "Hello, I'm Charlie"
introduce.apply(person1, ['Hi']);     // "Hi, I'm Charlie"

const boundFn = introduce.bind(person1);
boundFn('Hey'); // "Hey, I'm Charlie"

// 7. Event handlers
button.addEventListener('click', function() {
  console.log(this); // The button element
});

button.addEventListener('click', () => {
  console.log(this); // Inherited this (probably window/undefined)
});

// Common interview question: fixing 'this' in callbacks
class Timer {
  constructor() {
    this.seconds = 0;
  }

  // WRONG - 'this' will be undefined in callback
  startWrong() {
    setInterval(function() {
      this.seconds++; // Error!
    }, 1000);
  }

  // FIX 1: Arrow function
  startArrow() {
    setInterval(() => {
      this.seconds++;
    }, 1000);
  }

  // FIX 2: bind
  startBind() {
    setInterval(function() {
      this.seconds++;
    }.bind(this), 1000);
  }

  // FIX 3: Save reference
  startSaveRef() {
    const self = this;
    setInterval(function() {
      self.seconds++;
    }, 1000);
  }
}
```

---

## TypeScript Specific

### Q17: What are the key differences between `interface` and `type` in TypeScript?

**Answer:**

```typescript
// Interface - for object shapes, can be extended/merged
interface User {
  id: number;
  name: string;
}

// Declaration merging (only interfaces)
interface User {
  email: string;
}
// User now has id, name, and email

// Extending interfaces
interface Admin extends User {
  permissions: string[];
}

// Type alias - more flexible
type UserType = {
  id: number;
  name: string;
};

// Union types (only type alias)
type Status = 'pending' | 'active' | 'inactive';
type ID = string | number;

// Intersection types
type AdminType = UserType & { permissions: string[] };

// Tuple types
type Point = [number, number];

// Mapped types
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Conditional types
type NonNullable<T> = T extends null | undefined ? never : T;

// When to use which:
// - Interface: For object shapes, especially in libraries (extendable)
// - Type: For unions, intersections, primitives, tuples, mapped types
```

### Q18: Explain TypeScript Generics with practical examples.

**Answer:**

```typescript
// Basic generic function
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(42);
const str = identity('hello'); // Type inferred

// Generic interface
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(item: T): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Generic class
class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async create(item: T): Promise<T> {
    this.items.set(item.id, item);
    return item;
  }

  async update(id: string, partial: Partial<T>): Promise<T> {
    const existing = this.items.get(id);
    if (!existing) throw new Error('Not found');
    const updated = { ...existing, ...partial };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
}

const userRepo = new InMemoryRepository<User>();

// Generic constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'John', age: 30 };
const name = getProperty(user, 'name'); // type is string
const age = getProperty(user, 'age');   // type is number
// getProperty(user, 'invalid'); // Error!

// Multiple type parameters
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

// Generic with default type
interface PaginatedResult<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### Q19: Explain TypeScript utility types.

**Answer:**

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Partial<T> - All properties optional
type UpdateUserDto = Partial<User>;
// { id?: number; name?: string; ... }

// Required<T> - All properties required
type RequiredUser = Required<Partial<User>>;

// Pick<T, K> - Select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string }

// Omit<T, K> - Remove specific properties
type UserWithoutPassword = Omit<User, 'password'>;
// { id: number; name: string; email: string; createdAt: Date }

// Readonly<T> - All properties readonly
type ImmutableUser = Readonly<User>;
// { readonly id: number; readonly name: string; ... }

// Record<K, T> - Create object type with keys K and values T
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>;
const roles: UserRoles = { john: 'admin', jane: 'user' };

// Extract<T, U> - Extract from T those assignable to U
type NumberOrString = number | string | boolean;
type OnlyNumberOrString = Extract<NumberOrString, number | string>;
// number | string

// Exclude<T, U> - Exclude from T those assignable to U
type OnlyBoolean = Exclude<NumberOrString, number | string>;
// boolean

// NonNullable<T> - Remove null and undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string

// ReturnType<T> - Get return type of function
function fetchUser() {
  return { id: 1, name: 'John' };
}
type FetchUserReturn = ReturnType<typeof fetchUser>;
// { id: number; name: string }

// Parameters<T> - Get parameter types as tuple
type FetchUserParams = Parameters<typeof fetchUser>;
// []

// Awaited<T> - Unwrap Promise type
type ResolvedUser = Awaited<Promise<User>>;
// User

// Custom utility type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### Q20: What is the difference between `unknown` and `any`?

**Answer:**

```typescript
// any - Disables type checking entirely (avoid!)
let anyVar: any = 10;
anyVar.foo.bar;        // No error - but will crash at runtime
anyVar.toUpperCase();  // No error
const result: string = anyVar; // No error

// unknown - Type-safe any (must check before use)
let unknownVar: unknown = 10;
// unknownVar.foo;         // Error: Object is of type 'unknown'
// unknownVar.toUpperCase(); // Error

// Must narrow the type first
if (typeof unknownVar === 'string') {
  unknownVar.toUpperCase(); // OK - TypeScript knows it's string
}

if (unknownVar instanceof Date) {
  unknownVar.getTime(); // OK
}

// Type assertion (use carefully)
const str = unknownVar as string;

// Practical use: Parsing external data
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

function processUserData(json: string) {
  const data = parseJSON(json);

  // Must validate before using
  if (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof (data as any).name === 'string'
  ) {
    console.log((data as { name: string }).name);
  }
}

// Better: Use type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as User).id === 'number' &&
    typeof (value as User).name === 'string'
  );
}

const data: unknown = JSON.parse('{"id": 1, "name": "John"}');
if (isUser(data)) {
  console.log(data.name); // TypeScript knows data is User
}
```

---

## Practice Questions

1. What will be the output? Explain why.
```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

2. Implement a debounce function using closures.

3. What is the difference between `Object.create(null)` and `{}`?

4. How would you implement a simple Promise.all from scratch?

5. Explain the difference between `==` and `===` in JavaScript.

6. What is the Temporal Dead Zone?

7. How does garbage collection work in JavaScript/V8?

8. What are WeakMap and WeakSet? When would you use them?

---

## Quick Reference Card

| Concept | Key Point |
|---------|-----------|
| Event Loop | Microtasks > Macrotasks; Stack must be empty |
| Closure | Function + Lexical Environment |
| Prototype | `__proto__` links to `prototype` object |
| `this` | Determined by call site, not definition |
| Hoisting | `var` → undefined; `let/const` → TDZ |
| ESM vs CJS | ESM is static, async; CJS is dynamic, sync |
| `unknown` vs `any` | `unknown` is type-safe; `any` disables checking |
| Interface vs Type | Interface merges; Type is more flexible |
