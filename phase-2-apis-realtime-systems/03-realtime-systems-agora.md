# Real-Time Systems & Agora.io - Interview Q&A

## Table of Contents
1. [Real-Time Communication Fundamentals](#real-time-communication-fundamentals)
2. [WebSockets](#websockets)
3. [Server-Sent Events (SSE)](#server-sent-events-sse)
4. [Long Polling](#long-polling)
5. [Comparison & Trade-offs](#comparison--trade-offs)
6. [Agora.io Platform](#agoraio-platform)
7. [Token Generation](#token-generation)
8. [Channel Management](#channel-management)
9. [RTMP Ingest](#rtmp-ingest)
10. [Live Streaming Architecture](#live-streaming-architecture)
11. [Latency vs Cost Trade-offs](#latency-vs-cost-trade-offs)

---

## Real-Time Communication Fundamentals

### Q1: What are the different approaches for real-time communication in web applications?

**Answer:**

| Technology | Direction | Connection | Use Case | Latency |
|------------|-----------|------------|----------|---------|
| WebSocket | Bidirectional | Persistent | Chat, gaming, trading | Lowest |
| SSE | Server → Client | Persistent | Notifications, feeds | Low |
| Long Polling | Request → Response | Semi-persistent | Compatibility fallback | Medium |
| Short Polling | Request → Response | New per request | Simple updates | High |
| WebRTC | P2P Bidirectional | Persistent | Video/audio calls | Lowest |

```
┌─────────────────────────────────────────────────────────────────┐
│                    Real-Time Communication Stack                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   WebSocket  │     │     SSE      │     │ Long Polling │    │
│  │              │     │              │     │              │    │
│  │ ←─────────→  │     │ ─────────→   │     │ ←─────────→  │    │
│  │ Bidirectional│     │ Server Push  │     │  Simulated   │    │
│  │  Full Duplex │     │  Half Duplex │     │  Real-time   │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                         WebRTC                             │  │
│  │   P2P Audio/Video, Data Channels, Screen Sharing          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## WebSockets

### Q2: Explain WebSocket protocol and implementation.

**Answer:**

```typescript
// WebSocket Handshake
// Client Request:
// GET /chat HTTP/1.1
// Host: server.example.com
// Upgrade: websocket
// Connection: Upgrade
// Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
// Sec-WebSocket-Version: 13

// Server Response:
// HTTP/1.1 101 Switching Protocols
// Upgrade: websocket
// Connection: Upgrade
// Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

// ========== NestJS WebSocket Gateway ==========
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate user from token
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);

      if (!user) {
        client.disconnect();
        return;
      }

      // Store socket mapping
      client.data.userId = user.id;
      client.data.user = user;

      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id).add(client.id);

      // Join user's personal room
      client.join(`user:${user.id}`);

      // Notify others
      this.server.emit('user:online', { userId: user.id });

      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);

      if (sockets?.size === 0) {
        this.userSockets.delete(userId);
        this.server.emit('user:offline', { userId });
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; content: string },
  ) {
    const { roomId, content } = payload;
    const user = client.data.user;

    // Validate user can send to room
    const canSend = await this.chatService.canSendToRoom(user.id, roomId);
    if (!canSend) {
      return { error: 'Not authorized to send to this room' };
    }

    // Save message
    const message = await this.chatService.createMessage({
      roomId,
      senderId: user.id,
      content,
    });

    // Broadcast to room
    this.server.to(`room:${roomId}`).emit('message:new', {
      id: message.id,
      content: message.content,
      sender: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
      },
      roomId,
      createdAt: message.createdAt,
    });

    return { success: true, messageId: message.id };
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const { roomId } = payload;
    const user = client.data.user;

    // Validate access
    const canJoin = await this.chatService.canJoinRoom(user.id, roomId);
    if (!canJoin) {
      return { error: 'Cannot join room' };
    }

    client.join(`room:${roomId}`);

    // Notify room members
    this.server.to(`room:${roomId}`).emit('room:user-joined', {
      roomId,
      user: { id: user.id, name: user.name },
    });

    return { success: true };
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const { roomId } = payload;
    const user = client.data.user;

    client.leave(`room:${roomId}`);

    this.server.to(`room:${roomId}`).emit('room:user-left', {
      roomId,
      user: { id: user.id, name: user.name },
    });

    return { success: true };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const user = client.data.user;

    client.to(`room:${payload.roomId}`).emit('typing:started', {
      roomId: payload.roomId,
      user: { id: user.id, name: user.name },
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const user = client.data.user;

    client.to(`room:${payload.roomId}`).emit('typing:stopped', {
      roomId: payload.roomId,
      userId: user.id,
    });
  }

  // Send to specific user (all their connected devices)
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Send to room
  sendToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room:${roomId}`).emit(event, data);
  }

  // Broadcast to all
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}

// ========== Scaling WebSockets with Redis Adapter ==========
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(3000);
}

// ========== Client-side WebSocket ==========
import { io, Socket } from 'socket.io-client';

class ChatClient {
  private socket: Socket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    this.socket = io('wss://api.example.com/chat', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, need to reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.onMaxReconnectAttemptsReached();
      }
    });

    this.socket.on('message:new', (message) => {
      this.onNewMessage(message);
    });

    this.socket.on('typing:started', (data) => {
      this.onTypingStarted(data);
    });
  }

  sendMessage(roomId: string, content: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'message:send',
        { roomId, content },
        (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        },
      );
    });
  }

  joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('room:join', { roomId }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  startTyping(roomId: string) {
    this.socket.emit('typing:start', { roomId });
  }

  stopTyping(roomId: string) {
    this.socket.emit('typing:stop', { roomId });
  }

  disconnect() {
    this.socket.disconnect();
  }
}
```

---

## Server-Sent Events (SSE)

### Q3: Explain Server-Sent Events and when to use them.

**Answer:**

```typescript
// SSE is unidirectional (server → client only)
// Uses standard HTTP, automatically reconnects
// Good for: notifications, live feeds, stock tickers

// ========== NestJS SSE Controller ==========
import { Controller, Sse, Query, Req, MessageEvent } from '@nestjs/common';
import { Observable, interval, map, filter, merge } from 'rxjs';
import { Request } from 'express';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventBus: EventEmitter2,
    private readonly authService: AuthService,
  ) {}

  // Basic SSE endpoint
  @Sse('stream')
  @UseGuards(AuthGuard)
  stream(@CurrentUser() user: User): Observable<MessageEvent> {
    // Create observable from event emitter
    const userEvents$ = new Observable<MessageEvent>((subscriber) => {
      const handler = (event: any) => {
        subscriber.next({
          data: JSON.stringify(event),
          type: event.type,
          id: event.id,
        });
      };

      // Subscribe to user-specific events
      this.eventBus.on(`user:${user.id}`, handler);

      // Cleanup on unsubscribe
      return () => {
        this.eventBus.off(`user:${user.id}`, handler);
      };
    });

    // Heartbeat to keep connection alive
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        data: JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }),
        type: 'heartbeat',
      })),
    );

    return merge(userEvents$, heartbeat$);
  }

  // Notifications endpoint
  @Sse('notifications')
  @UseGuards(AuthGuard)
  notifications(@CurrentUser() user: User): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const notificationHandler = (notification: Notification) => {
        subscriber.next({
          data: JSON.stringify({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            createdAt: notification.createdAt,
          }),
          type: 'notification',
          id: notification.id,
        });
      };

      this.eventBus.on(`notification:${user.id}`, notificationHandler);

      // Send initial connection event
      subscriber.next({
        data: JSON.stringify({ message: 'Connected to notifications' }),
        type: 'connected',
      });

      return () => {
        this.eventBus.off(`notification:${user.id}`, notificationHandler);
      };
    });
  }

  // Live order status updates
  @Sse('orders/:orderId/status')
  @UseGuards(AuthGuard)
  orderStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
  ): Observable<MessageEvent> {
    return new Observable(async (subscriber) => {
      // Verify user owns the order
      const order = await this.orderService.findOne(orderId);
      if (!order || order.userId !== user.id) {
        subscriber.error(new ForbiddenException());
        return;
      }

      // Send current status
      subscriber.next({
        data: JSON.stringify({ status: order.status }),
        type: 'status',
      });

      // Listen for updates
      const handler = (update: { orderId: string; status: string }) => {
        if (update.orderId === orderId) {
          subscriber.next({
            data: JSON.stringify({ status: update.status }),
            type: 'status',
          });

          // Complete if order is in final state
          if (['delivered', 'cancelled'].includes(update.status)) {
            subscriber.complete();
          }
        }
      };

      this.eventBus.on('order:status-changed', handler);

      return () => {
        this.eventBus.off('order:status-changed', handler);
      };
    });
  }
}

// ========== Emitting events from services ==========
@Injectable()
export class NotificationService {
  constructor(private readonly eventBus: EventEmitter2) {}

  async sendToUser(userId: string, notification: CreateNotificationDto) {
    const saved = await this.notificationRepository.save({
      userId,
      ...notification,
    });

    // Emit for SSE listeners
    this.eventBus.emit(`notification:${userId}`, saved);

    return saved;
  }
}

// ========== Client-side EventSource ==========
class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url: string, token: string) {
    // SSE doesn't support custom headers, use query param or cookie
    const fullUrl = `${url}?token=${token}`;

    this.eventSource = new EventSource(fullUrl);

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.handleReconnect();
      }
    };

    // Listen for specific event types
    this.eventSource.addEventListener('notification', (event) => {
      const data = JSON.parse(event.data);
      this.onNotification(data);
    });

    this.eventSource.addEventListener('heartbeat', (event) => {
      console.log('Heartbeat received');
    });

    // Default message handler
    this.eventSource.onmessage = (event) => {
      console.log('Message:', event.data);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms...`);
    setTimeout(() => {
      this.connect(this.url, this.token);
    }, delay);
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }

  onNotification(notification: any) {
    // Override in implementation
    console.log('Notification:', notification);
  }
}

// React hook for SSE
function useSSE<T>(url: string, eventType: string): T | null {
  const [data, setData] = useState<T | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    eventSourceRef.current = new EventSource(`${url}?token=${token}`);

    eventSourceRef.current.addEventListener(eventType, (event) => {
      setData(JSON.parse(event.data));
    });

    return () => {
      eventSourceRef.current?.close();
    };
  }, [url, eventType]);

  return data;
}

// Usage
function NotificationBell() {
  const notification = useSSE<Notification>(
    '/api/events/notifications',
    'notification',
  );

  useEffect(() => {
    if (notification) {
      showToast(notification.title);
    }
  }, [notification]);

  return <BellIcon />;
}
```

---

## Long Polling

### Q4: Explain long polling and implement it.

**Answer:**

```typescript
// Long polling: Client makes request, server holds it until data available
// Fallback when WebSocket/SSE not supported

// ========== NestJS Long Polling ==========
@Controller('poll')
export class LongPollingController {
  private readonly pendingRequests = new Map<string, {
    resolve: (data: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(private readonly eventBus: EventEmitter2) {
    // Listen for events and resolve pending requests
    this.eventBus.on('notification', (notification) => {
      const pending = this.pendingRequests.get(notification.userId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(notification);
        this.pendingRequests.delete(notification.userId);
      }
    });
  }

  @Get('notifications')
  @UseGuards(AuthGuard)
  async pollNotifications(
    @CurrentUser() user: User,
    @Query('lastId') lastId: string,
    @Query('timeout') timeout: number = 30000,
  ): Promise<{ notifications: Notification[]; hasMore: boolean }> {
    // Check for existing notifications first
    const existingNotifications = await this.notificationService.getAfter(
      user.id,
      lastId,
    );

    if (existingNotifications.length > 0) {
      return {
        notifications: existingNotifications,
        hasMore: existingNotifications.length >= 20,
      };
    }

    // Wait for new notification
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(user.id);
        resolve({ notifications: [], hasMore: false });
      }, Math.min(timeout, 60000)); // Max 60 seconds

      this.pendingRequests.set(user.id, {
        resolve: (notification) => {
          resolve({
            notifications: [notification],
            hasMore: false,
          });
        },
        timeout: timeoutId,
      });
    });
  }

  // Generic long polling endpoint
  @Get('events/:channel')
  @UseGuards(AuthGuard)
  async pollEvents(
    @Param('channel') channel: string,
    @Query('lastEventId') lastEventId: string,
    @Query('timeout') timeout: number = 30000,
  ): Promise<{ events: any[]; lastEventId: string }> {
    const requestId = uuid();

    return new Promise((resolve) => {
      const handler = (event: any) => {
        if (event.id > (lastEventId || 0)) {
          cleanup();
          resolve({
            events: [event],
            lastEventId: event.id,
          });
        }
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          events: [],
          lastEventId: lastEventId || '',
        });
      }, Math.min(timeout, 60000));

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.eventBus.off(`channel:${channel}`, handler);
      };

      this.eventBus.on(`channel:${channel}`, handler);
    });
  }
}

// ========== Client-side Long Polling ==========
class LongPollingClient {
  private isPolling = false;
  private lastEventId: string | null = null;
  private abortController: AbortController | null = null;

