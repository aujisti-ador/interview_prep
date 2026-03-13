# Node.js Fundamentals - Interview Q&A

## Table of Contents
1. [Streams](#streams)
2. [Buffers](#buffers)
3. [Child Processes](#child-processes)
4. [Clustering](#clustering)
5. [Performance & Memory](#performance--memory)
6. [Node.js Architecture](#nodejs-architecture)

---

## Streams

### Q1: What are Streams in Node.js? What are the different types?

**Answer:**
Streams are collections of data that might not be available all at once and don't have to fit in memory. They're perfect for handling large files or continuous data.

**Four Types of Streams:**

1. **Readable** - Source of data (e.g., `fs.createReadStream`, HTTP request)
2. **Writable** - Destination for data (e.g., `fs.createWriteStream`, HTTP response)
3. **Duplex** - Both readable and writable (e.g., TCP sockets)
4. **Transform** - Duplex stream that modifies data (e.g., zlib, crypto)

```javascript
const fs = require('fs');
const { Transform } = require('stream');

// Readable stream
const readStream = fs.createReadStream('large-file.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024 // 64KB chunks
});

// Writable stream
const writeStream = fs.createWriteStream('output.txt');

// Transform stream - uppercase converter
const upperCaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

// Piping streams together
readStream
  .pipe(upperCaseTransform)
  .pipe(writeStream)
  .on('finish', () => console.log('Done!'));

// Stream events
readStream.on('data', (chunk) => console.log(`Received ${chunk.length} bytes`));
readStream.on('end', () => console.log('No more data'));
readStream.on('error', (err) => console.error('Error:', err));
```

### Q2: Explain backpressure in streams. How do you handle it?

**Answer:**
Backpressure occurs when data is being produced faster than it can be consumed. This can lead to memory issues if not handled properly.

```javascript
const fs = require('fs');

// WRONG - Ignoring backpressure
const readable = fs.createReadStream('huge-file.txt');
const writable = fs.createWriteStream('output.txt');

readable.on('data', (chunk) => {
  // This ignores the return value - can cause memory issues
  writable.write(chunk);
});

// CORRECT - Handling backpressure manually
readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);
  if (!canContinue) {
    readable.pause(); // Stop reading when buffer is full
  }
});

writable.on('drain', () => {
  readable.resume(); // Resume when buffer is drained
});

// BEST - Using pipe() handles backpressure automatically
readable.pipe(writable);

// Using pipeline (modern approach with error handling)
const { pipeline } = require('stream/promises');
const zlib = require('zlib');

async function compressFile(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  );
  console.log('Compression complete');
}
```

### Q3: How would you create a custom readable stream?

**Answer:**

```javascript
const { Readable } = require('stream');

// Method 1: Extending Readable class
class CounterStream extends Readable {
  constructor(max = 10) {
    super({ objectMode: false });
    this.max = max;
    this.current = 0;
  }

  _read(size) {
    this.current++;
    if (this.current <= this.max) {
      const data = `Count: ${this.current}\n`;
      this.push(data);
    } else {
      this.push(null); // Signal end of stream
    }
  }
}

const counter = new CounterStream(5);
counter.pipe(process.stdout);

// Method 2: Using Readable.from() for iterables
const { Readable } = require('stream');

async function* generateNumbers() {
  for (let i = 1; i <= 5; i++) {
    yield `Number: ${i}\n`;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

const numberStream = Readable.from(generateNumbers());
numberStream.pipe(process.stdout);

// Method 3: Object mode stream (for non-string data)
class ObjectStream extends Readable {
  constructor(data) {
    super({ objectMode: true }); // Enable object mode
    this.data = data;
    this.index = 0;
  }

  _read() {
    if (this.index < this.data.length) {
      this.push(this.data[this.index++]);
    } else {
      this.push(null);
    }
  }
}

const users = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
];

const userStream = new ObjectStream(users);
userStream.on('data', (user) => console.log(user));
```

### Q4: What is the difference between flowing and paused modes in streams?

**Answer:**

```javascript
const fs = require('fs');
const readable = fs.createReadStream('file.txt');

// PAUSED MODE (default)
// - Data must be explicitly read
// - More control over consumption

readable.on('readable', () => {
  let chunk;
  while ((chunk = readable.read()) !== null) {
    console.log(`Received ${chunk.length} bytes`);
  }
});

// FLOWING MODE
// - Data is read automatically and emitted via 'data' event
// - Triggered by: adding 'data' listener, calling .resume(), or .pipe()

readable.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes`);
});

// Switching modes
readable.pause();  // Switch to paused mode
readable.resume(); // Switch to flowing mode
```

---

## Buffers

### Q5: What is a Buffer in Node.js? When would you use it?

**Answer:**
Buffer is a fixed-size chunk of memory allocated outside the V8 heap, used for handling binary data directly.

```javascript
// Creating buffers
const buf1 = Buffer.alloc(10);           // 10 bytes, filled with zeros
const buf2 = Buffer.alloc(10, 1);        // 10 bytes, filled with 1s
const buf3 = Buffer.allocUnsafe(10);     // 10 bytes, uninitialized (faster but may contain old data)
const buf4 = Buffer.from([1, 2, 3, 4]);  // From array
const buf5 = Buffer.from('Hello');       // From string (default UTF-8)
const buf6 = Buffer.from('48656c6c6f', 'hex'); // From hex string

// Buffer operations
console.log(buf5.toString());           // 'Hello'
console.log(buf5.toString('base64'));   // 'SGVsbG8='
console.log(buf5.length);               // 5 bytes

// Writing to buffer
const buf = Buffer.alloc(20);
buf.write('Node.js', 0, 7, 'utf8');
console.log(buf.toString('utf8', 0, 7)); // 'Node.js'

// Concatenating buffers
const combined = Buffer.concat([buf1, buf2]);

// Comparing buffers
const a = Buffer.from('ABC');
const b = Buffer.from('BCD');
console.log(a.compare(b)); // -1 (a < b)
console.log(a.equals(Buffer.from('ABC'))); // true

// Slicing (creates view, not copy!)
const original = Buffer.from('Hello World');
const slice = original.slice(0, 5);
slice[0] = 74; // 'J'
console.log(original.toString()); // 'Jello World' - original is modified!

// Use subarray for explicit view, or copy for separate buffer
const copy = Buffer.from(original.slice(0, 5));
```

### Q6: What is the difference between Buffer.alloc() and Buffer.allocUnsafe()?

**Answer:**

```javascript
// Buffer.alloc(size) - Safe, initialized to zeros
// - Slower because it zeros out memory
// - Use when security matters or you need clean buffer
const safeBuf = Buffer.alloc(100);
console.log(safeBuf); // <Buffer 00 00 00 00 ...>

// Buffer.allocUnsafe(size) - Faster but may contain old data
// - Does not zero out memory
// - May contain sensitive data from previous allocations
// - Use only when you'll immediately fill the entire buffer
const unsafeBuf = Buffer.allocUnsafe(100);
// May contain random data from memory!

// Buffer.allocUnsafeSlow(size) - Not from pool, for long-lived buffers
// - Allocates memory outside the pre-allocated pool
// - Use for large buffers that will live a long time

// Example: When to use allocUnsafe safely
function readFile(fd, size) {
  const buf = Buffer.allocUnsafe(size); // OK - will be filled immediately
  fs.readSync(fd, buf, 0, size, 0);     // Entire buffer filled with file data
  return buf;
}

// Danger: Never return allocUnsafe buffer without filling it
function badExample(size) {
  const buf = Buffer.allocUnsafe(size);
  // Forgetting to fill it - may leak sensitive data!
  return buf;
}
```

### Q6b: Explain the Event Loop phases in deep dive. What happens in each phase?

**Answer:**
The Node.js Event Loop is what allows Node.js to perform non-blocking I/O operations despite being single-threaded. It offloads operations to the system kernel whenever possible.

There are 6 major phases, executed in this strict order:

1. **Timers:** Executes callbacks scheduled by `setTimeout()` and `setInterval()`.
2. **Pending Callbacks:** Executes I/O callbacks deferred to the next loop iteration (e.g., TCP errors).
3. **Idle, Prepare:** Only used internally by Node.js.
4. **Poll Phase:** The most important phase.
   - Retrieves new I/O events.
   - Executes I/O related callbacks (almost all, with the exception of close callbacks, timers, and `setImmediate()`).
   - If the poll queue is empty, it will wait here for new I/O events, *unless* a `setImmediate()` script is scheduled.
5. **Check Phase:** Executes callbacks scheduled by `setImmediate()`.
6. **Close Callbacks:** Executes close callbacks, e.g., `socket.on('close', ...)`.

**Microtasks (process.nextTick & Promises):**
Microtasks do *not* belong to any specific phase. They are executed *immediately after* the currently executing operation completes, and *before* the event loop continues to the next phase. `process.nextTick()` has higher priority than Promise microtasks.

```javascript
setTimeout(() => console.log('1. Timer phase (setTimeout)'), 0);
setImmediate(() => console.log('2. Check phase (setImmediate)'));
process.nextTick(() => console.log('3. Microtask (process.nextTick)'));
Promise.resolve().then(() => console.log('4. Microtask (Promise)'));

// Output order:
// 3. Microtask (process.nextTick)  <- execution runs before Event Loop phases
// 4. Microtask (Promise)           <- execution runs before Event Loop phases
// 1. Timer phase (setTimeout)      <- event loop starts, timer phase
// 2. Check phase (setImmediate)    <- reaches check phase
```

---

## Child Processes

### Q7: Explain the different ways to create child processes in Node.js.

**Answer:**

```javascript
const { exec, execSync, spawn, spawnSync, fork, execFile } = require('child_process');

// 1. exec() - Runs command in shell, buffers output
// Best for: Simple commands, small output
exec('ls -la', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log(stdout);
});

// With promise wrapper
const { promisify } = require('util');
const execPromise = promisify(exec);

async function listFiles() {
  const { stdout } = await execPromise('ls -la');
  return stdout;
}

// 2. execFile() - Runs file directly without shell
// Best for: Running executables, more secure (no shell injection)
execFile('node', ['--version'], (error, stdout) => {
  console.log(`Node version: ${stdout}`);
});

// 3. spawn() - Streams I/O, doesn't buffer
// Best for: Large output, long-running processes
const ls = spawn('ls', ['-la']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// Spawn with options
const child = spawn('node', ['script.js'], {
  cwd: '/path/to/dir',
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
  detached: false,
  shell: false
});

// 4. fork() - Special spawn for Node.js scripts with IPC
// Best for: Running Node.js scripts, need communication
const forkedChild = fork('worker.js', [], {
  cwd: __dirname,
  env: process.env
});

// Parent sends message
forkedChild.send({ type: 'START', data: [1, 2, 3] });

// Parent receives message
forkedChild.on('message', (msg) => {
  console.log('From child:', msg);
});

// worker.js
process.on('message', (msg) => {
  if (msg.type === 'START') {
    const result = msg.data.reduce((a, b) => a + b, 0);
    process.send({ type: 'RESULT', result });
  }
});
```

### Q8: How do you handle communication between parent and child processes?

**Answer:**

```javascript
// === Using fork() with IPC ===

// parent.js
const { fork } = require('child_process');

class WorkerPool {
  constructor(workerPath, poolSize = 4) {
    this.workers = [];
    this.queue = [];

    for (let i = 0; i < poolSize; i++) {
      this.addWorker(workerPath);
    }
  }

  addWorker(workerPath) {
    const worker = fork(workerPath);
    worker.busy = false;

    worker.on('message', (result) => {
      worker.busy = false;
      worker.currentResolve(result);
      this.processQueue();
    });

    worker.on('error', (err) => {
      if (worker.currentReject) {
        worker.currentReject(err);
      }
    });

    this.workers.push(worker);
  }

  execute(task) {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !w.busy);

      if (availableWorker) {
        this.runTask(availableWorker, task, resolve, reject);
      } else {
        this.queue.push({ task, resolve, reject });
      }
    });
  }

  runTask(worker, task, resolve, reject) {
    worker.busy = true;
    worker.currentResolve = resolve;
    worker.currentReject = reject;
    worker.send(task);
  }

  processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
    if (availableWorker) {
      const { task, resolve, reject } = this.queue.shift();
      this.runTask(availableWorker, task, resolve, reject);
    }
  }

  shutdown() {
    this.workers.forEach(worker => worker.kill());
  }
}

