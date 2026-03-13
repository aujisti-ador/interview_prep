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

## Generators and Iterators

### Q21: What are Generators and Iterators in JavaScript? How do they work?

**Answer:**
A **generator** is a special function declared with `function*` that can pause and resume its execution using the `yield` keyword. Generators return an **iterator** object that conforms to both the **iterable protocol** (`Symbol.iterator`) and the **iterator protocol** (`next()` method).

**The Iterator Protocol:**
An object is an iterator when it implements a `next()` method that returns `{ value: any, done: boolean }`.

**The Iterable Protocol:**
An object is iterable when it implements `Symbol.iterator`, returning an iterator.

**Basic Generator:**
```javascript
function* simpleGenerator() {
  console.log('Start');
  yield 1;
  console.log('After first yield');
  yield 2;
  console.log('After second yield');
  yield 3;
  console.log('End');
}

const gen = simpleGenerator();

console.log(gen.next()); // Start → { value: 1, done: false }
console.log(gen.next()); // After first yield → { value: 2, done: false }
console.log(gen.next()); // After second yield → { value: 3, done: false }
console.log(gen.next()); // End → { value: undefined, done: true }
```

**Two-way Communication with `yield`:**
```javascript
function* conversation() {
  const name = yield 'What is your name?';
  const age = yield `Hello ${name}! How old are you?`;
  return `${name} is ${age} years old.`;
}

const chat = conversation();
console.log(chat.next());           // { value: 'What is your name?', done: false }
console.log(chat.next('Alice'));    // { value: 'Hello Alice! How old are you?', done: false }
console.log(chat.next(30));         // { value: 'Alice is 30 years old.', done: true }
```

**Interview Code Example — Implement a `range()` Generator:**
```javascript
function* range(start: number, end: number, step: number = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

// Usage
for (const num of range(0, 10, 2)) {
  console.log(num); // 0, 2, 4, 6, 8
}

// Convert to array
const nums = [...range(1, 6)]; // [1, 2, 3, 4, 5]
```

**Custom Iterable with `Symbol.iterator`:**
```javascript
class FibonacciSequence {
  constructor(private limit: number) {}

  *[Symbol.iterator]() {
    let a = 0, b = 1;
    for (let i = 0; i < this.limit; i++) {
      yield a;
      [a, b] = [b, a + b];
    }
  }
}

const fib = new FibonacciSequence(8);
console.log([...fib]); // [0, 1, 1, 2, 3, 5, 8, 13]

// Works with destructuring and for...of
const [first, second, third] = new FibonacciSequence(10);
console.log(first, second, third); // 0 1 1
```

**Generator Delegation with `yield*`:**
```javascript
function* innerGenerator() {
  yield 'a';
  yield 'b';
}

function* outerGenerator() {
  yield 1;
  yield* innerGenerator(); // Delegates to innerGenerator
  yield 2;
}

console.log([...outerGenerator()]); // [1, 'a', 'b', 2]

// Practical use: flatten nested arrays
function* flatten(arr: any[]): Generator<any> {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flatten(item); // Recursive delegation
    } else {
      yield item;
    }
  }
}

console.log([...flatten([1, [2, [3, 4]], 5])]); // [1, 2, 3, 4, 5]
```

**Async Generators:**
```javascript
async function* fetchPages(baseUrl: string) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}?page=${page}`);
    const data = await response.json();
    hasMore = data.hasNextPage;
    page++;
    yield data.items;
  }
}

// Consuming async generator with for-await-of
async function getAllItems() {
  const allItems: any[] = [];
  for await (const items of fetchPages('/api/users')) {
    allItems.push(...items);
  }
  return allItems;
}
```

**Infinite Sequence (Lazy Evaluation):**
```javascript
function* naturalNumbers() {
  let n = 1;
  while (true) {
    yield n++;
  }
}

// Take only what you need — no memory wasted
function* take<T>(iterable: Iterable<T>, count: number) {
  let i = 0;
  for (const item of iterable) {
    if (i >= count) return;
    yield item;
    i++;
  }
}

console.log([...take(naturalNumbers(), 5)]); // [1, 2, 3, 4, 5]
```

> **Interview Tip:** Generators are commonly asked in the context of lazy evaluation, implementing custom iteration, and understanding how libraries like Redux-Saga work under the hood. Be ready to explain how `yield` pauses execution and how `next()` resumes it — this demonstrates deep understanding of JavaScript execution control.

---

## WeakMap and WeakSet

### Q22: What are WeakMap and WeakSet? How do they differ from Map and Set?

**Answer:**
`WeakMap` and `WeakSet` are collection types that hold **weak references** to their keys (WeakMap) or values (WeakSet). This means the entries do not prevent garbage collection — if there is no other reference to the key/value, it can be collected.

**Key Differences from Map/Set:**

| Feature | Map / Set | WeakMap / WeakSet |
|---------|-----------|-------------------|
| Key types | Any value | Objects only (no primitives) |
| Enumerable | Yes (`forEach`, `keys`, `values`, `entries`) | No — cannot iterate |
| `.size` property | Yes | No |
| Garbage collection | Keys/values are strong references | Keys/values are weak — GC eligible |
| Use case | General-purpose collection | Metadata, caching, private data |

**WeakMap — Private Data Pattern:**
```typescript
// Using WeakMap for truly private instance data
const _privateData = new WeakMap<object, { balance: number }>();