  async startPolling(url: string, onEvent: (event: any) => void) {
    this.isPolling = true;

    while (this.isPolling) {
      try {
        this.abortController = new AbortController();

        const params = new URLSearchParams({
          timeout: '30000',
          ...(this.lastEventId && { lastEventId: this.lastEventId }),
        });

        const response = await fetch(`${url}?${params}`, {
          signal: this.abortController.signal,
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.events && data.events.length > 0) {
          data.events.forEach(onEvent);
          this.lastEventId = data.lastEventId;
        }

        // Small delay before next poll
        await this.delay(100);

      } catch (error) {
        if (error.name === 'AbortError') {
          break; // Polling was stopped
        }

        console.error('Polling error:', error);
        // Exponential backoff on error
        await this.delay(Math.min(30000, 1000 * Math.pow(2, this.errorCount++)));
      }
    }
  }

  stopPolling() {
    this.isPolling = false;
    this.abortController?.abort();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Comparison & Trade-offs

### Q5: Compare WebSocket, SSE, and Long Polling. When should you use each?

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Real-Time Technology Comparison                       │
├───────────────┬─────────────────┬─────────────────┬────────────────────┤
│   Feature     │   WebSocket     │      SSE        │   Long Polling     │
├───────────────┼─────────────────┼─────────────────┼────────────────────┤
│ Direction     │ Bidirectional   │ Server → Client │ Request/Response   │
│ Protocol      │ WS/WSS          │ HTTP            │ HTTP               │
│ Connection    │ Persistent      │ Persistent      │ Semi-persistent    │
│ Browser       │ All modern      │ All modern      │ All                │
│ Reconnection  │ Manual          │ Automatic       │ Manual             │
│ Binary        │ Yes             │ No (text only)  │ Yes                │
│ Overhead      │ Low (frames)    │ Low             │ High (headers)     │
│ Firewall      │ May block       │ Usually OK      │ Always OK          │
│ Load Balancer │ Sticky required │ Works well      │ Works well         │
│ Scaling       │ Complex         │ Easy            │ Easy               │
│ Latency       │ Lowest          │ Low             │ Medium             │
└───────────────┴─────────────────┴─────────────────┴────────────────────┘
```

**Decision Matrix:**

```typescript
// When to use WebSocket:
// ✅ Chat applications
// ✅ Real-time games
// ✅ Live collaboration (Google Docs style)
// ✅ Trading platforms
// ✅ Any bidirectional communication

// When to use SSE:
// ✅ Notifications
// ✅ Live feeds (social, news)
// ✅ Progress updates
// ✅ Stock tickers
// ✅ Any server → client only

// When to use Long Polling:
// ✅ Fallback when others not available
// ✅ Simple use cases
// ✅ Low-frequency updates
// ✅ Corporate firewalls blocking WebSocket

// Hybrid Approach (Recommended)
class RealTimeClient {
  private transport: 'websocket' | 'sse' | 'polling' = 'websocket';
  private connection: any;

  connect(options: ConnectionOptions) {
    // Try WebSocket first
    if (this.isWebSocketSupported()) {
      try {
        this.connection = this.connectWebSocket(options);
        this.transport = 'websocket';
        return;
      } catch (error) {
        console.log('WebSocket failed, falling back to SSE');
      }
    }

    // Fall back to SSE
    if (this.isSSESupported()) {
      try {
        this.connection = this.connectSSE(options);
        this.transport = 'sse';
        return;
      } catch (error) {
        console.log('SSE failed, falling back to polling');
      }
    }

    // Last resort: Long Polling
    this.connection = this.startPolling(options);
    this.transport = 'polling';
  }

  send(event: string, data: any) {
    switch (this.transport) {
      case 'websocket':
        this.connection.emit(event, data);
        break;
      case 'sse':
      case 'polling':
        // SSE and polling are unidirectional, use HTTP
        fetch('/api/events', {
          method: 'POST',
          body: JSON.stringify({ event, data }),
        });
        break;
    }
  }

  private isWebSocketSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  private isSSESupported(): boolean {
    return typeof EventSource !== 'undefined';
  }
}
```

---

## Agora.io Platform

### Q6: What is Agora.io and what are its core features?

**Answer:**

```
Agora.io is a real-time engagement platform providing:

┌─────────────────────────────────────────────────────────────────────────┐
│                         Agora.io Services                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   Voice Call     │  │   Video Call     │  │  Live Streaming  │      │
│  │                  │  │                  │  │                  │      │
│  │  - 1:1 calls     │  │  - 1:1 calls     │  │  - Broadcast     │      │
│  │  - Group calls   │  │  - Group calls   │  │  - Interactive   │      │
│  │  - Audio rooms   │  │  - Meetings      │  │  - RTMP Push     │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  Real-Time       │  │   Cloud         │  │   Extensions     │      │
│  │  Messaging       │  │   Recording     │  │                  │      │
│  │                  │  │                  │  │  - AI Noise      │      │
│  │  - Chat          │  │  - Composite    │  │  - Virtual BG    │      │
│  │  - Signaling     │  │  - Individual   │  │  - Face Filter   │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

Key Metrics:
- Ultra-low latency: <400ms global
- 99.99% SLA
- 200+ global data centers
- Automatic network switching
- Adaptive bitrate
```

```typescript
// Agora SDK Integration (Web)
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
  ILocalAudioTrack,
} from 'agora-rtc-sdk-ng';

class AgoraService {
  private client: IAgoraRTCClient;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private localVideoTrack: ILocalVideoTrack | null = null;

  constructor() {
    // Create client with mode and codec
    this.client = AgoraRTC.createClient({
      mode: 'rtc', // 'rtc' for video call, 'live' for live streaming
      codec: 'vp8', // 'vp8' or 'h264'
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // User published stream
    this.client.on('user-published', async (user, mediaType) => {
      await this.client.subscribe(user, mediaType);

      if (mediaType === 'video') {
        const remoteVideoTrack = user.videoTrack;
        remoteVideoTrack?.play(`remote-video-${user.uid}`);
      }

      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        remoteAudioTrack?.play();
      }
    });

    // User unpublished stream
    this.client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        // Remove video element
        const container = document.getElementById(`remote-video-${user.uid}`);
        container?.remove();
      }
    });

    // User left channel
    this.client.on('user-left', (user) => {
      console.log(`User ${user.uid} left`);
    });

    // Connection state change
    this.client.on('connection-state-change', (curState, prevState) => {
      console.log(`Connection: ${prevState} -> ${curState}`);
    });

    // Network quality
    this.client.on('network-quality', (stats) => {
      console.log(`Network: Uplink ${stats.uplinkNetworkQuality}, Downlink ${stats.downlinkNetworkQuality}`);
    });
  }

  async joinChannel(appId: string, channelName: string, token: string, uid: number) {
    await this.client.join(appId, channelName, token, uid);

    // Create local tracks
    [this.localAudioTrack, this.localVideoTrack] =
      await AgoraRTC.createMicrophoneAndCameraTracks();

    // Play local video
    this.localVideoTrack.play('local-video');

    // Publish to channel
    await this.client.publish([this.localAudioTrack, this.localVideoTrack]);

    return { uid };
  }

  async leaveChannel() {
    // Stop and close local tracks
    this.localAudioTrack?.stop();
    this.localAudioTrack?.close();
    this.localVideoTrack?.stop();
    this.localVideoTrack?.close();

    await this.client.leave();
  }

  muteAudio(muted: boolean) {
    this.localAudioTrack?.setEnabled(!muted);
  }

  muteVideo(muted: boolean) {
    this.localVideoTrack?.setEnabled(!muted);
  }

  async switchCamera() {
    if (this.localVideoTrack) {
      const devices = await AgoraRTC.getCameras();
      const currentDevice = this.localVideoTrack.getTrackLabel();
      const nextDevice = devices.find(d => d.label !== currentDevice);

      if (nextDevice) {
        await this.localVideoTrack.setDevice(nextDevice.deviceId);
      }
    }
  }
}
```

---

## Token Generation

### Q7: How do you generate and manage Agora tokens securely?

**Answer:**

```typescript
// Agora tokens should ALWAYS be generated server-side

// ========== Token Types ==========
// 1. RTC Token - For voice/video calls and live streaming
// 2. RTM Token - For real-time messaging
// 3. Chat Token - For Agora Chat

// ========== Backend Token Generation (NestJS) ==========
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } from 'agora-access-token';

@Injectable()
export class AgoraTokenService {
  private readonly appId: string;
  private readonly appCertificate: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = configService.get('AGORA_APP_ID');
    this.appCertificate = configService.get('AGORA_APP_CERTIFICATE');
  }

  // Generate RTC Token for video/voice
  generateRtcToken(
    channelName: string,
    uid: number,
    role: 'publisher' | 'subscriber',
    expirationTimeInSeconds: number = 3600,
  ): string {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const rtcRole = role === 'publisher'
      ? RtcRole.PUBLISHER
      : RtcRole.SUBSCRIBER;

    return RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs,
    );
  }

  // Generate RTC Token with account (string uid)
  generateRtcTokenWithAccount(
    channelName: string,
    account: string, // User's string identifier
    role: 'publisher' | 'subscriber',
    expirationTimeInSeconds: number = 3600,
  ): string {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const rtcRole = role === 'publisher'
      ? RtcRole.PUBLISHER
      : RtcRole.SUBSCRIBER;

    return RtcTokenBuilder.buildTokenWithAccount(
      this.appId,
      this.appCertificate,
      channelName,
      account,
      rtcRole,
      privilegeExpiredTs,
    );
  }

  // Generate RTM Token for messaging
  generateRtmToken(
    userId: string,
    expirationTimeInSeconds: number = 3600,
  ): string {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    return RtmTokenBuilder.buildToken(
      this.appId,
      this.appCertificate,
      userId,
      RtmRole.Rtm_User,
      privilegeExpiredTs,
    );
  }
}

// ========== Token Controller ==========
@Controller('agora')
@UseGuards(AuthGuard)
export class AgoraController {
  constructor(
    private readonly tokenService: AgoraTokenService,
    private readonly channelService: ChannelService,
  ) {}

  @Post('token/rtc')
  async getRtcToken(
    @Body() dto: GetRtcTokenDto,
    @CurrentUser() user: User,
  ): Promise<{ token: string; uid: number; channelName: string }> {
    const { channelName, role } = dto;

    // Validate user has access to channel
    const channel = await this.channelService.findByName(channelName);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const canJoin = await this.channelService.canUserJoin(user.id, channel.id);
    if (!canJoin) {
      throw new ForbiddenException('Not authorized to join channel');
    }

    // Generate deterministic UID from user ID (for consistency)
    const uid = this.generateUid(user.id);

    // Determine role based on channel settings
    const actualRole = this.determineRole(user, channel, role);

    // Generate token
    const token = this.tokenService.generateRtcToken(
      channelName,
      uid,
      actualRole,
      3600, // 1 hour
    );

    // Log token generation for audit
    await this.auditService.log({
      userId: user.id,
      action: 'AGORA_TOKEN_GENERATED',
      details: { channelName, role: actualRole },
    });

    return {
      token,
      uid,
      channelName,
    };
  }

  @Post('token/refresh')
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: User,
  ): Promise<{ token: string }> {
    const { channelName } = dto;

    // Verify user is still in the channel
    const isInChannel = await this.channelService.isUserInChannel(
      user.id,
      channelName,
    );

    if (!isInChannel) {
      throw new ForbiddenException('User not in channel');
    }

    const uid = this.generateUid(user.id);
    const role = await this.channelService.getUserRole(user.id, channelName);

    const token = this.tokenService.generateRtcToken(
      channelName,
      uid,
      role,
      3600,
    );

    return { token };
  }

  private generateUid(userId: string): number {
    // Generate consistent UID from user ID
    // Option 1: Hash to number
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 4294967295;

    // Option 2: Use auto-increment from database
    // return user.agoraUid;
  }

  private determineRole(
    user: User,
    channel: Channel,
    requestedRole: string,
  ): 'publisher' | 'subscriber' {
    // Host can always publish
    if (channel.hostId === user.id) {
      return 'publisher';
    }

    // Co-hosts can publish
    if (channel.coHostIds?.includes(user.id)) {
      return 'publisher';
    }

    // For interactive streaming, check if raised hand
    if (channel.mode === 'interactive') {
      const canPublish = channel.approvedSpeakers?.includes(user.id);
      return canPublish ? 'publisher' : 'subscriber';
    }

    // Default: subscriber
    return 'subscriber';
  }
}

// ========== Token DTOs ==========
export class GetRtcTokenDto {
  @IsString()
  @IsNotEmpty()
  channelName: string;

  @IsOptional()
  @IsIn(['publisher', 'subscriber'])
  role?: 'publisher' | 'subscriber';
}
```

---

## Channel Management

### Q8: How do you implement channel management for live streaming?

**Answer:**

```typescript
// ========== Channel Service ==========
@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly redis: Redis,
    private readonly eventBus: EventEmitter2,
  ) {}

  async createChannel(dto: CreateChannelDto, host: User): Promise<Channel> {
    // Generate unique channel name
    const channelName = `channel_${uuid().replace(/-/g, '')}`;

    const channel = await this.channelRepository.save({
      name: channelName,
      title: dto.title,
      description: dto.description,
      hostId: host.id,
      mode: dto.mode, // 'broadcast' | 'interactive'
      status: 'created',
      maxParticipants: dto.maxParticipants || 1000,
      settings: {
        allowChat: dto.allowChat ?? true,
        allowRaiseHand: dto.allowRaiseHand ?? true,
        recordingEnabled: dto.recordingEnabled ?? false,
      },
    });

    // Initialize channel state in Redis
    await this.redis.hset(`channel:${channelName}`, {
      participantCount: 0,
      status: 'created',
      startedAt: '',
    });

    return channel;
  }

  async startChannel(channelName: string, hostId: string): Promise<Channel> {
    const channel = await this.findByName(channelName);

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.hostId !== hostId) {
      throw new ForbiddenException('Only host can start channel');
    }

    channel.status = 'live';
    channel.startedAt = new Date();
    await this.channelRepository.save(channel);

    // Update Redis
    await this.redis.hset(`channel:${channelName}`, {
      status: 'live',
      startedAt: channel.startedAt.toISOString(),
    });

    // Notify subscribers
    this.eventBus.emit('channel:started', { channelName, hostId });

    return channel;
  }

  async endChannel(channelName: string, hostId: string): Promise<Channel> {
    const channel = await this.findByName(channelName);

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.hostId !== hostId) {
      throw new ForbiddenException('Only host can end channel');
    }

    channel.status = 'ended';
    channel.endedAt = new Date();
    await this.channelRepository.save(channel);

    // Clear Redis state
    await this.redis.del(`channel:${channelName}`);
    await this.redis.del(`channel:${channelName}:participants`);

    // Notify all participants
    this.eventBus.emit('channel:ended', { channelName });

    return channel;
  }

  async joinChannel(channelName: string, user: User): Promise<void> {
    const channel = await this.findByName(channelName);

    if (!channel || channel.status !== 'live') {
      throw new BadRequestException('Channel not available');
    }

    // Check participant limit
    const count = await this.getParticipantCount(channelName);
    if (count >= channel.maxParticipants) {
      throw new BadRequestException('Channel is full');
    }

    // Add to participants
    await this.redis.sadd(`channel:${channelName}:participants`, user.id);
    await this.redis.hincrby(`channel:${channelName}`, 'participantCount', 1);

    // Notify
    this.eventBus.emit('channel:user-joined', {
      channelName,
      userId: user.id,
      userName: user.name,
    });
  }

  async leaveChannel(channelName: string, userId: string): Promise<void> {
    await this.redis.srem(`channel:${channelName}:participants`, userId);
    await this.redis.hincrby(`channel:${channelName}`, 'participantCount', -1);

    this.eventBus.emit('channel:user-left', { channelName, userId });
  }

  async getParticipantCount(channelName: string): Promise<number> {
    const count = await this.redis.hget(`channel:${channelName}`, 'participantCount');
    return parseInt(count || '0', 10);
  }

  async getParticipants(channelName: string): Promise<string[]> {
    return this.redis.smembers(`channel:${channelName}:participants`);
  }

  // Raise hand functionality for interactive streams
  async raiseHand(channelName: string, userId: string): Promise<void> {
    await this.redis.zadd(
      `channel:${channelName}:raised_hands`,
      Date.now(),
      userId,
    );

    this.eventBus.emit('channel:hand-raised', { channelName, userId });
  }

  async lowerHand(channelName: string, userId: string): Promise<void> {
    await this.redis.zrem(`channel:${channelName}:raised_hands`, userId);

    this.eventBus.emit('channel:hand-lowered', { channelName, userId });
  }

  async approveRaisedHand(
    channelName: string,
    hostId: string,
    userId: string,
  ): Promise<void> {
    const channel = await this.findByName(channelName);

    if (channel?.hostId !== hostId) {
      throw new ForbiddenException('Only host can approve');
    }

    // Remove from raised hands
    await this.redis.zrem(`channel:${channelName}:raised_hands`, userId);

    // Add to approved speakers
    await this.redis.sadd(`channel:${channelName}:speakers`, userId);

    this.eventBus.emit('channel:speaker-approved', { channelName, userId });
  }

  async getRaisedHands(channelName: string): Promise<string[]> {
    return this.redis.zrange(`channel:${channelName}:raised_hands`, 0, -1);
  }
}