// worker.js
process.on('message', async (task) => {
  try {
    const result = await heavyComputation(task);
    process.send({ success: true, result });
  } catch (error) {
    process.send({ success: false, error: error.message });
  }
});

async function heavyComputation(task) {
  // CPU-intensive work
  return task.data * 2;
}
```

---

## Clustering

### Q9: Explain the Cluster module. How does it help with scaling?

**Answer:**
The Cluster module allows you to create child processes (workers) that share the same server port, enabling multi-core utilization.

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker...');
    cluster.fork(); // Restart worker
  });

  // Listen for messages from workers
  cluster.on('message', (worker, message) => {
    console.log(`Message from worker ${worker.id}:`, message);
  });

} else {
  // Workers share the TCP connection
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from Worker ${process.pid}\n`);

    // Send message to primary
    process.send({ cmd: 'notifyRequest', pid: process.pid });
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

### Q10: What is the difference between Cluster and Worker Threads?

**Answer:**

| Feature | Cluster | Worker Threads |
|---------|---------|----------------|
| Process Type | Separate processes | Threads in same process |
| Memory | Isolated (no sharing) | Can share memory (SharedArrayBuffer) |
| Communication | IPC (serialization) | MessagePort (faster) |
| Use Case | HTTP servers, I/O bound | CPU-intensive tasks |
| Overhead | Higher (process creation) | Lower (thread creation) |
| Fault Isolation | Yes (process crash doesn't affect others) | No (thread crash can affect process) |

```javascript
// Worker Threads Example
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // Main thread
  const worker = new Worker(__filename, {
    workerData: { start: 1, end: 1000000 }
  });

  worker.on('message', (result) => {
    console.log('Sum:', result);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`);
    }
  });

} else {
  // Worker thread
  const { start, end } = workerData;
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += i;
  }
  parentPort.postMessage(sum);
}