class BankAccount {
  constructor(initialBalance: number) {
    _privateData.set(this, { balance: initialBalance });
  }

  get balance(): number {
    return _privateData.get(this)!.balance;
  }

  deposit(amount: number): void {
    const data = _privateData.get(this)!;
    data.balance += amount;
  }

  withdraw(amount: number): void {
    const data = _privateData.get(this)!;
    if (amount > data.balance) throw new Error('Insufficient funds');
    data.balance -= amount;
  }
}

const account = new BankAccount(1000);
account.deposit(500);
console.log(account.balance); // 1500
// When `account` is garbage collected, the WeakMap entry is automatically removed
```

**WeakMap — Caching with Automatic Cleanup:**
```typescript
const cache = new WeakMap<object, any>();

function expensiveComputation(obj: object): any {
  if (cache.has(obj)) {
    console.log('Cache hit');
    return cache.get(obj);
  }

  console.log('Computing...');
  const result = /* expensive work */ JSON.parse(JSON.stringify(obj));
  cache.set(obj, result);
  return result;
}

let myObj: object | null = { data: 'large dataset' };
expensiveComputation(myObj);  // Computing...
expensiveComputation(myObj);  // Cache hit

myObj = null; // The cache entry for myObj is now eligible for GC
// No manual cleanup needed — WeakMap handles it
```

**WeakMap — DOM Node Metadata:**
```javascript
const nodeMetadata = new WeakMap();

function trackElement(element) {
  nodeMetadata.set(element, {
    clickCount: 0,
    createdAt: Date.now(),
  });
}

function recordClick(element) {
  const meta = nodeMetadata.get(element);
  if (meta) meta.clickCount++;
}

// When the DOM element is removed and garbage collected,
// the metadata is automatically cleaned up — no memory leak
```

**WeakSet — Tracking Object State:**
```typescript
const visited = new WeakSet<object>();

function processNode(node: object): void {
  if (visited.has(node)) {
    console.log('Already processed, skipping');
    return;
  }
  visited.add(node);
  console.log('Processing node...');
  // ... do work ...
}

let obj1: object | null = { id: 1 };
let obj2: object | null = { id: 2 };

processNode(obj1); // Processing node...
processNode(obj1); // Already processed, skipping
processNode(obj2); // Processing node...

obj1 = null; // Entry in WeakSet becomes eligible for GC
```

**WeakRef and FinalizationRegistry (Advanced):**
```typescript
// WeakRef lets you hold a weak reference to an object
// FinalizationRegistry notifies you when an object is GC'd

const registry = new FinalizationRegistry((heldValue: string) => {
  console.log(`Object "${heldValue}" was garbage collected`);
});

function createTrackedObject(name: string) {
  const obj = { name, data: new Array(1000).fill('x') };
  registry.register(obj, name);
  return new WeakRef(obj);
}

let ref = createTrackedObject('heavy-object');
console.log(ref.deref()?.name); // 'heavy-object'

// After the original object is no longer reachable and GC runs:
// Console: Object "heavy-object" was garbage collected
// ref.deref() would return undefined
```

> **Interview Tip:** WeakMap is a frequent interview topic when discussing memory management. The key insight is: "WeakMap lets you associate data with objects without preventing those objects from being garbage collected." Compare this to a regular Map where the key reference alone keeps the object alive. Mention real-world uses like caching, private data, and DOM metadata tracking to show practical experience.

---

## Proxy and Reflect

### Q23: What are Proxy and Reflect in JavaScript? How do you use them?

**Answer:**
A **Proxy** wraps a target object and intercepts fundamental operations (get, set, delete, etc.) through **handler traps**. **Reflect** is a built-in object that provides methods corresponding to the same operations — it serves as the default behavior you can call from within traps.

**Proxy Handler Traps:**

| Trap | Intercepts | Example |
|------|-----------|---------|
| `get` | Property access | `obj.prop` |
| `set` | Property assignment | `obj.prop = value` |
| `has` | `in` operator | `'prop' in obj` |
| `deleteProperty` | `delete` operator | `delete obj.prop` |
| `apply` | Function call | `fn()` |
| `construct` | `new` operator | `new Fn()` |
| `ownKeys` | `Object.keys()` | `Object.keys(obj)` |

**Basic Proxy — Validation:**
```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