// ========== Channel Controller ==========
@Controller('channels')
@UseGuards(AuthGuard)
export class ChannelController {
  @Post()
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser() user: User,
  ): Promise<Channel> {
    return this.channelService.createChannel(dto, user);
  }

  @Post(':channelName/start')
  async startChannel(
    @Param('channelName') channelName: string,
    @CurrentUser() user: User,
  ): Promise<Channel> {
    return this.channelService.startChannel(channelName, user.id);
  }

  @Post(':channelName/end')
  async endChannel(
    @Param('channelName') channelName: string,
    @CurrentUser() user: User,
  ): Promise<Channel> {
    return this.channelService.endChannel(channelName, user.id);
  }

  @Post(':channelName/join')
  async joinChannel(
    @Param('channelName') channelName: string,
    @CurrentUser() user: User,
  ): Promise<{ token: string; uid: number }> {
    await this.channelService.joinChannel(channelName, user);

    // Generate token
    return this.agoraController.getRtcToken(
      { channelName, role: 'subscriber' },
      user,
    );
  }

  @Post(':channelName/leave')
  async leaveChannel(
    @Param('channelName') channelName: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.channelService.leaveChannel(channelName, user.id);
  }

  @Post(':channelName/raise-hand')
  async raiseHand(
    @Param('channelName') channelName: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.channelService.raiseHand(channelName, user.id);
  }

  @Get(':channelName/stats')
  async getChannelStats(
    @Param('channelName') channelName: string,
  ): Promise<ChannelStats> {
    const [count, raisedHands] = await Promise.all([
      this.channelService.getParticipantCount(channelName),
      this.channelService.getRaisedHands(channelName),
    ]);

    return {
      participantCount: count,
      raisedHandsCount: raisedHands.length,
    };
  }
}
```

---

## RTMP Ingest

### Q9: Explain RTMP ingest for live streaming.

**Answer:**

```typescript
// RTMP (Real-Time Messaging Protocol) allows external sources
// like OBS, cameras, or encoders to push streams to Agora

/*
┌─────────────────────────────────────────────────────────────────┐
│                    RTMP Ingest Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐     ┌────────────────┐     ┌──────────────┐    │
│  │            │     │                │     │              │    │
│  │  OBS/FFMPEG│────→│  RTMP Server   │────→│    Agora     │    │
│  │  Encoder   │     │  (Ingest)      │     │   Channel    │    │
│  │            │     │                │     │              │    │
│  └────────────┘     └────────────────┘     └──────────────┘    │
│                            │                      │             │
│                            ▼                      ▼             │
│                     ┌──────────┐           ┌──────────┐        │
│                     │ Transcode│           │ Viewers  │        │
│                     │ (Optional)│           │ (SDK)    │        │
│                     └──────────┘           └──────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
*/

// ========== Agora RTMP Converter Setup ==========
// Agora provides Media Push feature to convert RTMP to RTC

@Injectable()
export class RtmpService {
  private readonly agoraAppId: string;
  private readonly agoraRestApiUrl = 'https://api.agora.io';

  constructor(private readonly configService: ConfigService) {
    this.agoraAppId = configService.get('AGORA_APP_ID');
  }

  // Generate RTMP push URL for host
  async generateRtmpUrl(channelName: string, streamKey: string): Promise<RtmpConfig> {
    // Your RTMP server URL or Agora's Media Push
    const rtmpServerUrl = this.configService.get('RTMP_SERVER_URL');

    return {
      serverUrl: rtmpServerUrl,
      streamKey: `${channelName}?key=${streamKey}`,
      fullUrl: `${rtmpServerUrl}/${channelName}?key=${streamKey}`,
    };
  }

  // Start RTMP push from Agora to external platforms (YouTube, Twitch)
  async startRtmpPush(
    channelName: string,
    uid: number,
    token: string,
    rtmpUrl: string,
  ): Promise<void> {
    const response = await fetch(
      `${this.agoraRestApiUrl}/v1/projects/${this.agoraAppId}/rtmp-converters`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.getAuthHeader()}`,
        },
        body: JSON.stringify({
          converter: {
            name: `converter_${channelName}`,
            transcodeOptions: {
              rtcChannel: channelName,
              token,
              uid: uid.toString(),
              audioOptions: {
                codecProfile: 'LC-AAC',
                sampleRate: 48000,
              },
              videoOptions: {
                codec: 'H.264',
                width: 1280,
                height: 720,
                frameRate: 30,
                bitrate: 2000,
              },
            },
            rtmpUrl,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to start RTMP push');
    }
  }

  // Stop RTMP push
  async stopRtmpPush(converterId: string): Promise<void> {
    await fetch(
      `${this.agoraRestApiUrl}/v1/projects/${this.agoraAppId}/rtmp-converters/${converterId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${this.getAuthHeader()}`,
        },
      },
    );
  }

  private getAuthHeader(): string {
    const credentials = `${this.configService.get('AGORA_CUSTOMER_ID')}:${this.configService.get('AGORA_CUSTOMER_SECRET')}`;
    return Buffer.from(credentials).toString('base64');
  }
}

// ========== Using Node Media Server for RTMP Ingest ==========
import NodeMediaServer from 'node-media-server';

@Injectable()
export class RtmpIngestService implements OnModuleInit {
  private nms: NodeMediaServer;

  constructor(
    private readonly channelService: ChannelService,
    private readonly tokenService: AgoraTokenService,
  ) {}

  onModuleInit() {
    const config = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 8000,
        allow_origin: '*',
      },
    };

    this.nms = new NodeMediaServer(config);

    // Authentication
    this.nms.on('prePublish', async (id, streamPath, args) => {
      const session = this.nms.getSession(id);
      const streamKey = args.key;
      const channelName = streamPath.split('/').pop();

      try {
        // Validate stream key
        const isValid = await this.validateStreamKey(channelName, streamKey);
        if (!isValid) {
          session.reject();
          return;
        }

        // Start forwarding to Agora
        await this.forwardToAgora(channelName, streamPath);

      } catch (error) {
        console.error('RTMP auth failed:', error);
        session.reject();
      }
    });

    this.nms.on('donePublish', async (id, streamPath) => {
      const channelName = streamPath.split('/').pop();
      await this.stopForwardingToAgora(channelName);
    });

    this.nms.run();
  }

  private async validateStreamKey(
    channelName: string,
    streamKey: string,
  ): Promise<boolean> {
    const channel = await this.channelService.findByName(channelName);
    return channel?.streamKey === streamKey;
  }

  private async forwardToAgora(
    channelName: string,
    streamPath: string,
  ): Promise<void> {
    // Use FFmpeg to forward RTMP to Agora
    const agoraRtmpUrl = `rtmp://rtmp.agora.io/live/${channelName}`;

    // FFmpeg command to forward stream
    // ffmpeg -i rtmp://localhost:1935${streamPath} -c copy -f flv ${agoraRtmpUrl}
  }

  private async stopForwardingToAgora(channelName: string): Promise<void> {
    // Stop FFmpeg process
  }
}
```

---

## Live Streaming Architecture

### Q10: Design a scalable live streaming architecture.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Live Streaming Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRODUCERS                    BACKEND                      CONSUMERS         │
│  ─────────                    ───────                      ─────────         │
│                                                                              │
│  ┌──────────┐              ┌─────────────┐                                  │
│  │  Mobile  │─────────────→│             │                                  │
│  │   App    │   Agora SDK  │   Agora     │                                  │
│  └──────────┘              │   Cloud     │              ┌──────────┐        │
│                            │             │─────────────→│  Mobile  │        │
│  ┌──────────┐              │  - Edge     │  Agora SDK   │  Viewer  │        │
│  │   Web    │─────────────→│  - CDN      │              └──────────┘        │
│  │  Client  │   Agora SDK  │  - Transcode│                                  │
│  └──────────┘              │             │              ┌──────────┐        │
│                            └──────┬──────┘─────────────→│   Web    │        │
│  ┌──────────┐                     │         Agora SDK   │  Viewer  │        │
│  │   OBS/   │──────────┐          │                     └──────────┘        │
│  │ Encoder  │  RTMP    │          │                                         │
│  └──────────┘          ▼          │                                         │
│                 ┌──────────┐      │                     ┌──────────┐        │
│                 │  RTMP    │      │     RTMP Push       │ YouTube  │        │
│                 │  Server  │──────┼────────────────────→│ Twitch   │        │
│                 └──────────┘      │                     └──────────┘        │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌───────────────┐                                  │
│                          │   Your API    │                                  │
│                          │   Backend     │                                  │
│                          │               │                                  │
│                          │ - Auth/Tokens │                                  │
│                          │ - Channel Mgmt│                                  │
│                          │ - User Mgmt   │                                  │
│                          │ - Chat        │                                  │
│                          │ - Analytics   │                                  │
│                          └───────┬───────┘                                  │
│                                  │                                          │
│                     ┌────────────┼────────────┐                             │
│                     ▼            ▼            ▼                             │
│              ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│              │PostgreSQL│ │  Redis   │ │  Kafka   │                        │
│              │          │ │          │ │          │                        │
│              │ - Users  │ │ - Session│ │ - Events │                        │
│              │ - Channel│ │ - Pubsub │ │ - Logs   │                        │
│              │ - Chat   │ │ - Cache  │ │          │                        │
│              └──────────┘ └──────────┘ └──────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== Complete Live Streaming Module ==========

// Types
interface StreamConfig {
  channelName: string;
  hostId: string;
  title: string;
  mode: 'broadcast' | 'interactive';
  quality: 'SD' | 'HD' | 'FHD';
  features: {
    chat: boolean;
    reactions: boolean;
    gifts: boolean;
    recording: boolean;
    multiHost: boolean;
  };
}

interface StreamStats {
  viewerCount: number;
  peakViewers: number;
  duration: number;
  totalReactions: number;
  totalGifts: number;
}

// Main Streaming Service
@Injectable()
export class LiveStreamingService {
  constructor(
    private readonly channelService: ChannelService,
    private readonly tokenService: AgoraTokenService,
    private readonly chatService: StreamChatService,
    private readonly analyticsService: StreamAnalyticsService,
    private readonly recordingService: CloudRecordingService,
    private readonly eventBus: EventEmitter2,
    private readonly redis: Redis,
  ) {}

  async startStream(config: StreamConfig, host: User): Promise<StreamSession> {
    // 1. Create channel
    const channel = await this.channelService.createChannel({
      name: config.channelName,
      title: config.title,
      mode: config.mode,
    }, host);

    // 2. Generate host token
    const uid = this.generateUid(host.id);
    const token = this.tokenService.generateRtcToken(
      channel.name,
      uid,
      'publisher',
      7200, // 2 hours
    );

    // 3. Initialize features
    if (config.features.chat) {
      await this.chatService.createRoom(channel.name);
    }

    if (config.features.recording) {
      await this.recordingService.startRecording(channel.name);
    }

    // 4. Initialize analytics
    await this.analyticsService.initSession(channel.name, host.id);

    // 5. Emit stream started event
    this.eventBus.emit('stream:started', {
      channelName: channel.name,
      hostId: host.id,
      title: config.title,
    });

    return {
      channel,
      token,
      uid,
      rtcConfig: this.getRtcConfig(config.quality),
    };
  }

  async endStream(channelName: string, hostId: string): Promise<StreamStats> {
    // 1. End channel
    await this.channelService.endChannel(channelName, hostId);

    // 2. Stop recording
    await this.recordingService.stopRecording(channelName);

    // 3. Get final stats
    const stats = await this.analyticsService.finalizeSession(channelName);

    // 4. Clean up
    await this.chatService.closeRoom(channelName);

    // 5. Emit stream ended
    this.eventBus.emit('stream:ended', { channelName, stats });

    return stats;
  }

  async joinAsViewer(
    channelName: string,
    user: User,
  ): Promise<ViewerSession> {
    // 1. Verify stream is live
    const channel = await this.channelService.findByName(channelName);
    if (!channel || channel.status !== 'live') {
      throw new BadRequestException('Stream not available');
    }

    // 2. Add viewer
    await this.channelService.joinChannel(channelName, user);

    // 3. Generate viewer token
    const uid = this.generateUid(user.id);
    const token = this.tokenService.generateRtcToken(
      channelName,
      uid,
      'subscriber',
      3600,
    );

    // 4. Get chat token if enabled
    let chatToken = null;
    if (channel.settings.allowChat) {
      chatToken = await this.chatService.getToken(channelName, user.id);
    }

    // 5. Track viewer
    await this.analyticsService.trackViewer(channelName, user.id);

    return {
      token,
      uid,
      chatToken,
      host: await this.getHostInfo(channel.hostId),
      viewerCount: await this.channelService.getParticipantCount(channelName),
    };
  }

  async requestToSpeak(channelName: string, userId: string): Promise<void> {
    await this.channelService.raiseHand(channelName, userId);
  }

  async approveSpaker(
    channelName: string,
    hostId: string,
    userId: string,
  ): Promise<{ token: string }> {
    await this.channelService.approveRaisedHand(channelName, hostId, userId);

    // Generate publisher token for new speaker
    const uid = this.generateUid(userId);
    const token = this.tokenService.generateRtcToken(
      channelName,
      uid,
      'publisher',
      3600,
    );

    return { token };
  }

  async sendReaction(
    channelName: string,
    userId: string,
    reactionType: string,
  ): Promise<void> {
    // Rate limit reactions
    const key = `reaction:${channelName}:${userId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 1);

    if (count > 5) {
      return; // Silently ignore
    }

    // Broadcast reaction
    this.eventBus.emit(`channel:${channelName}:reaction`, {
      userId,
      type: reactionType,
    });