// Sharing memory with SharedArrayBuffer
if (isMainThread) {
  const sharedBuffer = new SharedArrayBuffer(4);
  const sharedArray = new Int32Array(sharedBuffer);
  sharedArray[0] = 0;

  const worker = new Worker(__filename, {
    workerData: { sharedBuffer }
  });

  worker.on('exit', () => {
    console.log('Final value:', sharedArray[0]);
  });

} else {
  const sharedArray = new Int32Array(workerData.sharedBuffer);
  for (let i = 0; i < 1000; i++) {
    Atomics.add(sharedArray, 0, 1);
  }
}
```

---

## Performance & Memory

### Q11: How do you identify and fix memory leaks in Node.js?

**Answer:**

**Common Causes of Memory Leaks:**
1. Global variables
2. Closures holding references
3. Event listeners not removed
4. Timers not cleared
5. Caching without limits

```javascript
// 1. Global variable leak
global.data = []; // WRONG
function addData(item) {
  global.data.push(item); // Keeps growing
}

// 2. Closure leak
function createLeak() {
  const largeData = new Array(1000000).fill('x');
  return function() {
    // Closure keeps reference to largeData even if not used
    console.log('Something');
  };
}

// 3. Event listener leak
class LeakyClass {
  constructor() {
    // WRONG - listener never removed
    process.on('data', this.handleData.bind(this));
  }

