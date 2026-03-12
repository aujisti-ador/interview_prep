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