    // Track for analytics
    await this.analyticsService.trackReaction(channelName, reactionType);
  }

  private getRtcConfig(quality: string): RtcConfig {
    const configs = {
      SD: { width: 640, height: 360, frameRate: 15, bitrate: 400 },
      HD: { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
      FHD: { width: 1920, height: 1080, frameRate: 30, bitrate: 3000 },
    };
    return configs[quality] || configs.HD;
  }

  private generateUid(userId: string): number {
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 4294967295;
  }
}
```

---

## Latency vs Cost Trade-offs

### Q11: Explain the trade-offs between latency and cost in live streaming.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Latency vs Cost Trade-offs                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ultra-Low Latency (<500ms)                                                 │
│  ─────────────────────────                                                  │
│  Technology: WebRTC / Agora RTC                                             │
│  Cost: $$$$$                                                                │
│  Use Cases: Live auctions, gaming, interactive shows                        │
│  Pros: Real-time interaction, bidirectional                                 │
│  Cons: Expensive, limited scale                                             │
│                                                                              │
│  Low Latency (1-3s)                                                         │
│  ─────────────────                                                          │
│  Technology: WebRTC SFU, Agora Live                                         │
│  Cost: $$$$                                                                 │
│  Use Cases: Live classes, webinars, Q&A sessions                            │
│  Pros: Good interactivity, scalable                                         │
│  Cons: Moderate cost                                                        │
│                                                                              │
│  Standard Latency (5-10s)                                                   │
│  ─────────────────────────                                                  │
│  Technology: HLS with low latency, DASH                                     │
│  Cost: $$$                                                                  │
│  Use Cases: Sports, news, concerts                                          │
│  Pros: Good quality, CDN friendly                                           │
│  Cons: Delayed interaction                                                  │
│                                                                              │
│  High Latency (15-30s)                                                      │
│  ────────────────────────                                                   │
│  Technology: Standard HLS/DASH                                              │
│  Cost: $$                                                                   │
│  Use Cases: VOD-like live, re-streaming                                     │
│  Pros: Cheapest, most reliable                                              │
│  Cons: No real interaction                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// Choosing the right approach
interface StreamingStrategy {
  mode: 'ultra-low' | 'low' | 'standard' | 'high';
  technology: string;
  estimatedLatency: string;
  costPerMinutePerViewer: number;
  maxConcurrentViewers: number;
  features: string[];
}

function selectStreamingStrategy(requirements: {
  interactivity: 'none' | 'low' | 'high' | 'real-time';
  budget: 'low' | 'medium' | 'high';
  expectedViewers: number;
  duration: number; // minutes
}): StreamingStrategy {
  const { interactivity, budget, expectedViewers, duration } = requirements;

  // Ultra-low latency for real-time interaction
  if (interactivity === 'real-time') {
    return {
      mode: 'ultra-low',
      technology: 'Agora RTC',
      estimatedLatency: '<500ms',
      costPerMinutePerViewer: 0.004, // ~$4 per 1000 viewer-minutes
      maxConcurrentViewers: 10000,
      features: [
        'Bidirectional communication',
        'Screen sharing',
        'Multi-host',
        'Raise hand',
      ],
    };
  }

  // Low latency for interactive but not real-time
  if (interactivity === 'high' && budget !== 'low') {
    return {
      mode: 'low',
      technology: 'Agora Live Streaming',
      estimatedLatency: '1-3s',
      costPerMinutePerViewer: 0.002,
      maxConcurrentViewers: 100000,
      features: [
        'Host can see comments quickly',
        'Reactions',
        'Polling',
        'Co-hosting',
      ],
    };
  }

  // Standard latency for most use cases
  if (expectedViewers > 10000 || budget === 'medium') {
    return {
      mode: 'standard',
      technology: 'HLS Low Latency + CDN',
      estimatedLatency: '5-10s',
      costPerMinutePerViewer: 0.0005,
      maxConcurrentViewers: 1000000,
      features: [
        'Chat alongside video',
        'CDN caching',
        'Adaptive bitrate',
        'DVR functionality',
      ],
    };
  }

  // High latency for budget-conscious
  return {
    mode: 'high',
    technology: 'Standard HLS + CDN',
    estimatedLatency: '15-30s',
    costPerMinutePerViewer: 0.0001,
    maxConcurrentViewers: 10000000,
    features: [
      'Maximum reliability',
      'Lowest cost',
      'Full CDN caching',
      'Best quality',
    ],
  };
}

// Cost calculation example
function calculateStreamingCost(
  strategy: StreamingStrategy,
  viewerMinutes: number,
): number {
  const baseCost = viewerMinutes * strategy.costPerMinutePerViewer;

  // Add infrastructure costs
  const infrastructureCost = {
    'ultra-low': 50,  // Base server costs
    'low': 30,
    'standard': 15,
    'high': 5,
  }[strategy.mode];

  return baseCost + infrastructureCost;
}

// Example usage
const strategy = selectStreamingStrategy({
  interactivity: 'high',
  budget: 'medium',
  expectedViewers: 5000,
  duration: 60,
});

const viewerMinutes = 5000 * 60; // 5000 viewers for 60 minutes
const estimatedCost = calculateStreamingCost(strategy, viewerMinutes);

console.log(`
  Strategy: ${strategy.mode}
  Technology: ${strategy.technology}
  Latency: ${strategy.estimatedLatency}
  Estimated Cost: $${estimatedCost.toFixed(2)}
`);

// Hybrid approach for large events
class HybridStreamingService {
  async setupHybridStream(channelName: string): Promise<HybridConfig> {
    return {
      // Ultra-low latency for hosts and VIPs
      vipStream: {
        technology: 'Agora RTC',
        maxUsers: 100,
        token: await this.generateRtcToken(channelName, 'publisher'),
      },

      // Low latency for interactive viewers
      interactiveStream: {
        technology: 'Agora Live',
        maxUsers: 10000,
        token: await this.generateLiveToken(channelName),
      },

      // Standard latency for mass audience
      broadcastStream: {
        technology: 'HLS',
        url: `https://cdn.example.com/live/${channelName}/playlist.m3u8`,
        maxUsers: 'unlimited',
      },
    };
  }
}
```

---

## Quick Reference

| Topic | Key Points |
|-------|------------|
| WebSocket | Bidirectional, persistent, lowest latency |
| SSE | Server push only, auto-reconnect, HTTP |
| Long Polling | Fallback, highest overhead |
| Agora RTC | <500ms latency, bidirectional |
| Agora Live | 1-3s latency, scalable |
| RTMP | External encoders, studio quality |
| Token | Always server-side, time-limited |
| Channel | Manage state in Redis for scale |

---

## Common Interview Questions

1. Compare WebSocket, SSE, and Long Polling.
2. How do you scale WebSocket connections?
3. Explain Agora token security.
4. Design a live streaming architecture.
5. How do you handle network reconnection?
6. What's the difference between RTC and live streaming mode?
7. How do you implement raise-hand functionality?
8. Explain RTMP ingest workflow.
9. How do you choose between latency and cost?
10. How do you handle thousands of concurrent viewers?

---

## Scaling WebSocket Servers Horizontally

### Q12: How do you scale WebSocket servers horizontally?

**Answer:**

Scaling WebSocket servers is fundamentally different from scaling stateless HTTP servers. Each WebSocket connection is a long-lived, stateful TCP connection bound to a specific server instance. When you add more servers, you need a way to broadcast messages across all instances.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              Horizontal WebSocket Scaling Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Clients                                                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ C1   │ │ C2   │ │ C3   │ │ C4   │ │ C5   │ │ C6   │                   │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘                   │
│     │        │        │        │        │        │                         │
│     └────────┴────────┘        └────────┴────────┘                         │
│              │                          │                                   │
│              ▼                          ▼                                   │
│  ┌────────────────────┐    ┌────────────────────┐                          │
│  │  WS Server #1      │    │  WS Server #2      │                          │
│  │  (C1, C2, C3)      │    │  (C4, C5, C6)      │                          │
│  └─────────┬──────────┘    └─────────┬──────────┘                          │
│            │                          │                                     │
│            └──────────┬───────────────┘                                     │
│                       ▼                                                     │
│           ┌──────────────────────┐                                          │
│           │   Redis Pub/Sub      │                                          │
│           │   (Message Broker)   │                                          │
│           └──────────────────────┘                                          │
│                                                                              │
│  When C1 sends a message to a room, Server #1 publishes to Redis.          │
│  Server #2 receives via subscription and broadcasts to C4, C5, C6.         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The Challenge: Sticky Sessions vs Stateless**

- **Sticky sessions** pin a client to the same server instance (via cookie or IP hash). This is required for Socket.io's HTTP long-polling transport handshake but adds complexity to load balancer configuration.
- **Stateless design** means any server can handle any connection, but you need a shared state layer (Redis) for room membership, user presence, etc.

**Redis Adapter for Socket.io**

The `@socket.io/redis-adapter` allows multiple Socket.io instances to broadcast events to each other through Redis Pub/Sub. Every `emit` on one server propagates to all other servers.

```typescript
// ========== Socket.io with Redis Adapter for Horizontal Scaling ==========

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplication, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(private app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis adapter connected for Socket.io');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Important for horizontal scaling:
      transports: ['websocket', 'polling'],
      // Connection state recovery (Socket.io v4.6+)
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
    });

    server.adapter(this.adapterConstructor);
    return server;
  }
}

// ========== Bootstrap with Redis Adapter ==========
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(3000);
}

// ========== Gateway that works across instances ==========
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly redis: Redis,
    private readonly userService: UserService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = client.handshake.auth.userId;

    // Store connection mapping in Redis (shared across instances)
    await this.redis.hset('ws:connections', client.id, JSON.stringify({
      userId,
      serverId: process.env.INSTANCE_ID || 'default',
      connectedAt: Date.now(),
    }));

    // Track user's active connections (they might be on multiple devices)
    await this.redis.sadd(`ws:user:${userId}:connections`, client.id);

    this.logger.log(`Client ${client.id} connected (user: ${userId})`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.handshake.auth.userId;

    await this.redis.hdel('ws:connections', client.id);
    await this.redis.srem(`ws:user:${userId}:connections`, client.id);

    // Check if user has no more connections
    const remaining = await this.redis.scard(`ws:user:${userId}:connections`);
    if (remaining === 0) {
      await this.redis.del(`ws:user:${userId}:connections`);
      // User is fully offline — broadcast presence update
      this.server.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string; content: string },
  ): Promise<void> {
    // This emit goes through the Redis adapter —
    // all instances in the room receive it
    this.server.to(payload.room).emit('message', {
      from: client.handshake.auth.userId,
      content: payload.content,
      timestamp: Date.now(),
    });
  }
}
```

**Load Balancing WebSocket Connections**

- **Layer 7 (Application-level)**: NGINX or HAProxy can inspect the `Upgrade: websocket` header and route accordingly. Use `ip_hash` or cookie-based sticky sessions for Socket.io polling fallback.
- **Connection-aware balancing**: Route new connections to the server with the fewest active WebSocket connections (least-connections strategy).

```nginx
# NGINX configuration for WebSocket load balancing
upstream websocket_servers {
    # ip_hash ensures same client hits same server (needed for polling transport)
    ip_hash;
    server ws-server-1:3000;
    server ws-server-2:3000;
    server ws-server-3:3000;
}

server {
    listen 80;

    location /socket.io/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

**Kubernetes Considerations**

- **Headless services**: Use headless services (`clusterIP: None`) when you need direct pod-to-pod communication for WebSocket traffic.
- **Sticky sessions with Ingress**: Annotate your Ingress with `nginx.ingress.kubernetes.io/affinity: "cookie"` so the same client always reaches the same pod during the polling handshake phase.
- **Horizontal Pod Autoscaler (HPA)**: Scale based on custom metrics like active WebSocket connections rather than CPU/memory alone.

> **Interview Tip:** Interviewers love to hear that you understand *why* WebSocket scaling is harder than HTTP scaling. The key insight: HTTP is stateless and any server can handle any request, but WebSocket connections are stateful and bound to a specific process. The Redis adapter pattern decouples "which server holds the connection" from "who can broadcast to that connection."

---

## Socket.io Rooms and Namespaces

### Q13: Explain Socket.io Rooms and Namespaces with a NestJS example.

**Answer:**

**Namespaces** are separate communication channels on the same underlying connection. They let you split your application logic — `/chat`, `/notifications`, `/admin` — each with its own event handlers and middleware.

**Rooms** are arbitrary groupings of connections *within* a namespace. A socket can join and leave rooms dynamically. Broadcasting to a room only reaches sockets in that room.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  Namespaces vs Rooms                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Socket.io Server                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                                                                    │      │
│  │  Namespace: /chat                    Namespace: /notifications     │      │
│  │  ┌────────────────────────────┐     ┌──────────────────────────┐  │      │
│  │  │                             │     │                           │  │      │
│  │  │  Room: "general"            │     │  Room: "user-123"        │  │      │
│  │  │  ┌────┐ ┌────┐ ┌────┐     │     │  ┌────┐                  │  │      │
│  │  │  │ C1 │ │ C2 │ │ C3 │     │     │  │ C1 │                  │  │      │
│  │  │  └────┘ └────┘ └────┘     │     │  └────┘                  │  │      │
│  │  │                             │     │                           │  │      │
│  │  │  Room: "project-abc"        │     │  Room: "team-alpha"      │  │      │
│  │  │  ┌────┐ ┌────┐             │     │  ┌────┐ ┌────┐          │  │      │
│  │  │  │ C1 │ │ C4 │             │     │  │ C2 │ │ C3 │          │  │      │
│  │  │  └────┘ └────┘             │     │  └────┘ └────┘          │  │      │
│  │  │                             │     │                           │  │      │
│  │  └────────────────────────────┘     └──────────────────────────┘  │      │
│  │                                                                    │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  Note: C1 is in two rooms within /chat AND in /notifications                │
│  A socket can be in multiple rooms across multiple namespaces               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== Chat Application with Rooms and Namespaces in NestJS ==========

// 1. Chat Namespace Gateway
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  // --- Namespace Middleware for Authentication ---
  afterInit(server: Namespace): void {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const user = await this.authService.verifyToken(token);
        socket.data.user = user; // Attach user to socket
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = client.data.user;
    this.logger.log(`User ${user.name} connected to /chat`);

    // Auto-join user's personal room (for DMs)
    client.join(`user:${user.id}`);

    // Auto-join user's team rooms
    const teams = await this.chatService.getUserTeams(user.id);
    for (const team of teams) {
      client.join(`team:${team.id}`);
    }

    // Notify others this user is online
    this.server.emit('user:online', {
      userId: user.id,
      name: user.name,
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user;
    this.server.emit('user:offline', { userId: user.id });
  }

  // --- Joining / Leaving Rooms Dynamically ---
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ): Promise<WsResponse<any>> {
    const user = client.data.user;

    // Authorization check: can this user join this room?
    const canJoin = await this.chatService.canUserJoinRoom(user.id, payload.roomId);
    if (!canJoin) {
      return { event: 'error', data: { message: 'Not authorized to join this room' } };
    }

    client.join(payload.roomId);

    // Notify room members
    this.server.to(payload.roomId).emit('room:user-joined', {
      roomId: payload.roomId,
      userId: user.id,
      name: user.name,
    });

    // Send recent messages to the joining user
    const recentMessages = await this.chatService.getRecentMessages(payload.roomId, 50);
    return { event: 'room:history', data: { roomId: payload.roomId, messages: recentMessages } };
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    client.leave(payload.roomId);

    this.server.to(payload.roomId).emit('room:user-left', {
      roomId: payload.roomId,
      userId: user.id,
    });
  }

  // --- Broadcasting Patterns ---
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; content: string; type?: string },
  ): Promise<void> {
    const user = client.data.user;

    // Persist message
    const message = await this.chatService.saveMessage({
      roomId: payload.roomId,
      senderId: user.id,
      content: payload.content,
      type: payload.type || 'text',
    });

    // Broadcast to room (including sender)
    this.server.to(payload.roomId).emit('message:new', {
      id: message.id,
      roomId: payload.roomId,
      sender: { id: user.id, name: user.name },
      content: payload.content,
      type: payload.type || 'text',
      createdAt: message.createdAt,
    });
  }

  @SubscribeMessage('message:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ): void {
    // Broadcast to room EXCEPT sender
    client.to(payload.roomId).emit('message:typing', {
      roomId: payload.roomId,
      userId: client.data.user.id,
      name: client.data.user.name,
    });
  }

  // Direct message to a specific user (via their personal room)
  @SubscribeMessage('dm:send')
  async handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { toUserId: string; content: string },
  ): Promise<void> {
    const from = client.data.user;

    const message = await this.chatService.saveDM({
      fromId: from.id,
      toId: payload.toUserId,
      content: payload.content,
    });

    // Send to recipient's personal room
    this.server.to(`user:${payload.toUserId}`).emit('dm:new', {
      id: message.id,
      from: { id: from.id, name: from.name },
      content: payload.content,
      createdAt: message.createdAt,
    });
  }
}