  handleData(data) {
    console.log(data);
  }
}

// FIX - Remove listener
class ProperClass {
  constructor() {
    this.boundHandler = this.handleData.bind(this);
    process.on('data', this.boundHandler);
  }

  handleData(data) {
    console.log(data);
  }

  destroy() {
    process.off('data', this.boundHandler);
  }
}

// 4. Timer leak
function startPolling() {
  // WRONG - interval never cleared
  setInterval(() => {
    fetchData();
  }, 1000);
}

// FIX
let intervalId;
function startPolling() {
  intervalId = setInterval(() => {
    fetchData();
  }, 1000);
}
function stopPolling() {
  clearInterval(intervalId);
}

// 5. Cache without limit
const cache = new Map();
function cacheData(key, value) {
  cache.set(key, value); // WRONG - grows indefinitely
}

// FIX - Use LRU cache
const LRU = require('lru-cache');
const limitedCache = new LRU({ max: 500 });
```

**Detecting Memory Leaks:**

```javascript
// Monitor memory usage
function logMemory() {
  const used = process.memoryUsage();
  console.log({
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`,
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`
  });
}

setInterval(logMemory, 5000);

// Using --inspect flag and Chrome DevTools
// node --inspect app.js
// Open chrome://inspect in Chrome

// Generate heap snapshot
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshotStream = v8.writeHeapSnapshot();
  console.log(`Heap snapshot written to ${snapshotStream}`);
}

// Expose endpoint for production debugging
app.get('/debug/heap-snapshot', (req, res) => {
  const filename = v8.writeHeapSnapshot();
  res.download(filename);
});
```

### Q12: Explain garbage collection in Node.js/V8.

**Answer:**

**V8 Garbage Collection:**

1. **New Space (Young Generation)** - Small, fast collections
   - Objects allocated here first
   - Scavenge algorithm (copying collector)
   - Fast but only handles small memory

2. **Old Space (Old Generation)** - Larger, less frequent collections
   - Objects surviving multiple scavenges promoted here
   - Mark-Sweep-Compact algorithm
   - Slower but handles more memory

```javascript
// Force garbage collection (only with --expose-gc flag)
// node --expose-gc app.js
if (global.gc) {
  global.gc();
}

// V8 flags for memory tuning
// --max-old-space-size=4096   # Set max heap size to 4GB
// --max-semi-space-size=64    # Set young generation size
// --optimize-for-size         # Optimize for memory over speed

// Monitoring GC
const v8 = require('v8');
console.log(v8.getHeapStatistics());
/*
{
  total_heap_size: 6537216,
  total_heap_size_executable: 573440,
  total_physical_size: 6084880,
  total_available_size: 1526894760,
  used_heap_size: 4546128,
  heap_size_limit: 1535115264,
  malloced_memory: 262144,
  peak_malloced_memory: 786432,
  does_zap_garbage: 0
}
*/

// Use weak references for caching
const { WeakRef, FinalizationRegistry } = global;

const registry = new FinalizationRegistry((key) => {
  console.log(`Object with key ${key} was garbage collected`);
});

const cache = new Map();

function cacheObject(key, obj) {
  const weakRef = new WeakRef(obj);
  cache.set(key, weakRef);
  registry.register(obj, key);
}

function getCached(key) {
  const weakRef = cache.get(key);
  if (weakRef) {
    const obj = weakRef.deref();
    if (obj) return obj;
    cache.delete(key); // Clean up dead reference
  }
  return null;
}
```

### Q12b: How do you generate and analyze V8 Heap Snapshots for profiling?

**Answer:**

A heap snapshot represents the state of memory at a specific point in time. It shows what objects are taking up memory and what is holding references to them (preventing Garbage Collection).

1. **Triggering a Snapshot:**
   - Command line: `node --heap-prof app.js` (generates an `.heapprofile` file).
   - Programmatically: `const v8 = require('v8'); v8.writeHeapSnapshot();`
   - Using `clinic.js`: `npx clinic heapprofiler -- node app.js`

2. **Analyzing the Snapshot in Chrome DevTools:**
   - Open Chrome and navigate to `chrome://inspect`.
   - Click "Open dedicated DevTools for Node".
   - Go to the "Memory" tab and load the `.heapprofile` or `.heapsnapshot` file.

3. **Key Views in DevTools:**
   - **Summary View:** Shows total objects by constructor name. Sort by "Retained Size" to find the biggest memory hogs.
   - **Comparison View:** Take *two* snapshots (e.g., before and after a load test) and compare them. Tells you exactly what objects leaked during the test.
   - **Containment View:** Explores the heap from the root object down to see reference chains.