function createValidatedUser(user: User): User {
  return new Proxy(user, {
    set(target, property, value, receiver) {
      if (property === 'age') {
        if (typeof value !== 'number' || value < 0 || value > 150) {
          throw new RangeError(`Invalid age: ${value}. Must be between 0 and 150.`);
        }
      }
      if (property === 'email') {
        if (typeof value !== 'string' || !value.includes('@')) {
          throw new TypeError(`Invalid email: ${value}`);
        }
      }
      if (property === 'name') {
        if (typeof value !== 'string' || value.length < 2) {
          throw new TypeError('Name must be at least 2 characters');
        }
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}

const user = createValidatedUser({ name: 'Alice', age: 30, email: 'alice@example.com' });
user.age = 31;          // OK
// user.age = -5;       // RangeError: Invalid age: -5
// user.email = 'bad';  // TypeError: Invalid email: bad
```

**Auto-Logging Proxy:**
```typescript
function createLoggingProxy<T extends object>(target: T, label: string): T {
  return new Proxy(target, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value === 'function') {
        return function (...args: any[]) {
          console.log(`[${label}] Called ${String(property)}(${args.map(a => JSON.stringify(a)).join(', ')})`);
          const result = value.apply(target, args);
          console.log(`[${label}] ${String(property)} returned:`, result);
          return result;
        };
      }
      console.log(`[${label}] Get ${String(property)} →`, value);
      return value;
    },
    set(target, property, value, receiver) {
      console.log(`[${label}] Set ${String(property)} =`, value);
      return Reflect.set(target, property, value, receiver);
    }
  });
}

const api = createLoggingProxy(
  {
    users: [{ id: 1, name: 'Alice' }],
    getUser(id: number) { return this.users.find((u: any) => u.id === id); }
  },
  'API'
);

api.getUser(1);
// [API] Called getUser(1)
// [API] getUser returned: { id: 1, name: 'Alice' }
```

**Negative Array Indexing (Python-style):**
```typescript
function createNegativeArray<T>(arr: T[]): T[] {
  return new Proxy(arr, {
    get(target, property, receiver) {
      const index = Number(property);
      if (!isNaN(index) && index < 0) {
        return target[target.length + index];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      const index = Number(property);
      if (!isNaN(index) && index < 0) {
        target[target.length + index] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}

const arr = createNegativeArray([1, 2, 3, 4, 5]);
console.log(arr[-1]); // 5
console.log(arr[-2]); // 4
arr[-1] = 99;
console.log(arr);     // [1, 2, 3, 4, 99]
```

**Observable Object Pattern:**
```typescript
type Listener = (property: string, oldValue: any, newValue: any) => void;

function createObservable<T extends object>(target: T): T & { onChange(fn: Listener): void } {
  const listeners: Listener[] = [];

  const proxy = new Proxy(target, {
    set(target, property, value, receiver) {
      const oldValue = Reflect.get(target, property, receiver);
      const result = Reflect.set(target, property, value, receiver);
      if (oldValue !== value) {
        listeners.forEach(fn => fn(String(property), oldValue, value));
      }
      return result;
    }
  }) as T & { onChange(fn: Listener): void };

  (proxy as any).onChange = (fn: Listener) => listeners.push(fn);

  return proxy;
}

const state = createObservable({ count: 0, name: 'App' });
state.onChange((prop, oldVal, newVal) => {
  console.log(`${prop} changed from ${oldVal} to ${newVal}`);
});

state.count = 1;   // count changed from 0 to 1
state.name = 'New'; // name changed from App to New
```

**Reflect Methods and their Purpose:**
```javascript
const obj = { x: 1, y: 2 };

// Reflect mirrors Proxy traps — use it for default behavior inside traps
Reflect.get(obj, 'x');              // 1 (same as obj.x)
Reflect.set(obj, 'z', 3);           // true (same as obj.z = 3)
Reflect.has(obj, 'x');              // true (same as 'x' in obj)
Reflect.deleteProperty(obj, 'z');   // true (same as delete obj.z)
Reflect.ownKeys(obj);               // ['x', 'y'] (includes symbols)

// Reflect.apply — safer than Function.prototype.apply
Reflect.apply(Math.max, null, [1, 2, 3]); // 3
```

> **Interview Tip:** Proxy is a powerful metaprogramming tool. Interviewers often ask you to implement validation, logging, or observable patterns using Proxy. Always mention Reflect as the proper way to forward operations inside traps — it returns booleans indicating success/failure rather than throwing, making it more predictable. Note that Proxy cannot be transpiled by Babel, so it requires native ES6+ support.

---

## JavaScript Symbols

### Q24: What are Symbols in JavaScript? Explain well-known Symbols.

**Answer:**
A **Symbol** is a primitive type introduced in ES6 that creates a unique, immutable identifier. No two symbols are the same, even if they have the same description.

**Creating Symbols:**
```javascript
const sym1 = Symbol('description');
const sym2 = Symbol('description');
console.log(sym1 === sym2); // false — always unique

console.log(typeof sym1); // 'symbol'
console.log(sym1.toString()); // 'Symbol(description)'
console.log(sym1.description); // 'description'
```

**Symbol.for() — Global Symbol Registry:**
```javascript
// Symbol.for() creates/retrieves a symbol from a global registry
const globalSym1 = Symbol.for('app.id');
const globalSym2 = Symbol.for('app.id');
console.log(globalSym1 === globalSym2); // true — same symbol from registry

// Symbol.keyFor() — retrieve the key for a global symbol
console.log(Symbol.keyFor(globalSym1)); // 'app.id'
console.log(Symbol.keyFor(Symbol('local'))); // undefined — not in global registry
```

**Symbols as Unique Property Keys:**
```typescript
const LOG_LEVEL = Symbol('logLevel');
const INTERNAL_ID = Symbol('internalId');

class Service {
  [LOG_LEVEL] = 'info';
  [INTERNAL_ID] = crypto.randomUUID();
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

const svc = new Service('auth');
console.log(svc.name);          // 'auth'
console.log(svc[LOG_LEVEL]);    // 'info'
console.log(svc[INTERNAL_ID]);  // 'a1b2c3...'

// Symbol properties are NOT enumerable by default
console.log(Object.keys(svc));              // ['name']
console.log(Object.getOwnPropertyNames(svc)); // ['name']
console.log(Object.getOwnPropertySymbols(svc)); // [Symbol(logLevel), Symbol(internalId)]
```

**Well-Known Symbols:**

**`Symbol.iterator`** — Define custom iteration:
```typescript
class NumberRange {
  constructor(private start: number, private end: number) {}

  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

const range = new NumberRange(1, 5);
console.log([...range]); // [1, 2, 3, 4, 5]
for (const n of range) { console.log(n); } // 1, 2, 3, 4, 5
```

**`Symbol.toPrimitive`** — Custom type coercion:
```typescript
class Money {
  constructor(private amount: number, private currency: string) {}

  [Symbol.toPrimitive](hint: 'number' | 'string' | 'default') {
    switch (hint) {
      case 'number':
        return this.amount;
      case 'string':
        return `${this.amount} ${this.currency}`;
      case 'default':
        return this.amount;
    }
  }
}

const price = new Money(42.99, 'USD');
console.log(+price);        // 42.99 (hint: 'number')
console.log(`${price}`);    // '42.99 USD' (hint: 'string')
console.log(price + 10);    // 52.99 (hint: 'default')
```

**`Symbol.hasInstance`** — Customize `instanceof`:
```typescript
class EvenNumber {
  static [Symbol.hasInstance](num: unknown): boolean {
    return typeof num === 'number' && num % 2 === 0;
  }
}

console.log(4 instanceof EvenNumber);  // true
console.log(3 instanceof EvenNumber);  // false
console.log(10 instanceof EvenNumber); // true
```

**`Symbol.species`** — Control derived class constructor:
```javascript
class SpecialArray extends Array {
  static get [Symbol.species]() {
    return Array; // map/filter/slice return plain Array, not SpecialArray
  }
}

const special = new SpecialArray(1, 2, 3);
const mapped = special.map(x => x * 2);
console.log(mapped instanceof SpecialArray); // false
console.log(mapped instanceof Array);        // true
```

> **Interview Tip:** Symbols demonstrate understanding of JavaScript's metaprogramming capabilities. The most commonly asked are `Symbol.iterator` (custom iteration), `Symbol.toPrimitive` (type coercion control), and using symbols as unique property keys for collision-free APIs. Remember that symbols are not serialized by `JSON.stringify()` and are not enumerable with `for...in` or `Object.keys()`.

---

## Advanced TypeScript — Template Literal Types & Branded Types

### Q25: Explain advanced TypeScript type-level features: template literal types, branded types, recursive types, `infer`, and discriminated unions.

**Answer:**

**Template Literal Types — Dynamic String Unions:**
```typescript
// Basic template literal types
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type APIVersion = 'v1' | 'v2';
type Endpoint = `/api/${APIVersion}/users` | `/api/${APIVersion}/posts`;
// Results in: '/api/v1/users' | '/api/v1/posts' | '/api/v2/users' | '/api/v2/posts'

// Event handler types
type DOMEvent = 'click' | 'focus' | 'blur';
type EventHandler = `on${Capitalize<DOMEvent>}`;
// 'onClick' | 'onFocus' | 'onBlur'

// String manipulation utility types
type UpperSnake<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? `${Uppercase<First>}${Rest extends Capitalize<Rest> ? `_${UpperSnake<Rest>}` : UpperSnake<Rest>}`
    : S;

// Practical: type-safe CSS property builder
type CSSUnit = 'px' | 'em' | 'rem' | '%' | 'vh' | 'vw';
type CSSValue = `${number}${CSSUnit}`;

function setWidth(value: CSSValue): void {
  console.log(`Setting width to ${value}`);
}

setWidth('100px');   // OK
setWidth('2.5rem');  // OK
// setWidth('100');  // Error: not assignable to CSSValue

// Type-safe route parameters
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type RouteParams = ExtractParams<'/api/users/:userId/posts/:postId'>;
// 'userId' | 'postId'
```

**Branded / Nominal Types — Type-Safe IDs:**
```typescript
// The problem: plain string IDs are interchangeable
type UserId_Bad = string;
type OrderId_Bad = string;

// Nothing stops you from passing an OrderId where UserId is expected!
// function getUser(id: UserId_Bad) { ... }
// getUser(someOrderId); // No error — but it's a bug!

// The solution: branded types
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type ProductId = Brand<string, 'ProductId'>;

// Factory functions create branded values
function createUserId(id: string): UserId {
  // Add validation here if needed
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  return id as OrderId;
}

// Now the type system prevents mixing IDs
function getUser(id: UserId): void {
  console.log(`Fetching user: ${id}`);
}

function getOrder(id: OrderId): void {
  console.log(`Fetching order: ${id}`);
}

const userId = createUserId('user-123');
const orderId = createOrderId('order-456');

getUser(userId);    // OK
getOrder(orderId);  // OK
// getUser(orderId); // Error: OrderId is not assignable to UserId
// getUser('raw');   // Error: string is not assignable to UserId

// Branded primitives for units
type Kilometers = Brand<number, 'Kilometers'>;
type Miles = Brand<number, 'Miles'>;

function kmToMiles(km: Kilometers): Miles {
  return (km * 0.621371) as Miles;
}

const distance = 100 as Kilometers;
const miles = kmToMiles(distance); // OK
// kmToMiles(100);                 // Error: number not assignable to Kilometers
```

**Recursive Types — DeepPartial and DeepReadonly:**
```typescript
// DeepPartial — makes all properties optional at every level
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// DeepReadonly — makes all properties readonly at every level
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// DeepRequired
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// Practical usage
interface AppConfig {
  server: {
    port: number;
    host: string;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
}

// You can pass partial config at any depth
function mergeConfig(base: AppConfig, overrides: DeepPartial<AppConfig>): AppConfig {
  // Deep merge logic here
  return { ...base, ...overrides } as AppConfig;
}

mergeConfig(defaultConfig, {
  server: { ssl: { enabled: true } } // Only override what you need
});

// JSON type (recursive by nature)
type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
interface JSONObject { [key: string]: JSONValue }
interface JSONArray extends Array<JSONValue> {}
```

**The `infer` Keyword — Extracting Types from Conditional Types:**
```typescript
// infer lets you "capture" a type within a conditional type

// Extract return type (how ReturnType<T> works internally)
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Result = MyReturnType<() => { id: number; name: string }>;
// { id: number; name: string }

// Extract promise result type
type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

type A = UnwrapPromise<Promise<Promise<string>>>; // string

// Extract array element type
type ElementOf<T> = T extends Array<infer E> ? E : never;
type Item = ElementOf<string[]>; // string

// Extract function first parameter
type FirstParam<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;
type Param = FirstParam<(name: string, age: number) => void>; // string

// Practical: extract event payload type from event map
interface EventMap {
  login: { userId: string; timestamp: number };
  logout: { userId: string };
  purchase: { productId: string; amount: number };
}

type EventPayload<E extends keyof EventMap> = EventMap[E];

function emit<E extends keyof EventMap>(event: E, payload: EventPayload<E>): void {
  console.log(`Event: ${event}`, payload);
}

emit('login', { userId: '123', timestamp: Date.now() });  // OK
// emit('login', { productId: '456' });                    // Error!

// Advanced: infer in template literal types
type ParseQueryParam<S extends string> =
  S extends `${infer Key}=${infer Value}`
    ? { key: Key; value: Value }
    : never;

type Parsed = ParseQueryParam<'name=Alice'>; // { key: 'name'; value: 'Alice' }
```

**Discriminated Unions for State Machines:**
```typescript
// Each state has a unique 'status' discriminant property
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function handleRequest<T>(state: RequestState<T>): string {
  switch (state.status) {
    case 'idle':
      return 'Ready to fetch';
    case 'loading':
      return 'Loading...';
    case 'success':
      // TypeScript narrows: state.data is available here
      return `Got data: ${JSON.stringify(state.data)}`;
    case 'error':
      // TypeScript narrows: state.error is available here
      return `Error: ${state.error.message}`;
  }
}

// More complex state machine: order lifecycle
type OrderState =
  | { status: 'draft'; items: string[] }
  | { status: 'placed'; orderId: string; placedAt: Date }
  | { status: 'shipped'; orderId: string; trackingNumber: string }
  | { status: 'delivered'; orderId: string; deliveredAt: Date }
  | { status: 'cancelled'; orderId: string; reason: string };

function getOrderAction(order: OrderState): string {
  switch (order.status) {
    case 'draft':
      return `Place order with ${order.items.length} items`;
    case 'placed':
      return `Waiting for shipment (Order: ${order.orderId})`;
    case 'shipped':
      return `Track: ${order.trackingNumber}`;
    case 'delivered':
      return `Delivered at ${order.deliveredAt.toISOString()}`;
    case 'cancelled':
      return `Cancelled: ${order.reason}`;
  }
}

// Exhaustiveness check helper
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// Add assertNever to default case to catch unhandled states at compile time
```

> **Interview Tip:** Advanced TypeScript types separate senior from mid-level candidates. Template literal types show you can model string-based APIs at the type level. Branded types show you understand nominal typing patterns in a structurally-typed system. The `infer` keyword is key to building custom utility types. Discriminated unions are essential for modeling state — interviewers love seeing `assertNever` for exhaustiveness checking.

---

## TypeScript Decorators

### Q26: Explain TypeScript Decorators — types, execution order, and practical patterns.

**Answer:**
Decorators are a mechanism for adding metadata and modifying classes, methods, properties, and parameters at design time. They are functions that receive information about the decorated target and can modify or annotate it.

**Note:** TypeScript currently supports legacy/experimental decorators (enabled with `experimentalDecorators`). The TC39 Stage 3 decorator proposal introduces a different API. Both are covered below.

**Class Decorator:**
```typescript
// A class decorator receives the constructor and can return a new one
function Logger(prefix: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        console.log(`[${prefix}] Creating instance of ${constructor.name}`);
        super(...args);
      }
    };
  };
}

function Sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@Logger('APP')
@Sealed
class UserService {
  constructor(public name: string) {}
}

const svc = new UserService('auth');
// [APP] Creating instance of UserService
```

**Method Decorator:**
```typescript
// Method decorator for timing execution
function Measure(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);

    // Handle async methods
    if (result instanceof Promise) {
      return result.then((res: any) => {
        console.log(`${propertyKey} took ${(performance.now() - start).toFixed(2)}ms`);
        return res;
      });
    }

    console.log(`${propertyKey} took ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  };

  return descriptor;
}

// Retry decorator
function Retry(attempts: number, delay: number = 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      for (let i = 0; i < attempts; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          if (i === attempts - 1) throw error;
          console.log(`${propertyKey} failed, retrying (${i + 1}/${attempts})...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    };

    return descriptor;
  };
}

class ApiClient {
  @Measure
  @Retry(3, 500)
  async fetchData(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
```

**Property Decorator:**
```typescript
// Validate property values
function Min(minValue: number) {
  return function (target: any, propertyKey: string) {
    let value: number;

    Object.defineProperty(target, propertyKey, {
      get() { return value; },
      set(newValue: number) {
        if (newValue < minValue) {
          throw new RangeError(`${propertyKey} must be >= ${minValue}, got ${newValue}`);
        }
        value = newValue;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

function MaxLength(max: number) {
  return function (target: any, propertyKey: string) {
    let value: string;

    Object.defineProperty(target, propertyKey, {
      get() { return value; },
      set(newValue: string) {
        if (newValue.length > max) {
          throw new RangeError(`${propertyKey} must be <= ${max} chars, got ${newValue.length}`);
        }
        value = newValue;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

class Product {
  @MaxLength(100)
  name: string = '';

  @Min(0)
  price: number = 0;

  @Min(0)
  stock: number = 0;
}

const product = new Product();
product.name = 'Widget';   // OK
product.price = 29.99;     // OK
// product.price = -5;     // RangeError: price must be >= 0
```

**Parameter Decorator:**
```typescript
// Parameter decorators mark parameters for validation
const REQUIRED_PARAMS = Symbol('requiredParams');

function Required(target: any, propertyKey: string, parameterIndex: number) {
  const existing: number[] = Reflect.getOwnMetadata(REQUIRED_PARAMS, target, propertyKey) || [];
  existing.push(parameterIndex);
  Reflect.defineMetadata(REQUIRED_PARAMS, existing, target, propertyKey);
}

function Validate(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const requiredParams: number[] = Reflect.getOwnMetadata(REQUIRED_PARAMS, target, propertyKey) || [];
    for (const index of requiredParams) {
      if (args[index] === undefined || args[index] === null) {
        throw new Error(`Parameter at index ${index} is required for ${propertyKey}`);
      }
    }
    return originalMethod.apply(this, args);
  };

  return descriptor;
}

class OrderService {
  @Validate
  createOrder(@Required customerId: string, @Required items: string[]) {
    return { customerId, items, id: crypto.randomUUID() };
  }
}
```

**Decorator Composition — Execution Order:**
```typescript
// Decorators compose bottom-up (closest to the target runs first)
// But decorator FACTORIES execute top-down

function First() {
  console.log('First factory');
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('First decorator');
  };
}

function Second() {
  console.log('Second factory');
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('Second decorator');
  };
}

class Example {
  @First()    // Factory runs 1st
  @Second()   // Factory runs 2nd
  method() {}
}

// Output:
// First factory    ← factories: top to bottom
// Second factory
// Second decorator ← decorators: bottom to top
// First decorator
```

**Practical NestJS-style Decorator Patterns:**
```typescript
// Simulating NestJS-style controller decorators
function Controller(basePath: string) {
  return function (constructor: Function) {
    Reflect.defineMetadata('basePath', basePath, constructor);
  };
}

function Get(path: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('method', 'GET', target, propertyKey);
    Reflect.defineMetadata('path', path, target, propertyKey);
  };
}

function Post(path: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('method', 'POST', target, propertyKey);
    Reflect.defineMetadata('path', path, target, propertyKey);
  };
}

function UseGuard(guard: Function) {
  return function (target: any, propertyKey?: string) {
    if (propertyKey) {
      // Method-level guard
      Reflect.defineMetadata('guard', guard, target, propertyKey);
    } else {
      // Class-level guard
      Reflect.defineMetadata('guard', guard, target);
    }
  };
}

// Usage mirrors NestJS patterns
@Controller('/users')
@UseGuard(AuthGuard)
class UserController {
  @Get('/')
  async findAll() { /* ... */ }

  @Get('/:id')
  async findOne() { /* ... */ }

  @Post('/')
  @UseGuard(AdminGuard)
  async create() { /* ... */ }
}
```

**Stage 3 Decorators (TC39 Proposal) vs Legacy:**
```typescript
// Legacy (experimentalDecorators: true)
// - Receives (target, propertyKey, descriptor) for methods
// - Uses Reflect.metadata for metadata
// - Widely used in NestJS, TypeORM, Angular

// Stage 3 Decorators (new standard)
// - Receives (value, context) where context has metadata, name, kind, etc.
// - Built-in metadata support without reflect-metadata
// - Different parameter shapes

// Stage 3 example (future standard):
function logged(value: Function, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);
  return function (this: any, ...args: any[]) {
    console.log(`Calling ${methodName}`);
    const result = value.call(this, ...args);
    console.log(`${methodName} returned`, result);
    return result;
  };
}

// Stage 3 class decorator
function withTimestamp<T extends { new (...args: any[]): {} }>(
  value: T,
  context: ClassDecoratorContext
) {
  return class extends value {
    createdAt = new Date();
  };
}

// Key differences:
// | Aspect            | Legacy                        | Stage 3                        |
// |-------------------|-------------------------------|--------------------------------|
// | Enabled by        | experimentalDecorators flag   | Native (no flag needed)        |
// | Method signature  | (target, key, descriptor)     | (value, context)               |
// | Metadata          | reflect-metadata library      | context.metadata (built-in)    |
// | Parameter decos   | Supported                     | Not supported (use method)     |
// | TypeScript support| Stable                        | 5.0+ (--experimentalDecorators off) |
```

> **Interview Tip:** Decorators are heavily used in NestJS, Angular, and TypeORM. Interviewers expect you to know: (1) the four decorator types and their signatures, (2) execution order (factories top-down, decorators bottom-up), (3) how `reflect-metadata` enables runtime type information, and (4) the difference between legacy and Stage 3 proposals. Be prepared to implement a simple decorator like `@Measure` or `@Retry` from scratch — it shows you understand decorators are just functions.

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

## Q21: WeakMap, WeakSet & Memory-Efficient Data Structures

**Q: What are WeakMap and WeakSet, and when would you use them in production?**

**A:**

WeakMap and WeakSet hold "weak" references — they don't prevent garbage collection of their keys.

### WeakMap vs Map
```typescript
// Map: keeps strong reference — object stays in memory
const cache = new Map();
let user = { id: 1, name: 'Fazle' };
cache.set(user, 'some metadata');
user = null; // Object NOT garbage collected — Map still holds reference

// WeakMap: weak reference — object CAN be garbage collected
const cache = new WeakMap();
let user = { id: 1, name: 'Fazle' };
cache.set(user, 'some metadata');
user = null; // Object IS garbage collected — WeakMap doesn't prevent it
```

### Real-World Use Cases

#### 1. Private Data (Pre-ES2022 #private)
```typescript
const privateData = new WeakMap();

class UserService {
  constructor(private apiKey: string) {
    privateData.set(this, { apiKey }); // Truly private, GC-friendly
  }

  getApiKey() {
    return privateData.get(this).apiKey;
  }
}
```

#### 2. Caching Without Memory Leaks
```typescript
const computeCache = new WeakMap<object, any>();

function expensiveCompute(obj: object): any {
  if (computeCache.has(obj)) return computeCache.get(obj);

  const result = /* heavy computation */ JSON.parse(JSON.stringify(obj));
  computeCache.set(obj, result);
  return result;
}
// When obj is garbage collected, cache entry is automatically cleaned up
```

#### 3. DOM Metadata (Frontend Context)
```typescript
const elementData = new WeakMap<HTMLElement, { clickCount: number }>();
// When DOM element is removed, metadata is automatically cleaned up
```

### WeakMap vs Map Decision
| Feature | Map | WeakMap |
|---------|-----|---------|
| Key types | Any | Objects only |
| Iterable | Yes | No |
| .size property | Yes | No |
| GC of keys | No (prevents GC) | Yes (allows GC) |
| Use case | General storage | Metadata, caches, private data |

**Interview Tip:** "I use WeakMap for caching computed values per object — it prevents memory leaks because entries are automatically cleaned up when the key object is garbage collected. This is especially important in long-running Node.js servers."

---

## Q22: Promise Concurrency Patterns

**Q: How do you control concurrency with Promises?**

**A:**

### Problem: Promise.all Fires Everything At Once
```typescript
const userIds = Array.from({ length: 10000 }, (_, i) => i);

// ❌ BAD: 10,000 simultaneous API calls — will crash or get rate-limited
const users = await Promise.all(userIds.map(id => fetchUser(id)));
```

### Solution: Promise Pool with Concurrency Limit
```typescript
async function promisePool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  // Create N workers that pull from the shared queue
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// Usage: max 10 concurrent requests
const users = await promisePool(userIds, 10, (id) => fetchUser(id));
```

### Using p-limit (Production Library)
```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent

const users = await Promise.all(
  userIds.map(id => limit(() => fetchUser(id)))
);
```

### Promise.allSettled — Don't Fail on One Error
```typescript
const results = await Promise.allSettled([
  fetchUser(1),
  fetchUser(2), // This one fails
  fetchUser(3),
]);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`User ${i}:`, result.value);
  } else {
    console.error(`User ${i} failed:`, result.reason);
  }
});
// Unlike Promise.all, doesn't short-circuit on first failure
```

### Promise.race for Timeouts
```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Usage
const user = await withTimeout(fetchUser(1), 5000); // 5s timeout
```

### Promise.any — First Success Wins
```typescript
// Try multiple mirrors, use first one that responds
const data = await Promise.any([
  fetch('https://api-primary.example.com/data'),
  fetch('https://api-backup.example.com/data'),
  fetch('https://api-cdn.example.com/data'),
]);
// Returns first fulfilled promise, ignores rejections
// Only rejects if ALL promises reject (AggregateError)
```

**Interview Tip:** "In the Banglalink notification system, we needed to send notifications to millions of users. We used a promise pool with concurrency of 100 to avoid overwhelming downstream services while maintaining throughput."

---

## Q23: Object Immutability & Property Descriptors

**Q: How do you enforce immutability in JavaScript?**

**A:**

### Three Levels of Object Protection
```typescript
const config = { host: 'localhost', port: 3000, db: { name: 'mydb' } };

// Level 1: Object.freeze — shallow freeze
Object.freeze(config);
config.host = 'new';        // ❌ Silently fails (throws in strict mode)
config.db.name = 'changed'; // ✅ Works! Nested objects are NOT frozen

// Level 2: Deep freeze (recursive)
function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return obj;
}

// Level 3: Object.seal — can modify, can't add/delete
Object.seal(config);
config.host = 'new';     // ✅ Can modify existing
config.newProp = 'x';    // ❌ Can't add new properties
delete config.host;      // ❌ Can't delete
```

### Property Descriptors
```typescript
const user = {};

Object.defineProperty(user, 'id', {
  value: 1,
  writable: false,      // Can't change value
  enumerable: true,      // Shows in for...in and Object.keys
  configurable: false,   // Can't delete or redefine
});

// Getters/Setters via descriptors
Object.defineProperty(user, 'fullName', {
  get() { return `${this.firstName} ${this.lastName}`; },
  set(name: string) {
    const [first, last] = name.split(' ');
    this.firstName = first;
    this.lastName = last;
  },
  enumerable: true,
  configurable: true,
});
```

### Comparison Table
| Method | Add props | Delete props | Modify values | Modify descriptors |
|--------|-----------|-------------|---------------|-------------------|
| Object.freeze | ❌ | ❌ | ❌ | ❌ |
| Object.seal | ❌ | ❌ | ✅ | ❌ |
| Object.preventExtensions | ❌ | ✅ | ✅ | ✅ |

### TypeScript `as const` (Compile-Time Immutability)
```typescript
// Runtime immutability: Object.freeze
// Compile-time immutability: as const
const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type Status = typeof STATUS[keyof typeof STATUS]; // 'active' | 'inactive'
```

**Interview Tip:** "For configuration objects, I use `Object.freeze` + TypeScript `Readonly<T>` for defense in depth. Runtime protection catches bugs that types miss (e.g., when using `any` or external data)."

---

## Q24: Advanced TypeScript — Conditional Types, Template Literals & Type Guards

**Q: How do you use advanced TypeScript features for type-safe backend code?**

**A:**

### Conditional Types
```typescript
// Type that changes based on a condition
type ApiResponse<T> = T extends Array<any>
  ? { data: T; total: number; page: number }  // Paginated for arrays
  : { data: T };                                // Simple for single items

// Usage
type UserListResponse = ApiResponse<User[]>;  // { data: User[]; total: number; page: number }
type UserResponse = ApiResponse<User>;          // { data: User }
```

### Template Literal Types
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiPath = '/users' | '/orders' | '/products';
type RouteKey = `${HttpMethod} ${ApiPath}`;
// "GET /users" | "GET /orders" | "GET /products" | "POST /users" | ...

// Event naming convention enforcement
type EventName = `${string}Created` | `${string}Updated` | `${string}Deleted`;
function emitEvent(name: EventName, payload: any) { /* ... */ }
emitEvent('OrderCreated', data);   // ✅
emitEvent('doSomething', data);    // ❌ TypeScript error
```

### Type Guards (Narrowing)
```typescript
// Custom type guard with `is` keyword
interface SuccessResponse { status: 'success'; data: any }
interface ErrorResponse { status: 'error'; message: string; code: number }
type ApiResult = SuccessResponse | ErrorResponse;

function isError(result: ApiResult): result is ErrorResponse {
  return result.status === 'error';
}

// Usage — TypeScript narrows the type after the guard
const result = await callApi();
if (isError(result)) {
  console.error(result.message, result.code); // TypeScript knows it's ErrorResponse
} else {
  console.log(result.data); // TypeScript knows it's SuccessResponse
}
```

### Discriminated Unions (Best Pattern for Backend Events)
```typescript
type DomainEvent =
  | { type: 'OrderCreated'; orderId: string; total: number }
  | { type: 'OrderShipped'; orderId: string; trackingId: string }
  | { type: 'OrderCancelled'; orderId: string; reason: string };

function handleEvent(event: DomainEvent) {
  switch (event.type) {
    case 'OrderCreated':
      // TypeScript knows: event.orderId, event.total
      break;
    case 'OrderShipped':
      // TypeScript knows: event.orderId, event.trackingId
      break;
    case 'OrderCancelled':
      // TypeScript knows: event.orderId, event.reason
      break;
    default:
      const _exhaustive: never = event; // Compile error if a case is missing
  }
}
```

### Mapped Types for API Layers
```typescript
// Auto-generate DTO types from entity
interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  internalNotes: string;
}

// Pick only safe fields for API response
type UserResponseDto = Pick<UserEntity, 'id' | 'name' | 'email' | 'createdAt'>;

// Make all fields optional for update
type UpdateUserDto = Partial<Pick<UserEntity, 'name' | 'email'>>;
```

**Interview Tip:** "I use discriminated unions extensively for event-driven systems — the `type` field acts as a discriminator, and TypeScript's exhaustive checking ensures every event type is handled. Adding a `default: never` case catches missing handlers at compile time."

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