// 2. Notifications Namespace Gateway (separate concerns)
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Namespace;

  afterInit(server: Namespace): void {
    // Same auth middleware pattern
    server.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      const user = await this.authService.verifyToken(token);
      socket.data.user = user;
      next();
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = client.data.user;
    // Each user joins their own notification room
    client.join(`notifications:${user.id}`);
  }

  // Called from other services to push notifications
  async sendNotification(userId: string, notification: Notification): Promise<void> {
    this.server.to(`notifications:${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      createdAt: new Date(),
    });
  }

  // Broadcast to all connected users (e.g., maintenance notice)
  async broadcastToAll(message: string): Promise<void> {
    this.server.emit('broadcast', { message, timestamp: new Date() });
  }
}

// 3. Admin Namespace with Role-Based Access
@WebSocketGateway({
  namespace: '/admin',
  cors: { origin: '*' },
})
export class AdminGateway {
  @WebSocketServer()
  server: Namespace;

  afterInit(server: Namespace): void {
    server.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      const user = await this.authService.verifyToken(token);

      if (user.role !== 'admin') {
        return next(new Error('Admin access required'));
      }

      socket.data.user = user;
      next();
    });
  }

  @SubscribeMessage('dashboard:subscribe')
  handleDashboardSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { metrics: string[] },
  ): void {
    // Join rooms for each metric the admin wants to watch
    for (const metric of payload.metrics) {
      client.join(`metric:${metric}`);
    }
  }

  // Push real-time metrics to admin dashboards
  async pushMetric(metricName: string, value: any): Promise<void> {
    this.server.to(`metric:${metricName}`).emit('metric:update', {
      name: metricName,
      value,
      timestamp: Date.now(),
    });
  }
}
```

**Broadcasting Cheat Sheet:**

| Method | Reaches |
|--------|---------|
| `server.emit()` | All connected clients in the namespace |
| `server.to('room').emit()` | All clients in the specified room |
| `client.to('room').emit()` | All clients in the room EXCEPT the sender |
| `client.emit()` | Only the sender |
| `server.to('room1').to('room2').emit()` | Union of room1 and room2 |
| `server.except('room').emit()` | All clients NOT in the room |

> **Interview Tip:** When asked about rooms vs namespaces, emphasize that namespaces provide *logical separation* (like separate apps on one server) while rooms provide *dynamic grouping within a namespace*. A common mistake is using separate namespaces when rooms would suffice — namespaces are for fundamentally different concerns (chat vs notifications), rooms are for dynamic grouping (chat rooms, channels).

---

## Connection State Recovery and Resilience

### Q14: How do you handle WebSocket disconnections and ensure resilient connections?

**Answer:**

Network connections are unreliable. Clients lose WiFi, switch from WiFi to cellular, go through tunnels, or experience packet loss. A production WebSocket system must handle all of these gracefully.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              Connection Resilience Strategy                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Normal Flow:                                                               │
│  Client ←──ping/pong──→ Server  (heartbeat every 25s)                      │
│                                                                              │
│  Disconnection Detected:                                                    │
│  1. Server: no pong after timeout → close connection, buffer messages       │
│  2. Client: no ping after timeout → start reconnection                      │
│                                                                              │
│  Reconnection Flow:                                                         │
│  Client ──→ attempt 1 (wait 1s) ──→ FAIL                                  │
│  Client ──→ attempt 2 (wait 2s) ──→ FAIL                                  │
│  Client ──→ attempt 3 (wait 4s + jitter) ──→ SUCCESS                      │
│         ──→ Sync missed messages (delta or full)                            │
│                                                                              │
│  Fallback Chain (if WebSocket fails repeatedly):                            │
│  WebSocket ──→ SSE ──→ Long Polling                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Detecting Disconnections: Heartbeat / Ping-Pong**

- Socket.io has built-in ping/pong. The server sends a `ping`; the client responds with `pong`. If no `pong` arrives within `pingTimeout`, the connection is considered dead.
- Tune `pingInterval` and `pingTimeout` carefully:
  - Too frequent = unnecessary bandwidth (especially on mobile)
  - Too slow = late disconnection detection, zombie connections linger

**Client-Side Reconnection: Exponential Backoff with Jitter**

Never reconnect on a fixed interval — if 10,000 clients disconnect at once (server restart), they all reconnect simultaneously (thundering herd). Exponential backoff with jitter spreads the reconnection attempts over time.

**State Synchronization After Reconnection**

- **Delta sync**: Client sends its last known event ID or timestamp. Server sends only what was missed. Efficient but requires message ordering guarantees.
- **Full sync**: Client re-fetches all current state. Simple but expensive. Use as a fallback when delta sync fails.

**Stale Connection Cleanup (Zombie Connections)**

Connections that the server thinks are alive but the client has already abandoned. These waste memory and can lead to incorrect presence data. The heartbeat mechanism is the primary defense — if a client misses heartbeats, clean up their resources.

```typescript
// ========== Resilient WebSocket Client with Message Queue ==========

// --- Server-Side: Connection Management with Buffering ---
@WebSocketGateway({ namespace: '/app' })
export class ResilientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly redis: Redis,
    private readonly messageBufferService: MessageBufferService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = client.data.user.id;

    // Check if this is a reconnection
    const lastEventId = client.handshake.auth.lastEventId;

    if (lastEventId) {
      // Delta sync: send missed messages
      const missedMessages = await this.messageBufferService.getMessagesSince(
        userId,
        lastEventId,
      );

      if (missedMessages.length > 0) {
        client.emit('sync:missed', { messages: missedMessages });
      }
    }

    // Clear any buffered messages for this user
    await this.messageBufferService.clearBuffer(userId);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.user.id;

    // Don't immediately mark offline — they might reconnect quickly
    // Use a grace period
    await this.redis.set(
      `ws:disconnect-grace:${userId}`,
      'pending',
      'EX',
      30, // 30-second grace period
    );

    // After grace period, check if still disconnected
    setTimeout(async () => {
      const grace = await this.redis.get(`ws:disconnect-grace:${userId}`);
      if (grace === 'pending') {
        // Still disconnected after grace period
        await this.handleFullDisconnect(userId);
      }
    }, 30_000);
  }

  private async handleFullDisconnect(userId: string): Promise<void> {
    await this.redis.del(`ws:disconnect-grace:${userId}`);
    this.server.emit('user:offline', { userId });
  }

  // When sending messages, buffer for disconnected users
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const eventId = crypto.randomUUID();
    const message = { eventId, event, data, timestamp: Date.now() };

    // Try to send directly
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();

    if (sockets.length > 0) {
      this.server.to(`user:${userId}`).emit(event, { ...data, eventId });
    } else {
      // User is offline — buffer the message
      await this.messageBufferService.bufferMessage(userId, message);
    }
  }
}

// --- Message Buffer Service ---
@Injectable()
export class MessageBufferService {
  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly BUFFER_TTL = 24 * 60 * 60; // 24 hours

  constructor(private readonly redis: Redis) {}

  async bufferMessage(userId: string, message: any): Promise<void> {
    const key = `ws:buffer:${userId}`;

    await this.redis
      .multi()
      .rpush(key, JSON.stringify(message))
      .ltrim(key, -this.MAX_BUFFER_SIZE, -1) // Keep latest N
      .expire(key, this.BUFFER_TTL)
      .exec();
  }

  async getMessagesSince(userId: string, lastEventId: string): Promise<any[]> {
    const key = `ws:buffer:${userId}`;
    const allMessages = await this.redis.lrange(key, 0, -1);

    const parsed = allMessages.map((m) => JSON.parse(m));

    // Find the index of the last known event
    const lastIndex = parsed.findIndex((m) => m.eventId === lastEventId);

    if (lastIndex === -1) {
      // Last event not found — return all (full sync scenario)
      return parsed;
    }

    // Return everything after the last known event
    return parsed.slice(lastIndex + 1);
  }

  async clearBuffer(userId: string): Promise<void> {
    await this.redis.del(`ws:buffer:${userId}`);
  }
}

// --- Client-Side: Resilient WebSocket Client ---
// (TypeScript — runs in browser or React Native)

class ResilientSocketClient {
  private socket: Socket | null = null;
  private lastEventId: string | null = null;
  private pendingMessages: Array<{ event: string; data: any }> = [];
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 10;
  private isIntentionalClose = false;

  constructor(
    private readonly url: string,
    private readonly namespace: string,
    private readonly getToken: () => Promise<string>,
  ) {}

  async connect(): Promise<void> {
    const token = await this.getToken();

    this.socket = io(`${this.url}${this.namespace}`, {
      auth: {
        token,
        lastEventId: this.lastEventId,
      },
      transports: ['websocket', 'polling'], // WebSocket first, polling fallback
      reconnection: false, // We handle reconnection ourselves
      timeout: 10_000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      console.log('Connected');
      this.reconnectAttempt = 0;
      this.flushPendingMessages();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${reason}`);

      if (!this.isIntentionalClose) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.scheduleReconnect();
    });

    // Handle missed messages from server-side buffer
    this.socket.on('sync:missed', (data: { messages: any[] }) => {
      for (const msg of data.messages) {
        this.handleIncomingMessage(msg);
      }
    });

    // Track last event ID from every incoming message
    this.socket.onAny((event, data) => {
      if (data?.eventId) {
        this.lastEventId = data.eventId;
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.fallbackToPolling();
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30_000);
    const jitter = Math.random() * baseDelay * 0.3; // 0-30% jitter
    const delay = baseDelay + jitter;

    console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt + 1})`);

    setTimeout(() => {
      this.reconnectAttempt++;
      this.connect();
    }, delay);
  }

  // Buffer messages while disconnected
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue for delivery after reconnection
      this.pendingMessages.push({ event, data });
    }
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      this.socket.emit(msg.event, msg.data);
    }
  }

  // Graceful degradation fallback
  private fallbackToPolling(): void {
    console.log('Falling back to HTTP polling');
    // Switch to periodic HTTP GET requests for updates
    // This ensures the user still gets data even if WebSocket is unavailable
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.socket?.disconnect();
  }

  private handleIncomingMessage(msg: any): void {
    // Application-specific message handling
    console.log('Received:', msg);
  }
}

// Usage:
const client = new ResilientSocketClient(
  'https://api.example.com',
  '/chat',
  async () => localStorage.getItem('auth_token'),
);
await client.connect();
```

> **Interview Tip:** Explain the "thundering herd" problem when discussing reconnection. If a server restarts and 50,000 clients try to reconnect simultaneously with a fixed 1-second delay, you get a massive spike. Exponential backoff with jitter is the standard solution. Also mention the disconnect grace period — if a user's WiFi drops for 2 seconds, you don't want to broadcast "user went offline" and then immediately "user is back online."

---

## Real-Time Performance Optimization

### Q15: How do you optimize WebSocket performance for high-throughput systems?

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              WebSocket Performance Optimization Layers                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PROTOCOL LEVEL                                                          │
│     - permessage-deflate compression                                        │
│     - Binary frames (MessagePack/Protobuf) instead of JSON                  │
│     - Message batching to reduce frame overhead                             │
│                                                                              │
│  2. CONNECTION LEVEL                                                        │
│     - Heartbeat interval tuning                                             │
│     - Connection pooling (server-to-server)                                 │
│     - Idle connection timeout                                               │
│                                                                              │
│  3. APPLICATION LEVEL                                                       │
│     - Rate limiting per client                                              │
│     - Selective broadcasting (don't send what the client doesn't need)      │
│     - Message deduplication                                                 │
│                                                                              │
│  4. INFRASTRUCTURE LEVEL                                                    │
│     - Node.js cluster mode (1 process per CPU core)                         │
│     - Separate WebSocket servers from API servers                           │
│     - Memory monitoring (each connection ~10-50KB)                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WebSocket Frame Compression (permessage-deflate)**

The `permessage-deflate` extension compresses WebSocket frames using zlib. Highly effective for JSON payloads (50-80% size reduction), but adds CPU overhead. Disable for binary data or when CPU is the bottleneck.

**Message Batching**

Instead of sending 100 individual messages per second, batch them into groups of 10 every 100ms. This dramatically reduces frame overhead and network syscalls.

**Binary Protocols**

JSON is human-readable but verbose. For high-throughput scenarios (gaming, financial data), use binary serialization:
- **MessagePack**: JSON-compatible but ~30-50% smaller, faster to parse
- **Protobuf**: Schema-defined, smallest size, fastest parsing, but requires code generation

**Heartbeat Tuning**