**Shallow Size vs. Retained Size:**
- **Shallow Size:** Memory held by the object itself (usually small, just primitive values).
- **Retained Size:** Memory that would be freed if this object was garbage collected (Shallow Size + all child objects it exclusively references). **Always sort by Retained Size to find leaks.**

---

## Node.js Architecture

### Q13: Explain the Node.js architecture and how it handles concurrent requests.

**Answer:**

```
┌───────────────────────────────────────────────────────────────┐
│                        APPLICATION                             │
│                    (Your JavaScript Code)                      │
└───────────────────────────────────────────────────────────────┘
                              │
┌───────────────────────────────────────────────────────────────┐
│                         NODE.JS                                │
│  ┌─────────────────┐    ┌──────────────────────────────────┐  │
│  │  V8 Engine      │    │         libuv                    │  │
│  │  (JS Execution) │    │  ┌────────────────────────────┐  │  │
│  │                 │    │  │      Event Loop            │  │  │
│  │  - Compiles JS  │    │  │  ┌────────────────────┐   │  │  │
│  │  - Memory mgmt  │    │  │  │ Timers            │   │  │  │
│  │  - GC           │    │  │  │ I/O Callbacks     │   │  │  │
│  │                 │    │  │  │ Idle, Prepare     │   │  │  │
│  └─────────────────┘    │  │  │ Poll              │   │  │  │
│                         │  │  │ Check             │   │  │  │
│                         │  │  │ Close Callbacks   │   │  │  │
│                         │  │  └────────────────────┘   │  │  │
│                         │  └────────────────────────────┘  │  │
│                         │                                  │  │
│                         │  ┌────────────────────────────┐  │  │
│                         │  │    Thread Pool (4 threads) │  │  │
│                         │  │    - File I/O              │  │  │
│                         │  │    - DNS lookup            │  │  │
│                         │  │    - Crypto                │  │  │
│                         │  │    - Compression           │  │  │
│                         │  └────────────────────────────┘  │  │
│                         └──────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
┌───────────────────────────────────────────────────────────────┐
│                    OPERATING SYSTEM                            │
│         (Network I/O, File System, Hardware)                   │
└───────────────────────────────────────────────────────────────┘
```

**How Node.js handles concurrent requests:**

```javascript
const http = require('http');
const fs = require('fs');

const server = http.createServer(async (req, res) => {
  // 1. Request comes in - handled by OS network layer
  // 2. libuv's poll phase detects incoming connection
  // 3. Callback is queued and executed on main thread

  if (req.url === '/sync') {
    // BLOCKING - Don't do this!
    const data = fs.readFileSync('large-file.txt');
    res.end(data);
  }

  if (req.url === '/async') {
    // NON-BLOCKING - File I/O goes to thread pool
    fs.readFile('large-file.txt', (err, data) => {
      // Callback executed when I/O completes
      res.end(data);
    });
    // Main thread is free for other requests
  }

  if (req.url === '/network') {
    // Network I/O uses OS async mechanisms (epoll/kqueue)
    // Does NOT use thread pool
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    res.end(JSON.stringify(data));
  }
});

server.listen(3000);
```

### Q14: What operations use the thread pool in Node.js?

**Answer:**

**Thread Pool Operations (Default 4 threads):**
- File system operations (fs.*)
- DNS lookups (dns.lookup)
- Crypto operations (pbkdf2, randomBytes, scrypt)
- Compression (zlib.*)

**NOT using thread pool (OS async APIs):**
- Network I/O (HTTP, TCP, UDP)
- Child processes
- DNS resolve (dns.resolve)

```javascript
// Increase thread pool size
process.env.UV_THREADPOOL_SIZE = 8; // Must be set before any I/O

// Or via command line
// UV_THREADPOOL_SIZE=8 node app.js

// Example: Thread pool saturation
const crypto = require('crypto');
const start = Date.now();

for (let i = 0; i < 8; i++) {
  crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', () => {
    console.log(`Hash ${i + 1} completed in ${Date.now() - start}ms`);
  });
}

// With 4 threads (default):
// First 4 complete around the same time
// Last 4 complete after first batch

// With UV_THREADPOOL_SIZE=8:
// All 8 complete around the same time
```

### Q15: Explain the phases of the Node.js event loop.

**Answer:**

```
   ┌───────────────────────────┐
┌─>│           timers          │  <- setTimeout, setInterval callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  <- I/O callbacks deferred from previous loop
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  <- Internal use only
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │  <- setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  <- socket.on('close', ...)
   └───────────────────────────┘
```

```javascript
const fs = require('fs');

// Demonstrate event loop phases
console.log('Start'); // Sync

setTimeout(() => console.log('setTimeout 0'), 0); // Timers phase
setTimeout(() => console.log('setTimeout 100'), 100); // Timers phase (later)

setImmediate(() => console.log('setImmediate')); // Check phase

fs.readFile(__filename, () => {
  console.log('File I/O callback'); // Poll phase

  setTimeout(() => console.log('setTimeout in I/O'), 0);
  setImmediate(() => console.log('setImmediate in I/O'));
  // Inside I/O callback, setImmediate ALWAYS fires before setTimeout
});

process.nextTick(() => console.log('nextTick 1')); // Between phases
process.nextTick(() => console.log('nextTick 2'));

Promise.resolve().then(() => console.log('Promise')); // Microtask

console.log('End'); // Sync

/*
Output:
Start
End
nextTick 1
nextTick 2
Promise
setTimeout 0
setImmediate
File I/O callback
setImmediate in I/O
setTimeout in I/O
setTimeout 100
*/
```

---

## Q16: Graceful Shutdown & Health Checks

**Q: How do you implement graceful shutdown in a Node.js production server?**

**A:**

### Why It Matters
When deploying (Kubernetes rolling update, AWS ECS task replacement), the old instance receives SIGTERM. Without graceful shutdown:
- In-flight requests get terminated mid-response
- Database connections left dangling
- Kafka consumers don't commit offsets → messages reprocessed
- WebSocket clients abruptly disconnected

### Implementation
```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Shutdown');

  // Enable shutdown hooks (NestJS)
  app.enableShutdownHooks();

  // Custom graceful shutdown
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    // NestJS does this when close() is called

    // 2. Set health check to unhealthy (load balancer stops sending traffic)
    app.get(HealthService).setUnhealthy();

    // 3. Wait for in-flight requests to complete (with timeout)
    const shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 30000); // 30 second max

    try {
      await app.close(); // Triggers OnModuleDestroy lifecycle hooks
      clearTimeout(shutdownTimeout);
      logger.log('Graceful shutdown complete.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  await app.listen(3000);
}
```

### NestJS Lifecycle Hooks for Cleanup
```typescript
@Injectable()
export class KafkaConsumerService implements OnModuleDestroy {
  async onModuleDestroy() {
    // Commit offsets and disconnect
    await this.consumer.commitOffsets();
    await this.consumer.disconnect();
    console.log('Kafka consumer disconnected cleanly');
  }
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.pool.end(); // Close all database connections
    console.log('Database pool closed');
  }
}
```

### Health Check Endpoints
```typescript
// Kubernetes expects these endpoints
@Controller('health')
export class HealthController {
  constructor(private health: HealthService) {}

  @Get('live')
  // Liveness: Is the process alive? (If no → K8s restarts the pod)
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  // Readiness: Can the process handle traffic? (If no → K8s stops sending traffic)
  async readiness() {
    if (this.health.isShuttingDown) {
      throw new ServiceUnavailableException('Shutting down');
    }

    // Check dependencies
    const dbHealthy = await this.health.checkDatabase();
    const redisHealthy = await this.health.checkRedis();

    if (!dbHealthy || !redisHealthy) {
      throw new ServiceUnavailableException('Dependencies unhealthy');
    }

    return { status: 'ok', db: dbHealthy, redis: redisHealthy };
  }
}
```

### Shutdown Sequence
```
SIGTERM received
  ↓
1. Mark health check as unhealthy → Load balancer drains traffic (K8s: 5-10s)
  ↓
2. Stop accepting new connections
  ↓
3. Wait for in-flight requests to complete (max 30s)
  ↓
4. Close database pools, Redis connections, Kafka consumers
  ↓
5. Exit process
```

**Interview Tip:** "In Kubernetes, there's a race condition between the SIGTERM and the load balancer removing the pod. I add a 5-second delay before starting shutdown so the load balancer has time to stop routing traffic. This prevents failed requests during deployments."

---

## Q17: Node.js Security Best Practices

**Q: What are the top security concerns for a Node.js backend?**

**A:**

### 1. Prototype Pollution
```typescript
// ❌ VULNERABLE: merging user input into objects
function merge(target: any, source: any) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}

// Attack payload:
// { "__proto__": { "isAdmin": true } }
// Now ALL objects have isAdmin = true!

// ✅ SAFE: Block __proto__ and constructor
function safeMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Skip dangerous keys
    }
    target[key] = source[key];
  }
  return target;
}

// ✅ BETTER: Use Object.create(null) for lookup objects
const lookup = Object.create(null); // No prototype chain
```

### 2. Command Injection
```typescript
// ❌ VULNERABLE: user input in shell command
import { exec } from 'child_process';
exec(`ls -la ${userInput}`); // userInput: "; rm -rf /"

// ✅ SAFE: Use execFile (no shell interpretation)
import { execFile } from 'child_process';
execFile('ls', ['-la', userInput]); // Arguments are escaped

// ✅ SAFE: Validate and sanitize
const safeFilename = userInput.replace(/[^a-zA-Z0-9._-]/g, '');
```

### 3. Path Traversal
```typescript
import * as path from 'path';

// ❌ VULNERABLE
app.get('/files/:name', (req, res) => {
  res.sendFile(`/uploads/${req.params.name}`);
  // Attack: /files/../../etc/passwd
});

// ✅ SAFE: Resolve and check the path
app.get('/files/:name', (req, res) => {
  const safePath = path.resolve('/uploads', req.params.name);
  if (!safePath.startsWith('/uploads/')) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(safePath);
});
```