| Scenario | pingInterval | pingTimeout | Rationale |
|----------|-------------|-------------|-----------|
| Mobile app | 25s | 20s | Balance battery life and detection speed |
| Desktop app | 25s | 10s | Faster detection, stable connection |
| Gaming | 5s | 5s | Immediate disconnect detection needed |
| Dashboard | 30s | 30s | Less critical, save bandwidth |

```typescript
// ========== Optimized WebSocket Server with Compression and Batching ==========

import { Server, Socket } from 'socket.io';
import * as msgpack from 'msgpack-lite';

// --- Server Configuration with Compression ---
const io = new Server(httpServer, {
  // Enable permessage-deflate compression
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
    zlibDeflateOptions: {
      chunkSize: 16 * 1024, // 16KB chunks
      level: 6, // Compression level (1=fast, 9=best, 6=balanced)
    },
    zlibInflateOptions: {
      chunkSize: 16 * 1024,
    },
    clientNoContextTakeover: true, // Reduce server memory per connection
    serverNoContextTakeover: true,
  },

  // Transport settings
  transports: ['websocket'], // Skip polling for performance
  httpCompression: true,

  // Heartbeat tuning
  pingInterval: 25000,  // Send ping every 25s
  pingTimeout: 10000,   // Wait 10s for pong before disconnecting

  // Max payload size
  maxHttpBufferSize: 1e6, // 1MB max message size

  // Connection limits
  connectTimeout: 10000, // 10s to complete handshake
});

// --- Message Batcher ---
@Injectable()
export class MessageBatcher {
  private batches: Map<string, Array<{ event: string; data: any }>> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly BATCH_INTERVAL_MS = 100; // Flush every 100ms
  private readonly MAX_BATCH_SIZE = 50;

  constructor(private readonly server: Server) {}

  // Instead of emitting immediately, add to batch
  addToBatch(room: string, event: string, data: any): void {
    if (!this.batches.has(room)) {
      this.batches.set(room, []);
    }

    const batch = this.batches.get(room);
    batch.push({ event, data });

    // Flush if batch is full
    if (batch.length >= this.MAX_BATCH_SIZE) {
      this.flushBatch(room);
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.timers.has(room)) {
      const timer = setTimeout(() => {
        this.flushBatch(room);
      }, this.BATCH_INTERVAL_MS);
      this.timers.set(room, timer);
    }
  }

  private flushBatch(room: string): void {
    const batch = this.batches.get(room);
    if (!batch || batch.length === 0) return;

    // Send as a single batched message
    this.server.to(room).emit('batch', {
      messages: batch,
      count: batch.length,
      timestamp: Date.now(),
    });

    // Clear
    this.batches.set(room, []);
    const timer = this.timers.get(room);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(room);
    }
  }

  // Flush all batches (e.g., on shutdown)
  flushAll(): void {
    for (const room of this.batches.keys()) {
      this.flushBatch(room);
    }
  }
}

// --- Binary Protocol with MessagePack ---
@Injectable()
export class BinaryProtocolService {
  // Encode message to binary (MessagePack)
  encode(data: any): Buffer {
    return msgpack.encode(data);
  }

  // Decode binary message
  decode(buffer: Buffer): any {
    return msgpack.decode(buffer);
  }

  // Send binary message to room
  sendBinary(server: Server, room: string, event: string, data: any): void {
    const payload = this.encode({ event, data, ts: Date.now() });
    server.to(room).emit('binary', payload);
  }
}

// --- Client-Side Binary Handling ---
// socket.on('binary', (buffer) => {
//   const decoded = msgpack.decode(new Uint8Array(buffer));
//   handleMessage(decoded.event, decoded.data);
// });

// --- Rate Limiter for WebSocket Events ---
@Injectable()
export class WsRateLimiter {
  private limits: Map<string, { count: number; resetAt: number }> = new Map();

  // Returns true if allowed, false if rate limited
  checkLimit(clientId: string, event: string, maxPerSecond: number): boolean {
    const key = `${clientId}:${event}`;
    const now = Date.now();

    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + 1000 });
      return true;
    }

    if (entry.count >= maxPerSecond) {
      return false;
    }

    entry.count++;
    return true;
  }
}

// --- Memory-Aware Connection Manager ---
@Injectable()
export class ConnectionManager {
  private readonly logger = new Logger(ConnectionManager.name);
  private readonly MAX_CONNECTIONS_PER_INSTANCE = 50_000;

  constructor(private readonly server: Server) {}

  getConnectionCount(): number {
    return this.server.engine.clientsCount;
  }

  getMemoryUsage(): { heapUsed: number; heapTotal: number; rss: number } {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    };
  }

  isAcceptingConnections(): boolean {
    const count = this.getConnectionCount();
    const mem = this.getMemoryUsage();

    if (count >= this.MAX_CONNECTIONS_PER_INSTANCE) {
      this.logger.warn(`Connection limit reached: ${count}`);
      return false;
    }

    // Reject if memory usage is too high (> 80% of heap)
    if (mem.heapUsed / mem.heapTotal > 0.8) {
      this.logger.warn(`Memory pressure: ${mem.heapUsed}/${mem.heapTotal} MB`);
      return false;
    }

    return true;
  }

  // Monitoring endpoint for metrics collection
  getMetrics(): object {
    return {
      connections: this.getConnectionCount(),
      memory: this.getMemoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
    };
  }
}

// --- Monitoring: Connection and Message Metrics ---
@Injectable()
export class WsMetricsService {
  private messageCount = 0;
  private readonly latencies: number[] = [];

  recordMessage(): void {
    this.messageCount++;
  }

  recordLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    this.latencies.push(latency);

    // Keep only last 1000 samples
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }
  }

  getStats(): {
    totalMessages: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  } {
    const sorted = [...this.latencies].sort((a, b) => a - b);

    return {
      totalMessages: this.messageCount,
      p50Latency: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95Latency: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99Latency: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }
}
```

> **Interview Tip:** Quantify things. "Each WebSocket connection uses roughly 10-50KB of memory on the server side, so a single Node.js process with 1GB of RAM can handle approximately 20,000-100,000 connections depending on message frequency. For higher scale, you need horizontal scaling with the Redis adapter." Interviewers love specific numbers and awareness of real constraints.

---

## Real-Time Patterns for Common Use Cases

### Q16: What are common real-time patterns and how do you implement them?

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              Common Real-Time Patterns                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Presence System          - Who is online/offline/away                   │
│  2. Live Cursors             - Collaborative editing, Figma-style          │
│  3. Notifications            - Priority-based, batched delivery            │
│  4. Live Dashboards          - Stock prices, analytics, metrics            │
│  5. Typing Indicators        - Chat "user is typing..."                    │
│  6. Read Receipts            - Message seen/delivered status               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**1. Presence System (Online/Offline/Away)**