### 4. ReDoS (Regular Expression Denial of Service)
```typescript
// ❌ VULNERABLE: Catastrophic backtracking
const emailRegex = /^([a-zA-Z0-9]+\.)+[a-zA-Z]{2,}$/;
// Input: "aaaaaaaaaaaaaaaaaaaaaaaa!" → hangs for minutes

// ✅ SAFE: Use safe-regex or re2 library
import RE2 from 're2'; // Google's regex engine — no backtracking
const safeRegex = new RE2('^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\\.[a-zA-Z]{2,}$');

// ✅ SAFE: Use validator libraries instead of custom regex
import { isEmail } from 'class-validator';
```

### 5. Dependency Security
```bash
# Regular auditing
npm audit                           # Built-in vulnerability scanner
npx snyk test                       # Snyk vulnerability database
npx better-npm-audit audit          # Better formatting

# Lock dependencies
npm ci                              # Install from lock file (CI/CD)
# Never npm install in production — it can change versions
```

### 6. Environment & Secrets
```typescript
// ❌ NEVER: Hardcode secrets
const apiKey = 'sk_live_abc123';

// ✅ CORRECT: Environment variables + validation
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_KEY: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

const env = envSchema.parse(process.env);
// Crashes at startup if env vars are missing/invalid — fail fast!
```

### Security Checklist
| Threat | Mitigation |
|--------|-----------|
| Prototype pollution | Block `__proto__`, use `Object.create(null)` |
| Command injection | Use `execFile` not `exec`, validate input |
| Path traversal | `path.resolve` + prefix check |
| ReDoS | `re2` library, avoid complex regex |
| Dependency vulns | `npm audit`, Snyk, Dependabot |
| Secrets exposure | Env vars + validation, never commit `.env` |
| SSRF | Validate/whitelist URLs, block internal IPs |
| Header injection | Use helmet middleware |
| Rate limiting | `@nestjs/throttler` or Redis-based |

**Interview Tip:** "Prototype pollution is the most Node.js-specific vulnerability that interviewers ask about. It's unique to JavaScript's prototype chain. I always validate and sanitize user input before merging into objects, and use `Object.create(null)` for lookup tables."

---

## Q18: Node.js Performance Profiling & Optimization

**Q: How do you identify and fix performance bottlenecks in a Node.js application?**

**A:**

### 1. Identify the Bottleneck Type
```
CPU-bound: Event loop blocked (heavy computation, JSON parsing large payloads)
  → Symptom: High event loop lag, slow responses across ALL endpoints

I/O-bound: Waiting on external resources (DB, Redis, API calls)
  → Symptom: Specific endpoints slow, event loop lag normal

Memory-bound: Memory leaks, large object allocations
  → Symptom: Growing RSS, frequent GC pauses, eventual OOM crash
```

### 2. Measuring Event Loop Lag
```typescript
// Built-in: monitorEventLoopDelay (Node.js 12+)
import { monitorEventLoopDelay } from 'perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  console.log({
    min: histogram.min / 1e6,     // Convert ns → ms
    max: histogram.max / 1e6,
    mean: histogram.mean / 1e6,
    p99: histogram.percentile(99) / 1e6,
  });
  histogram.reset();
}, 5000);

// Healthy: mean < 10ms, p99 < 50ms
// Problem: mean > 100ms → event loop is blocked
```

### 3. CPU Profiling with clinic.js
```bash
# Install
npm install -g clinic

# Flame graph (identify slow functions)
clinic flame -- node dist/main.js
# → Opens browser with interactive flame chart

# Doctor (general health check)
clinic doctor -- node dist/main.js
# → Identifies event loop blocks, I/O issues, GC problems

# Bubbleprof (async flow visualization)
clinic bubbleprof -- node dist/main.js
# → Shows where async operations spend time
```

### 4. Memory Profiling
```typescript
// Check memory usage
const usage = process.memoryUsage();
console.log({
  rss: `${(usage.rss / 1024 / 1024).toFixed(1)}MB`,         // Total memory
  heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(1)}MB`, // V8 heap allocated
  heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(1)}MB`,  // V8 heap used
  external: `${(usage.external / 1024 / 1024).toFixed(1)}MB`,   // C++ objects (Buffers)
});

// Heap snapshot for leak detection
// In production: use --inspect flag
// node --inspect dist/main.js
// Chrome DevTools → Memory → Take Heap Snapshot
// Compare snapshots: growing objects = likely leak
```

### 5. Common Optimizations
```typescript
// ❌ SLOW: Synchronous JSON parsing of large payloads
const data = JSON.parse(hugeString); // Blocks event loop

// ✅ FAST: Stream parsing for large JSON
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';

fs.createReadStream('huge.json')
  .pipe(parser())
  .pipe(streamArray())
  .on('data', ({ value }) => processItem(value));

// ❌ SLOW: String concatenation in loops
let result = '';
for (const item of items) { result += item.toString(); }

// ✅ FAST: Array join
const result = items.map(i => i.toString()).join('');

// ❌ SLOW: Creating new objects in hot paths
function processRequest(req) {
  const config = { ...defaultConfig, ...req.config }; // New object every request
}

// ✅ FAST: Reuse objects where possible
const frozenDefault = Object.freeze(defaultConfig);
```

### 6. Database Query Optimization
```typescript
// ❌ SLOW: N+1 query problem
const users = await userRepo.find();
for (const user of users) {
  user.orders = await orderRepo.find({ userId: user.id }); // N queries!
}

// ✅ FAST: Eager loading / join
const users = await userRepo.find({ relations: ['orders'] }); // 1 query with JOIN

// ✅ FAST: Batch loading with DataLoader
const orderLoader = new DataLoader(async (userIds: string[]) => {
  const orders = await orderRepo.find({ where: { userId: In(userIds) } });
  return userIds.map(id => orders.filter(o => o.userId === id));
});
```

### Performance Monitoring Metrics
| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Event loop lag (p99) | < 50ms | 50-200ms | > 200ms |
| Heap used | < 70% of total | 70-85% | > 85% |
| GC pause time | < 50ms | 50-200ms | > 200ms |
| Response time (p95) | < 200ms | 200-1000ms | > 1s |
| Error rate | < 0.1% | 0.1-1% | > 1% |

**Interview Tip:** "When a production Node.js app is slow, I first check event loop lag (CPU issue?) and memory usage (leak?). For CPU, clinic.js flame graphs pinpoint the exact function. For memory, I take heap snapshots 30 minutes apart and compare — growing objects reveal the leak."

---

## Q19: Signal Handling & Process Management

**Q: How does Node.js handle OS signals, and why does it matter for production?**

**A:**

### Common Signals
| Signal | Source | Default Behavior | Can Be Caught? |
|--------|--------|-----------------|----------------|
| SIGTERM | `kill`, Kubernetes, Docker stop | Terminate | Yes |
| SIGINT | Ctrl+C | Terminate | Yes |
| SIGKILL | `kill -9`, OOM killer | Force kill | No |
| SIGHUP | Terminal closed | Terminate | Yes |
| SIGUSR1 | Custom | Debug mode (Node.js) | Yes |
| SIGUSR2 | Custom (nodemon restart) | None | Yes |

### Handling Signals
```typescript
// SIGTERM: Clean shutdown (Kubernetes sends this 30s before SIGKILL)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await shutdown();  // Close DB, drain requests
  process.exit(0);
});

// SIGINT: Ctrl+C in terminal
process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await shutdown();
  process.exit(0);
});

// Unhandled errors — log and exit (don't try to recover)
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1); // Exit — state may be corrupted
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  // In Node.js 15+, this causes exit by default
  // In older versions, add explicit exit
  process.exit(1);
});
```

### Kubernetes Shutdown Sequence
```
1. K8s sends SIGTERM to pod
2. Pod has terminationGracePeriodSeconds (default 30s) to shut down
3. If still running after grace period → SIGKILL (forced kill)

Your code must:
- Catch SIGTERM
- Stop accepting new requests
- Finish in-flight requests
- Close connections
- Exit within 30 seconds
```

### PM2 / Docker / Kubernetes Compatibility
```typescript
// PM2: Use graceful shutdown
process.on('SIGINT', () => {
  // PM2 sends SIGINT for graceful restart
  db.close();
  process.exit(0);
});

// Docker: Make sure Node.js receives signals
// Dockerfile: use exec form (not shell form)
// ✅ CMD ["node", "dist/main.js"]     — node is PID 1, receives SIGTERM
// ❌ CMD node dist/main.js            — shell is PID 1, node never gets SIGTERM
```

**Interview Tip:** "The most common production issue I've seen is Node.js not receiving SIGTERM in Docker because the Dockerfile uses shell form CMD. Always use exec form: `CMD [\"node\", \"dist/main.js\"]` so the Node.js process is PID 1 and directly receives the signal."

---

## Quick Reference

| Topic | Key Point |
|-------|-----------|
| Streams | Use pipe() for backpressure handling |
| Buffer | alloc() is safe, allocUnsafe() is fast |
| Child Process | exec() for shell commands, spawn() for streams, fork() for IPC |
| Cluster | Multiple processes, same port, process isolation |
| Worker Threads | Same process, shared memory, less overhead |
| Memory Leaks | Event listeners, closures, global vars, unbounded caches |
| Thread Pool | Default 4 threads; fs, crypto, dns.lookup use it |
| Event Loop | timers → I/O → check → close; microtasks between each |

---

## Common Interview Questions

1. How would you handle 10,000 concurrent connections in Node.js?
2. Explain the difference between `process.nextTick()` and `setImmediate()`.
3. How does Node.js achieve non-blocking I/O?
4. What happens when you block the event loop?
5. How would you debug a memory leak in production?
6. When would you use cluster vs worker_threads?
7. What is the purpose of the libuv library?
8. How do you handle CPU-intensive tasks in Node.js?