A presence system tracks whether users are currently connected. Challenges include:
- Users on multiple devices (2 tabs, phone + laptop)
- Graceful "away" detection (connected but idle)
- Efficient broadcasting (don't send presence updates for every connection event)

**2. Live Cursors / Collaborative Editing**

For multi-user editing (like Google Docs or Figma), you need:
- High-frequency position updates (throttled to ~20-30fps)
- Conflict resolution when users edit the same content
- **CRDTs (Conflict-free Replicated Data Types)**: Data structures that can be merged without conflicts. Libraries like Yjs or Automerge handle this.

**3. Typing Indicators and Read Receipts**

- **Typing indicators** should be throttled (emit "typing" at most once per 2-3 seconds) and auto-expire (stop showing "typing" after 5 seconds of silence).
- **Read receipts** require tracking the last message a user has seen in each conversation.

```typescript
// ========== Presence System with Redis and Socket.io ==========

// --- Presence Service ---
@Injectable()
export class PresenceService {
  private readonly PRESENCE_TTL = 60; // seconds
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly redis: Redis,
    private readonly server: Server,
  ) {}

  // User connected on a device
  async setOnline(userId: string, deviceId: string): Promise<void> {
    const key = `presence:${userId}`;

    // Track each device separately
    await this.redis.hset(key, deviceId, JSON.stringify({
      status: 'online',
      lastSeen: Date.now(),
      device: deviceId,
    }));
    await this.redis.expire(key, this.PRESENCE_TTL);

    // Broadcast presence change to interested parties
    await this.broadcastPresence(userId, 'online');
  }

  // User disconnected from a device
  async setOffline(userId: string, deviceId: string): Promise<void> {
    const key = `presence:${userId}`;

    await this.redis.hdel(key, deviceId);

    // Check if user has any remaining devices
    const devices = await this.redis.hgetall(key);
    const hasActiveDevice = Object.keys(devices).length > 0;

    if (!hasActiveDevice) {
      // Update last seen timestamp
      await this.redis.set(
        `presence:lastseen:${userId}`,
        Date.now().toString(),
      );
      await this.broadcastPresence(userId, 'offline');
    }
  }

  // User is idle (no mouse/keyboard activity)
  async setAway(userId: string, deviceId: string): Promise<void> {
    const key = `presence:${userId}`;

    await this.redis.hset(key, deviceId, JSON.stringify({
      status: 'away',
      lastSeen: Date.now(),
      device: deviceId,
    }));

    // Only broadcast "away" if ALL devices are away
    const devices = await this.redis.hgetall(key);
    const allAway = Object.values(devices).every(
      (d) => JSON.parse(d).status === 'away',
    );

    if (allAway) {
      await this.broadcastPresence(userId, 'away');
    }
  }

  // Get presence for a list of users (e.g., friends list, team members)
  async getPresenceBulk(
    userIds: string[],
  ): Promise<Map<string, { status: string; lastSeen?: number }>> {
    const pipeline = this.redis.pipeline();

    for (const userId of userIds) {
      pipeline.hgetall(`presence:${userId}`);
      pipeline.get(`presence:lastseen:${userId}`);
    }

    const results = await pipeline.exec();
    const presenceMap = new Map();

    for (let i = 0; i < userIds.length; i++) {
      const devices = results[i * 2][1] as Record<string, string>;
      const lastSeen = results[i * 2 + 1][1] as string;

      if (Object.keys(devices).length === 0) {
        presenceMap.set(userIds[i], {
          status: 'offline',
          lastSeen: lastSeen ? parseInt(lastSeen) : undefined,
        });
      } else {
        // If any device is "online", user is online
        const statuses = Object.values(devices).map((d) => JSON.parse(d).status);
        const status = statuses.includes('online') ? 'online' : 'away';
        presenceMap.set(userIds[i], { status, lastSeen: Date.now() });
      }
    }

    return presenceMap;
  }

  // Heartbeat to keep presence alive (called by client every 30s)
  async heartbeat(userId: string, deviceId: string): Promise<void> {
    const key = `presence:${userId}`;
    await this.redis.expire(key, this.PRESENCE_TTL);
    // If the TTL expires without a heartbeat, the device is considered gone
  }

  private async broadcastPresence(userId: string, status: string): Promise<void> {
    // Only broadcast to users who care (e.g., friends, team members)
    // Using a "subscribers" set to avoid broadcasting to everyone
    const subscribers = await this.redis.smembers(`presence:subscribers:${userId}`);

    for (const subscriberId of subscribers) {
      this.server.to(`user:${subscriberId}`).emit('presence:update', {
        userId,
        status,
        timestamp: Date.now(),
      });
    }
  }
}

// --- Presence Gateway ---
@WebSocketGateway({ namespace: '/presence' })
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly presenceService: PresenceService) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = client.data.user.id;
    const deviceId = client.id;

    await this.presenceService.setOnline(userId, deviceId);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.user.id;
    await this.presenceService.setOffline(userId, client.id);
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket): Promise<void> {
    await this.presenceService.heartbeat(client.data.user.id, client.id);
  }

  @SubscribeMessage('presence:away')
  async handleAway(@ConnectedSocket() client: Socket): Promise<void> {
    await this.presenceService.setAway(client.data.user.id, client.id);
  }

  @SubscribeMessage('presence:active')
  async handleActive(@ConnectedSocket() client: Socket): Promise<void> {
    await this.presenceService.setOnline(client.data.user.id, client.id);
  }

  // Subscribe to presence updates for a list of users
  @SubscribeMessage('presence:subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userIds: string[] },
  ): Promise<WsResponse<any>> {
    const subscriberId = client.data.user.id;

    // Register as a subscriber for each user
    for (const userId of payload.userIds) {
      await this.presenceService['redis'].sadd(
        `presence:subscribers:${userId}`,
        subscriberId,
      );
    }

    // Return current presence for all requested users
    const presenceMap = await this.presenceService.getPresenceBulk(payload.userIds);
    const presenceArray = Array.from(presenceMap.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    }));

    return { event: 'presence:bulk', data: presenceArray };
  }
}

// --- Typing Indicator Service ---
@Injectable()
export class TypingIndicatorService {
  private readonly TYPING_TIMEOUT = 5000; // 5 seconds
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly server: Server) {}

  startTyping(userId: string, roomId: string, userName: string): void {
    const key = `${userId}:${roomId}`;

    // Clear existing timer
    const existing = this.typingTimers.get(key);
    if (existing) clearTimeout(existing);

    // Broadcast typing start
    this.server.to(roomId).emit('typing:start', {
      userId,
      userName,
      roomId,
    });

    // Auto-stop after timeout
    const timer = setTimeout(() => {
      this.stopTyping(userId, roomId);
    }, this.TYPING_TIMEOUT);

    this.typingTimers.set(key, timer);
  }

  stopTyping(userId: string, roomId: string): void {
    const key = `${userId}:${roomId}`;

    const timer = this.typingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(key);
    }

    this.server.to(roomId).emit('typing:stop', { userId, roomId });
  }
}

// --- Read Receipts Service ---
@Injectable()
export class ReadReceiptService {
  constructor(
    private readonly redis: Redis,
    private readonly server: Server,
  ) {}

  // Mark a message as read
  async markAsRead(userId: string, roomId: string, messageId: string): Promise<void> {
    const key = `readreceipt:${roomId}:${userId}`;

    // Store last read message ID
    await this.redis.set(key, messageId);

    // Notify others in the room
    this.server.to(roomId).emit('message:read', {
      userId,
      roomId,
      lastReadMessageId: messageId,
      timestamp: Date.now(),
    });
  }

  // Get read receipts for a room (who has read up to which message)
  async getReadReceipts(roomId: string, userIds: string[]): Promise<Record<string, string>> {
    const pipeline = this.redis.pipeline();
    for (const userId of userIds) {
      pipeline.get(`readreceipt:${roomId}:${userId}`);
    }

    const results = await pipeline.exec();
    const receipts: Record<string, string> = {};

    for (let i = 0; i < userIds.length; i++) {
      const lastRead = results[i][1] as string;
      if (lastRead) {
        receipts[userIds[i]] = lastRead;
      }
    }

    return receipts;
  }
}

// --- Live Dashboard Updates (e.g., stock prices, analytics) ---
@Injectable()
export class LiveDashboardService {
  constructor(
    private readonly server: Server,
    private readonly batcher: MessageBatcher,
  ) {}

  // Push metric updates — use batching to avoid flooding
  pushMetricUpdate(metric: string, value: number): void {
    this.batcher.addToBatch(`dashboard:${metric}`, 'metric:update', {
      metric,
      value,
      timestamp: Date.now(),
    });
  }

  // For high-frequency data (stock prices), throttle to max N updates/sec
  private throttledEmitters: Map<string, NodeJS.Timeout> = new Map();
  private latestValues: Map<string, any> = new Map();

  pushThrottled(channel: string, data: any, intervalMs = 200): void {
    this.latestValues.set(channel, data);

    if (!this.throttledEmitters.has(channel)) {
      const timer = setInterval(() => {
        const latest = this.latestValues.get(channel);
        if (latest) {
          this.server.to(`dashboard:${channel}`).emit('update', latest);
          this.latestValues.delete(channel);
        }
      }, intervalMs);

      this.throttledEmitters.set(channel, timer);
    }
  }
}
```

> **Interview Tip:** When discussing presence systems, always mention the multi-device problem. "A user is online if ANY of their devices is connected, but only offline when ALL devices disconnect." Also note that presence broadcasting can be expensive — if you have 10,000 users each watching 100 friends, a single presence change triggers 10,000 potential notifications. Use subscriber lists and batching to manage the fan-out cost.

---

## Q12: Scaling WebSocket Servers Horizontally

**Q: How do you scale WebSocket servers across multiple instances?**

**A:**

The fundamental problem: WebSocket connections are stateful. User A connected to Server 1 can't receive messages from User B connected to Server 2 without coordination.

### The Problem
```
Server 1: [UserA, UserC, UserE]  ← UserA sends message to UserB
Server 2: [UserB, UserD, UserF]  ← UserB never receives it!
```

### Solution 1: Redis Adapter (Most Common)
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://redis:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

const io = new Server(httpServer, {
  adapter: createAdapter(pubClient, subClient),
});

// Now messages are broadcast across all servers via Redis Pub/Sub
// Server 1 publishes to Redis → Redis fans out to Server 2, 3, etc.
```

### How Redis Adapter Works
```
UserA (Server 1) sends "hello" to Room "chat-123"
  ↓
Server 1 publishes to Redis channel "socket.io#/chat-123"
  ↓
Redis fans out to ALL subscribed servers
  ↓
Server 2 receives → delivers to UserB (in room "chat-123")
Server 3 receives → delivers to UserD (in room "chat-123")
```

### Solution 2: Sticky Sessions (Simpler but Limited)
```nginx
# NGINX configuration for sticky sessions
upstream websocket_servers {
    ip_hash;  # Same client IP always goes to same server
    server ws1:3000;
    server ws2:3000;
    server ws3:3000;
}

server {
    location /socket.io/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
- Problem: Uneven distribution, one server can get overloaded
- Works for Socket.io's HTTP long-polling handshake but not ideal for scaling

### Solution 3: Dedicated Message Broker
```typescript
// For very high scale: use Kafka/NATS for inter-server communication
// Each server subscribes to relevant topics

import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'nats://nats:4222' });
const sc = StringCodec();

// Each server subscribes to room events
nc.subscribe('room.chat-123', {
  callback: (err, msg) => {
    const data = JSON.parse(sc.decode(msg.data));
    // Deliver to local connected users in this room
    io.to('chat-123').emit('message', data);
  },
});

// When a user sends a message, publish to NATS
socket.on('message', (data) => {
  nc.publish(`room.${data.room}`, sc.encode(JSON.stringify(data)));
});
```

### Scaling Architecture
```
                    ┌─────────────────┐
                    │   Load Balancer  │
                    │  (NGINX / ALB)   │
                    └────────┬────────┘
                ┌────────────┼────────────┐
                ▼            ▼            ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ WS Server│ │ WS Server│ │ WS Server│
         │    #1    │ │    #2    │ │    #3    │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              └────────────┼────────────┘
                    ┌──────┴──────┐
                    │    Redis    │
                    │  Pub/Sub    │
                    └─────────────┘
```

### Connection Count Planning
- Each WebSocket connection uses ~2-10KB memory
- A single Node.js server can handle ~10K-50K concurrent connections
- For 100K concurrent users: 3-10 servers with Redis adapter
- For 1M+ concurrent users: NATS/Kafka + Redis cluster + multiple server pools

**Interview Tip:** "In our live streaming system at Right Tracks, we used Redis adapter for Socket.io scaling across multiple instances behind an ALB. For the Banglalink notification system with 41M users, we used Kafka for the message bus since the scale exceeded Redis Pub/Sub's capabilities."

---

## Q13: Socket.io Rooms & Namespaces

**Q: How do Rooms and Namespaces work in Socket.io?**

**A:**

### Namespaces — Virtual Separation
```typescript
// Namespaces separate concerns (like different apps on same server)
const chatNamespace = io.of('/chat');
const notificationNamespace = io.of('/notifications');
const adminNamespace = io.of('/admin');

// Each namespace has its own connection event
chatNamespace.on('connection', (socket) => {
  console.log('User connected to chat');
  // Chat-specific logic
});

notificationNamespace.on('connection', (socket) => {
  console.log('User connected to notifications');
  // Notification-specific logic
});

// Namespace-level middleware (auth per namespace)
adminNamespace.use((socket, next) => {
  if (socket.handshake.auth.role !== 'admin') {
    return next(new Error('Admin access required'));
  }
  next();
});
```

### Rooms — Dynamic Grouping within Namespace
```typescript
io.on('connection', (socket) => {
  // Join a room
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    socket.to(roomId).emit('userJoined', { userId: socket.data.userId });
  });

  // Leave a room
  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
    socket.to(roomId).emit('userLeft', { userId: socket.data.userId });
  });

  // Send message to specific room
  socket.on('roomMessage', ({ roomId, message }) => {
    io.to(roomId).emit('message', {
      from: socket.data.userId,
      message,
      timestamp: new Date(),
    });
  });

  // Send to multiple rooms
  socket.on('broadcast', ({ roomIds, message }) => {
    roomIds.forEach(id => io.to(id).emit('announcement', message));
  });
});
```

### Namespace vs Room Comparison
| Feature | Namespace | Room |
|---------|-----------|------|
| Created | At server startup (static) | Dynamically at runtime |
| Client connects to | Explicitly (io('/chat')) | Server-side only (socket.join) |
| Middleware | Yes (namespace-level) | No (use room join logic) |
| Use case | Feature separation | Group messaging, channels |
| Example | /chat, /notifications, /admin | room-123, user-abc-notifications |

### Practical Pattern: User Notification Rooms
```typescript
io.on('connection', async (socket) => {
  const userId = socket.data.userId;

  // Auto-join user's personal notification room
  socket.join(`user:${userId}`);

  // Auto-join rooms for user's groups/teams
  const teams = await teamService.getUserTeams(userId);
  teams.forEach(team => socket.join(`team:${team.id}`));

  // Now you can send targeted notifications
  // To one user:
  io.to(`user:${targetUserId}`).emit('notification', payload);
  // To a team:
  io.to(`team:${teamId}`).emit('teamUpdate', payload);
});
```

**Interview Tip:** "Rooms are server-side groupings — the client never 'connects' to a room, the server adds them. This is important for security — the server controls who's in which room."

---

## Q14: Connection State Recovery & Resilience

**Q: How do you handle disconnections and ensure no messages are lost?**

**A:**

### The Problem
When a client disconnects (network flap, phone sleep, BD power outage), messages sent during the disconnect are lost.

### Socket.io Connection State Recovery (v4.6+)
```typescript
const io = new Server(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true, // Skip auth on recovery (already authenticated)
  },
});

io.on('connection', (socket) => {
  if (socket.recovered) {
    // Client reconnected — missed messages are automatically replayed
    console.log(`User ${socket.id} recovered, rooms restored`);
  } else {
    // Fresh connection — fetch missed messages from database
    console.log(`User ${socket.id} fresh connection`);
  }
});
```

### Custom Message Queue for Longer Disconnections
```typescript
@Injectable()
export class MessageBufferService {
  constructor(private readonly redis: RedisService) {}

  // Store messages for offline users
  async bufferMessage(userId: string, message: any) {
    const key = `offline:${userId}`;
    await this.redis.rpush(key, JSON.stringify({
      ...message,
      bufferedAt: Date.now(),
    }));
    // Auto-expire after 24 hours
    await this.redis.expire(key, 86400);
  }

  // Flush buffered messages on reconnection
  async flushBuffer(userId: string): Promise<any[]> {
    const key = `offline:${userId}`;
    const messages = await this.redis.lrange(key, 0, -1);
    await this.redis.del(key);
    return messages.map(m => JSON.parse(m));
  }
}

// Usage in Socket.io
io.on('connection', async (socket) => {
  const userId = socket.data.userId;

  // Deliver buffered messages
  const missed = await messageBuffer.flushBuffer(userId);
  if (missed.length > 0) {
    socket.emit('missedMessages', missed);
  }

  // Track user online status
  await redis.set(`online:${userId}`, socket.id);

  socket.on('disconnect', async () => {
    await redis.del(`online:${userId}`);
  });
});

// When sending a message, check if user is online
async function sendToUser(userId: string, event: string, data: any) {
  const socketId = await redis.get(`online:${userId}`);
  if (socketId) {
    io.to(socketId).emit(event, data);
  } else {
    // User offline — buffer for later
    await messageBuffer.bufferMessage(userId, { event, data });
  }
}
```

### Heartbeat & Stale Connection Detection
```typescript
const io = new Server(httpServer, {
  pingInterval: 25000,  // Send ping every 25s
  pingTimeout: 20000,   // Wait 20s for pong before disconnecting
});

// Client-side reconnection with exponential backoff
const socket = io('wss://api.example.com', {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,    // Start at 1s
  reconnectionDelayMax: 30000, // Max 30s between attempts
  randomizationFactor: 0.5,   // Add randomness to prevent thundering herd
});

socket.on('reconnect_attempt', (attempt) => {
  console.log(`Reconnection attempt ${attempt}`);
});

socket.on('reconnect', () => {
  console.log('Reconnected! Requesting missed messages...');
  socket.emit('syncState', { lastMessageId: getLastMessageId() });
});
```

### Graceful Degradation
```typescript
// When WebSocket fails, fall back to polling
const socket = io('wss://api.example.com', {
  transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
  upgrade: true, // Upgrade polling to WebSocket when available
});

// For BD networks: start with polling, upgrade to WebSocket
const bdSocket = io('wss://api.example.com', {
  transports: ['polling', 'websocket'], // Start with more reliable polling
  upgrade: true,
});
```

**Interview Tip:** "For Bangladesh users where network reliability is lower, I implement three layers: 1) Socket.io's built-in recovery for short disconnections, 2) Redis-based message buffering for offline users, 3) Polling fallback for severely degraded connections."

---

## Q15: WebSocket Memory Management & Performance

**Q: How do you prevent memory leaks and optimize performance in WebSocket servers?**

**A:**

### Common Memory Leak Sources
```typescript
// BAD: Event listener leak
io.on('connection', (socket) => {
  // This adds a new listener on EVERY connection and never removes it!
  eventBus.on('globalUpdate', (data) => {
    socket.emit('update', data);
  });
});

// GOOD: Clean up listeners on disconnect
io.on('connection', (socket) => {
  const handler = (data) => socket.emit('update', data);
  eventBus.on('globalUpdate', handler);

  socket.on('disconnect', () => {
    eventBus.off('globalUpdate', handler);
  });
});
```

### Connection Tracking & Limits
```typescript
const connectionsByUser = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 5;

io.use((socket, next) => {
  const userId = socket.data.userId;
  const userConnections = connectionsByUser.get(userId) || new Set();

  if (userConnections.size >= MAX_CONNECTIONS_PER_USER) {
    return next(new Error('Too many connections'));
  }
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  if (!connectionsByUser.has(userId)) {
    connectionsByUser.set(userId, new Set());
  }
  connectionsByUser.get(userId).add(socket.id);

  socket.on('disconnect', () => {
    connectionsByUser.get(userId)?.delete(socket.id);
    if (connectionsByUser.get(userId)?.size === 0) {
      connectionsByUser.delete(userId);
    }
  });
});
```

### Message Batching for Performance
```typescript
// Instead of emitting every event individually, batch them
class MessageBatcher {
  private buffer: Map<string, any[]> = new Map();
  private flushInterval: NodeJS.Timeout;

  constructor(private io: Server, private intervalMs = 100) {
    this.flushInterval = setInterval(() => this.flush(), intervalMs);
  }

  add(room: string, event: string, data: any) {
    const key = `${room}:${event}`;
    if (!this.buffer.has(key)) this.buffer.set(key, []);
    this.buffer.get(key).push(data);
  }

  private flush() {
    for (const [key, messages] of this.buffer) {
      const [room, event] = key.split(':');
      this.io.to(room).emit(event, messages); // Send batch
    }
    this.buffer.clear();
  }

  destroy() {
    clearInterval(this.flushInterval);
  }
}
```

### Monitoring WebSocket Health
```typescript
// Track connection metrics
setInterval(() => {
  const metrics = {
    totalConnections: io.sockets.sockets.size,
    roomCount: io.sockets.adapter.rooms.size,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  };
  logger.info('WebSocket metrics', metrics);
  // Push to Prometheus/CloudWatch
}, 30000);
```

**Interview Tip:** "Memory management is the #1 operational concern with WebSocket servers. I always implement connection limits per user, clean up listeners on disconnect, and monitor memory usage. At Banglalink scale, even small leaks compound to server crashes."

---

## Q12: Scaling WebSocket Servers Horizontally

**Q: How do you scale WebSocket connections across multiple server instances?**

**A:**

A single Node.js process can handle ~10K-50K concurrent WebSocket connections. Beyond that, you need horizontal scaling — and that introduces the problem of cross-instance messaging.

### The Problem
```
User A connects to Server 1
User B connects to Server 2

User A sends message to User B:
  Server 1 receives it... but User B is on Server 2!
  Server 1 doesn't know about User B's connection.
```

### Solution: Redis Adapter (Pub/Sub Backbone)
```
Server 1 ──┐                   ┌── Server 1 broadcasts to its clients
            ├── Redis Pub/Sub ──┤
Server 2 ──┘                   └── Server 2 broadcasts to its clients

When Server 1 emits, Redis forwards to ALL servers.
Each server delivers to its own connected clients.
```

### Socket.io with Redis Adapter
```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(3000);
}
```

### Sticky Sessions vs Redis Adapter
| Approach | How It Works | Pros | Cons |
|----------|-------------|------|------|
| Sticky sessions (IP hash) | Load balancer routes same client to same server | Simple setup | Uneven distribution, failover issues |
| Redis adapter | All servers share state via Redis pub/sub | Even distribution, fault tolerant | Redis is a dependency, slight latency |
| Redis adapter + sticky sessions | Combine both for optimal performance | Best of both worlds | More infrastructure |

### Load Balancer Configuration for WebSockets
```nginx
# NGINX config for WebSocket support
upstream websocket_servers {
    # ip_hash;  # Enable for sticky sessions
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    listen 80;

    location /socket.io/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;  # 24 hours — keep connections alive
    }
}
```

### AWS ALB for WebSockets
```
- AWS ALB natively supports WebSocket connections
- Enable stickiness on target group if needed
- Idle timeout: increase to 3600s (default 60s kills WS connections)
- Health checks: use HTTP health endpoint, not WebSocket
```

### Connection Count Monitoring
```typescript
@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private connectionCount = 0;

  handleConnection(client: Socket) {
    this.connectionCount++;
    // Report to metrics
    metrics.gauge('websocket.connections', this.connectionCount);
    logger.info(`Client connected. Total: ${this.connectionCount}`);
  }

  handleDisconnect(client: Socket) {
    this.connectionCount--;
    metrics.gauge('websocket.connections', this.connectionCount);
  }
}
```

**Interview Tip:** "For horizontal scaling of WebSockets, I use the Socket.io Redis adapter. Each server publishes events to Redis, and Redis fans out to all servers. Combined with AWS ALB (which natively supports WebSocket upgrade), this handles 100K+ concurrent connections across a fleet of servers."

---

## Q13: Socket.io Rooms & Namespaces

**Q: How do you organize real-time connections in Socket.io?**

**A:**

### Namespaces — Separate Concerns
```typescript
// Namespaces are like separate Socket.io servers on the same connection
// Each namespace has its own event handlers, rooms, and middleware

// Chat namespace
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway {
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: { room: string; text: string }) {
    this.server.to(payload.room).emit('message', {
      sender: client.id,
      text: payload.text,
      timestamp: new Date(),
    });
  }
}

// Notifications namespace (separate from chat)
@WebSocketGateway({ namespace: 'notifications' })
export class NotificationGateway {
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { userId: string }) {
    client.join(`user:${payload.userId}`);
  }

  async sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}

// Client connects to specific namespace
// const chatSocket = io('/chat');
// const notifSocket = io('/notifications');
```

### Rooms — Group Connections Within a Namespace
```typescript
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway {
  // Join a room
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(roomId);
    client.to(roomId).emit('userJoined', { userId: client.data.userId });
    return { event: 'joinedRoom', data: roomId };
  }

  // Leave a room
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, roomId: string) {
    client.leave(roomId);
    client.to(roomId).emit('userLeft', { userId: client.data.userId });
  }

  // Send to specific room
  @SubscribeMessage('roomMessage')
  handleRoomMessage(client: Socket, payload: { roomId: string; message: string }) {
    // Send to everyone in room EXCEPT sender
    client.to(payload.roomId).emit('message', {
      sender: client.data.userId,
      message: payload.message,
    });
  }

  // Broadcast to all in room INCLUDING sender
  broadcastToRoom(roomId: string, event: string, data: any) {
    this.server.in(roomId).emit(event, data);
  }

  // Get all users in a room
  async getRoomMembers(roomId: string): Promise<string[]> {
    const sockets = await this.server.in(roomId).fetchSockets();
    return sockets.map(s => s.data.userId);
  }
}
```

### Namespace vs Room
| Feature | Namespace | Room |
|---------|-----------|------|
| Purpose | Separate concerns (chat vs notifications) | Group users within a concern |
| Connection | Client explicitly connects to namespace | Server-side join/leave |
| Middleware | Separate middleware per namespace | Shared within namespace |
| Example | `/chat`, `/notifications`, `/admin` | `room:123`, `user:456` |

### Authentication Per Namespace
```typescript
@WebSocketGateway({ namespace: 'admin' })
export class AdminGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);

      if (user.role !== 'admin') {
        client.emit('error', { message: 'Admin access required' });
        client.disconnect();
        return;
      }

      client.data.user = user;
      client.join(`admin:${user.department}`);
    } catch (error) {
      client.disconnect();
    }
  }
}
```

### Room-Based Patterns for Common Use Cases
```typescript
// 1. Private messaging (room per conversation)
client.join(`dm:${sortedUserIds.join('-')}`);

// 2. Live streaming (room per stream)
client.join(`stream:${streamId}`);

// 3. Collaborative editing (room per document)
client.join(`doc:${documentId}`);

// 4. User-specific notifications (room per user)
client.join(`user:${userId}`);

// 5. Presence tracking (room per feature/page)
client.join(`presence:dashboard`);
```

**Interview Tip:** "I use namespaces to separate unrelated real-time features (chat, notifications, live updates) and rooms within each namespace to group users. For the Banglalink notification system, each user joined their own room (`user:{userId}`) so we could push targeted notifications without broadcasting to everyone."

---

## Q14: Connection State Recovery & Resilience

**Q: How do you handle disconnections and state recovery in real-time systems?**

**A:**

### The Problem
```
User is in a chat room, typing a message...
  → Internet drops for 30 seconds (common in BD networks)
  → User reconnects

What happened to:
  - Messages sent while disconnected?
  - The user's room memberships?
  - Typing indicators?
  - Unread count?
```

### Socket.io v4 Built-in Recovery
```typescript
// Server-side: enable connection state recovery
@WebSocketGateway({
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true, // Skip auth on reconnect (already validated)
  },
})
export class ChatGateway {
  handleConnection(client: Socket) {
    if (client.recovered) {
      // Client successfully reconnected
      // Rooms are automatically restored
      // Missed events are replayed
      console.log('Client recovered:', client.id);
    } else {
      // Fresh connection — need full state sync
      this.syncFullState(client);
    }
  }
}
```

### Custom Recovery (More Control)
```typescript
@WebSocketGateway()
export class ResilientGateway implements OnGatewayConnection {
  constructor(
    private readonly redis: Redis,
    private readonly messageService: MessageService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.data.userId;
    const lastSeenTimestamp = client.handshake.query.lastSeen as string;

    // 1. Restore room memberships from Redis
    const rooms = await this.redis.smembers(`user:${userId}:rooms`);
    rooms.forEach(room => client.join(room));

    // 2. Send missed messages since last disconnect
    if (lastSeenTimestamp) {
      const missedMessages = await this.messageService.getMessagesSince(
        rooms,
        new Date(parseInt(lastSeenTimestamp)),
      );

      if (missedMessages.length > 0) {
        client.emit('missedMessages', missedMessages);
      }
    }

    // 3. Update online status
    await this.redis.set(`user:${userId}:online`, 'true', 'EX', 300);
    client.to([...rooms]).emit('userOnline', { userId });
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    // Don't immediately mark as offline — they might reconnect
    // Use a grace period
    setTimeout(async () => {
      const stillOnline = await this.redis.get(`user:${userId}:online`);
      if (!stillOnline) {
        const rooms = await this.redis.smembers(`user:${userId}:rooms`);
        this.server.to(rooms).emit('userOffline', { userId });
      }
    }, 30000); // 30 second grace period
  }
}
```

### Client-Side Reconnection Strategy
```typescript
// Client-side (for reference / interview discussion)
const socket = io('https://api.example.com', {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,        // Start with 1s
  reconnectionDelayMax: 30000,    // Cap at 30s
  randomizationFactor: 0.5,      // Add jitter to prevent thundering herd
  timeout: 20000,                  // Connection timeout

  auth: { token: 'jwt...' },
  query: { lastSeen: localStorage.getItem('lastSeen') },
});

socket.on('connect', () => {
  console.log('Connected');
  // Request state sync if needed
});

socket.on('disconnect', (reason) => {
  localStorage.setItem('lastSeen', Date.now().toString());

  if (reason === 'io server disconnect') {
    // Server kicked us — don't auto-reconnect
    socket.connect(); // Manual reconnect
  }
  // Other reasons auto-reconnect via the config above
});

socket.on('missedMessages', (messages) => {
  // Merge missed messages into local state
  messages.forEach(msg => addToChat(msg));
});
```

### Message Queue During Disconnection
```typescript
// Server queues messages for disconnected users
@Injectable()
export class OfflineMessageQueue {
  constructor(private readonly redis: Redis) {}

  async queueMessage(userId: string, message: any) {
    const isOnline = await this.redis.get(`user:${userId}:online`);

    if (!isOnline) {
      // Queue in Redis list with TTL
      await this.redis.lpush(`user:${userId}:offline_queue`, JSON.stringify(message));
      await this.redis.expire(`user:${userId}:offline_queue`, 86400); // 24h TTL
    }
  }

  async drainQueue(userId: string): Promise<any[]> {
    const messages: any[] = [];
    let message: string | null;

    while ((message = await this.redis.rpop(`user:${userId}:offline_queue`)) !== null) {
      messages.push(JSON.parse(message));
    }

    return messages;
  }
}
```

### Heartbeat & Stale Connection Detection
```typescript
// Server-side heartbeat to detect dead connections
@WebSocketGateway({
  pingInterval: 25000,   // Send ping every 25s
  pingTimeout: 20000,    // Wait 20s for pong before disconnecting
})
export class ChatGateway {
  // Socket.io handles ping/pong automatically
  // If pong not received within pingTimeout → disconnect event fires
}

// Custom health check for application-level staleness
@Cron('*/30 * * * * *') // Every 30 seconds
async cleanStaleConnections() {
  const sockets = await this.server.fetchSockets();

  for (const socket of sockets) {
    const lastActivity = socket.data.lastActivity;
    if (lastActivity && Date.now() - lastActivity > 5 * 60 * 1000) {
      socket.emit('inactive', { message: 'You have been idle for 5 minutes' });
      socket.disconnect();
    }
  }
}
```

### Recovery Strategy Decision Tree
```
Client reconnects:
  │
  ├─ Disconnected < 2 min? → Use Socket.io recovery (rooms + missed events auto-restored)
  │
  ├─ Disconnected 2 min - 24h? → Drain offline message queue + restore rooms from Redis
  │
  └─ Disconnected > 24h? → Full state sync from database (treat as fresh connection)
```

**Interview Tip:** "In BD where network drops are frequent, I design for three recovery tiers: Socket.io's built-in recovery for brief drops (<2 min), a Redis-backed offline message queue for longer disconnections, and a full database sync for fresh sessions. The key is making reconnection invisible to the user."

---

## Q15: WebSocket Memory Management & Performance

**Q: How do you prevent memory leaks and optimize performance in WebSocket servers?**

**A:**

### Common Memory Leak Sources
```typescript
// ❌ BAD: Event listener leak
handleConnection(client: Socket) {
  // This listener is NEVER removed when client disconnects
  this.eventEmitter.on('priceUpdate', (data) => {
    client.emit('price', data);
  });
}

// ✅ GOOD: Clean up listeners on disconnect
handleConnection(client: Socket) {
  const listener = (data: any) => client.emit('price', data);
  this.eventEmitter.on('priceUpdate', listener);

  client.on('disconnect', () => {
    this.eventEmitter.removeListener('priceUpdate', listener);
  });
}
```

### Memory-Efficient Patterns
```typescript
// ❌ BAD: Storing full state per connection
const connectionState = new Map<string, {
  user: FullUserObject,     // 10KB per user
  messages: Message[],       // Grows unbounded
  history: any[],            // Never cleaned
}>();

// ✅ GOOD: Store minimal state, fetch on demand
const connectionState = new Map<string, {
  userId: string,            // Just the ID
  rooms: Set<string>,        // Current rooms
  lastActivity: number,      // Timestamp
}>();
```

### Connection Pooling & Limits
```typescript
@WebSocketGateway()
export class GatewayWithLimits {
  private connectionsByUser = new Map<string, Set<string>>();
  private readonly MAX_CONNECTIONS_PER_USER = 5;

  handleConnection(client: Socket) {
    const userId = client.data.userId;

    // Limit connections per user
    if (!this.connectionsByUser.has(userId)) {
      this.connectionsByUser.set(userId, new Set());
    }

    const userConnections = this.connectionsByUser.get(userId);
    if (userConnections.size >= this.MAX_CONNECTIONS_PER_USER) {
      // Disconnect oldest connection
      const oldest = userConnections.values().next().value;
      this.server.sockets.sockets.get(oldest)?.disconnect();
    }

    userConnections.add(client.id);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    this.connectionsByUser.get(userId)?.delete(client.id);
  }
}
```

### Message Batching for Performance
```typescript
// Instead of emitting every update individually...
// ❌ 100 emits per second per client
priceUpdates.forEach(update => {
  client.emit('price', update);
});

// ✅ Batch updates every 100ms — 10 emits per second
private batchBuffer = new Map<string, any[]>();

addToBatch(room: string, data: any) {
  if (!this.batchBuffer.has(room)) {
    this.batchBuffer.set(room, []);
  }
  this.batchBuffer.get(room).push(data);
}

@Cron('*/100 * * * * *') // Every 100ms
flushBatch() {
  for (const [room, messages] of this.batchBuffer) {
    if (messages.length > 0) {
      this.server.to(room).emit('batch', messages);
      this.batchBuffer.set(room, []);
    }
  }
}
```

### Compression
```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';

const io = new Server({
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
    zlibDeflateOptions: { level: 6 }, // Compression level (1-9)
  },
  httpCompression: {
    threshold: 1024,
  },
});
```

### Performance Monitoring
```typescript
// Track key WebSocket metrics
setInterval(() => {
  const sockets = this.server.sockets.sockets.size;
  const rooms = this.server.sockets.adapter.rooms.size;

  metrics.gauge('ws.connections', sockets);
  metrics.gauge('ws.rooms', rooms);
  metrics.gauge('ws.memory_mb', process.memoryUsage().heapUsed / 1024 / 1024);
}, 10000);
```

### Performance Benchmarks (Approximate)
| Metric | Single Node.js Process | With Clustering (4 cores) |
|--------|----------------------|--------------------------|
| Concurrent connections | 10K-50K | 40K-200K |
| Messages/second | 50K-100K | 200K-400K |
| Memory per connection | ~2-10 KB | ~2-10 KB |
| Recommended max per instance | 20K (with headroom) | 80K |

**Interview Tip:** "The biggest WebSocket memory leak I've seen is forgetting to remove event listeners on disconnect. I always pair every `.on()` with a cleanup in the `disconnect` handler. For high-throughput systems like live streaming, message batching (buffer + flush every 100ms) dramatically reduces CPU and network overhead."
