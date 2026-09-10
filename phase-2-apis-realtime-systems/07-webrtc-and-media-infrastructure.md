# WebRTC & Real-Time Media Infrastructure

> **This is your differentiator.** Most senior backend candidates can talk about WebSockets.
> Very few can explain why a video call fails behind a corporate firewall, or why a mesh call
> dies at five people. Your Agora and live-streaming work is the one line on your CV that is
> genuinely rare — this guide arms you to defend it.
>
> Written for the **backend** role. You will almost never write the browser code; you will own
> the signalling server, the tokens, the TURN credentials, the recording pipeline, and the
> capacity plan.

## In 60 seconds

1. **WebRTC is not a protocol you call — it is a negotiation between two peers**, and most of
   its complexity exists for one reason: getting two machines behind home routers to talk
   directly.
2. **Signalling is not part of WebRTC.** The spec deliberately leaves it out. You build it,
   usually over a WebSocket — and that is *your* job as the backend engineer.
3. **Roughly 10–20% of connections cannot go direct** and must be relayed through a TURN
   server. TURN costs real bandwidth money, and it is the line item nobody budgets for.
4. **Mesh dies at about 4–5 participants.** Each person uploads a separate stream to every
   other person; residential upload bandwidth runs out fast. This maths is a very common
   interview question.
5. **So real systems use an SFU** — a server that receives one stream per person and forwards
   copies. It does not decode or re-encode, which is why it scales; an MCU does, which is why
   it does not.
6. **You do not build the media server.** You use Agora, LiveKit, mediasoup or Janus. What you
   build is everything around it, and that is what you will be interviewed on.

**The interview trap to expect:** *"your video call works in the office and fails for a user at
home behind corporate VPN — why?"* The answer is NAT/firewall traversal: ICE failed to find a
direct path and either TURN was not configured, or UDP was blocked and you had no TURN-over-TCP
on port 443 fallback.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **WebRTC** | Browser-native real-time audio, video and data between peers |
| **Signalling** | Exchanging connection details before the call. **Not part of WebRTC — you build it** |
| **SDP** | Session Description Protocol — a text blob describing "here is what I can send and receive" |
| **Offer / Answer** | Caller sends an SDP offer, callee replies with an answer. The handshake |
| **ICE** | The process of finding a working network path between two peers |
| **ICE candidate** | One possible route — a local IP, a public IP, or a relay address |
| **STUN** | A tiny server that tells you your own public IP address. Cheap, almost free |
| **TURN** | A relay server that forwards media when a direct path is impossible. **Expensive** |
| **NAT** | Your router sharing one public IP across many devices. The reason all of this exists |
| **DTLS** | The handshake that exchanges encryption keys |
| **SRTP** | The encrypted media stream itself |
| **SCTP / data channel** | Sending arbitrary data peer-to-peer, not just audio and video |
| **Mesh** | Everyone connects directly to everyone. Simple, does not scale |
| **SFU** | Selective Forwarding Unit — receives one stream, forwards copies. **The standard choice** |
| **MCU** | Multipoint Control Unit — mixes streams into one. Cheap for clients, expensive for you |
| **Simulcast** | The sender uploads several quality versions; the SFU picks per receiver |
| **SVC** | One stream containing layers that can be stripped. Newer, more efficient than simulcast |
| **Codec** | How audio/video is compressed — Opus, VP8, VP9, H.264, AV1 |
| **Jitter** | Variation in packet arrival time. Causes stutter |
| **Jitter buffer** | A small delay that smooths out jitter, trading latency for stability |
| **Packet loss** | Packets that never arrive. Above ~3% is visible |
| **Congestion control** | Detecting the network is struggling and lowering bitrate automatically |
| **RTMP** | The old protocol for *pushing* a live stream into a platform. Not WebRTC |
| **HLS / DASH** | Chunked video over HTTP. Scales enormously, adds seconds of latency |
| **Glass-to-glass latency** | Camera capture to the viewer's screen. The number that matters |

---

## Table of Contents

1. [What WebRTC is, and what it is not](#1-what-webrtc-is-and-what-it-is-not)
2. [The connection dance, step by step](#2-the-connection-dance-step-by-step)
3. [NAT traversal — the hard part](#3-nat-traversal--the-hard-part)
4. [Topologies: mesh vs SFU vs MCU](#4-topologies-mesh-vs-sfu-vs-mcu)
5. [Media: codecs, simulcast and adaptation](#5-media-codecs-simulcast-and-adaptation)
6. [Building the signalling server — your actual job](#6-building-the-signalling-server--your-actual-job)
7. [Tokens, auth and TURN credentials](#7-tokens-auth-and-turn-credentials)
8. [Recording and server-side processing](#8-recording-and-server-side-processing)
9. [WebRTC vs HLS — live streaming at scale](#9-webrtc-vs-hls--live-streaming-at-scale)
10. [Capacity planning and cost](#10-capacity-planning-and-cost)
11. [Observability — what to measure](#11-observability--what-to-measure)
12. [Debugging: the failures you will actually see](#12-debugging-the-failures-you-will-actually-see)
13. [Choosing a stack](#13-choosing-a-stack)
14. [System design walkthroughs](#14-system-design-walkthroughs)
15. [Interview questions](#15-interview-questions)

---

## 1. What WebRTC is, and what it is not

### Q1: Explain WebRTC to someone who knows WebSockets.

**Answer:**

WebSockets give you a **reliable, ordered, server-mediated** channel. Every message goes to your
server and back out. That is correct for chat, presence and notifications.

WebRTC gives you a **peer-to-peer, unreliable-by-default, low-latency** channel built for media.
It goes browser-to-browser where possible, and it will happily drop packets rather than wait,
because in a live call a late frame is worthless.

| | WebSocket | WebRTC |
|---|---|---|
| Path | Client → server → client | Client → client (usually) |
| Transport | TCP | UDP (falls back to TCP) |
| Delivery | Reliable, ordered | Unreliable, unordered by default |
| Latency | ~100ms+, retransmits block | ~50–200ms, drops instead of waiting |
| Media | You'd have to build it | Built in: capture, encode, sync, adapt |
| Setup | One HTTP upgrade | A multi-step negotiation |
| Encryption | Optional (`wss://`) | **Mandatory** |

**The key insight to state in an interview:** they are not alternatives — **you use both
together.** WebRTC has no way to find the other peer, so you use a WebSocket to exchange the
connection details. Signalling runs on WebSocket; media runs on WebRTC.

### Q2: What is *not* in the WebRTC spec?

**Answer:**

This surprises people, and knowing it signals real experience:

- **Signalling.** How two peers find each other and exchange SDP is deliberately undefined.
- **Rooms, presence, participant lists.** Not a concept WebRTC has.
- **Authentication and authorisation.**
- **Recording.**
- **Any server component at all**, beyond STUN/TURN.

WebRTC standardises the *media path between two peers that have already agreed to connect*.
Everything that gets them to that point is yours to build. **That is why this is a backend
job at all.**

---

## 2. The connection dance, step by step

### Q3: Walk me through establishing a WebRTC connection.

**Answer:**

Six steps. Say them in this order and you will sound like someone who has debugged this.

```
     Alice                    Your signalling server                    Bob
       │                              │                                  │
  1.   │──── join room ──────────────▶│◀──────── join room ──────────────│
       │                              │                                  │
  2.   │  createOffer()               │                                  │
       │──── SDP offer ──────────────▶│──── SDP offer ──────────────────▶│
       │                              │                                  │
  3.   │◀─── SDP answer ──────────────│◀─── SDP answer ──────────────────│
       │                              │                    createAnswer()│
       │                              │                                  │
  4.   │──── ICE candidates ─────────▶│◀──── ICE candidates ─────────────│
       │◀─── (trickled both ways) ────│─────────────────────────────────▶│
       │                              │                                  │
  5.   │═════ ICE connectivity checks ═══════════════════════════════════│
       │                                                                 │
  6.   │═════ DTLS handshake → SRTP media flows ════════════════════════▶│
       │            (your server is no longer involved)                  │
```

**1. Both peers connect to your signalling server** — usually a WebSocket — and join a room.

**2. The caller creates an SDP offer.** SDP is a plain-text description: which codecs I support,
what media I intend to send, my encryption fingerprint. Your server just relays it.

**3. The callee replies with an SDP answer** narrowing that to what both can do.

**4. Both gather ICE candidates and exchange them** — each candidate is a possible network
address. Modern implementations *trickle* them: send each one as it is discovered rather than
waiting for the full list, which cuts connection time significantly.

**5. ICE connectivity checks.** Both sides try candidate pairs until one works. This is where
connections fail.

**6. DTLS handshake, then encrypted media (SRTP) flows directly.** Your signalling server is now
out of the path entirely — which is a nice property and also why you cannot see what is
happening.

**The one-sentence version for an interview:** *"Signalling exchanges SDP so both sides agree on
media formats, ICE finds a network path, DTLS exchanges keys, and then SRTP flows peer-to-peer
with my server no longer involved."*

---

## 3. NAT traversal — the hard part

### Q4: Why is connecting two browsers hard at all?

**Answer:**

Because neither has a real address.

Your laptop has `192.168.1.5`. So does mine, and so do a hundred million other devices. Those
addresses are meaningless outside your home network. Your router does NAT — Network Address
Translation — sharing one public IP across every device behind it.

```
   Alice's laptop            Alice's router           the internet
   192.168.1.5      ──▶      103.x.x.x:51820    ──▶
   (private, meaningless)    (public, but the port mapping
                             only exists after SHE sends
                             something out)
```

The problem: **Bob cannot initiate a connection to Alice**, because the mapping in her router
does not exist until she sends something outward first. And she has the same problem in reverse.

### Q5: How do STUN and TURN solve it?

**Answer:**

**STUN answers one question: "what is my public address?"**

You send a packet to a STUN server; it replies "I saw you at `103.x.x.x:51820`". You now know
your outward-facing address and can share it via signalling. Crucially, sending that packet
*creates the mapping in your router*, so return traffic can flow.

This works for most home networks. **STUN is nearly free** — one tiny request, no media passes
through it. Google runs public ones.

**TURN is the fallback when direct fails.**

Some networks refuse to cooperate: symmetric NAT (which allocates a different port per
destination, so the address you learned is useless), corporate firewalls blocking UDP, or
carrier-grade NAT on mobile.

A TURN server sits in the middle and relays media. Both peers connect *outward* to it, which
always works, and it forwards packets between them.

```
   direct (STUN worked)          relayed (TURN needed)
   Alice ──────────▶ Bob         Alice ──▶ TURN ──▶ Bob
   free                          you pay for every byte, twice
```

**The numbers to know:**

| Fact | Detail |
|---|---|
| Share of connections needing TURN | Roughly **10–20%**, higher on corporate and mobile networks |
| Cost | Every media byte transits your server, in **and** out |
| Fallback of last resort | **TURN over TCP on port 443** — looks like HTTPS, gets through almost anything |
| Common mistake | Configuring STUN but no TURN. Works perfectly in testing, fails for real users |

**Say this in an interview:** *"I always provision TURN, including a TCP/443 listener, because
about 15% of real users cannot establish a direct path — and that failure is invisible in
office testing."*

### Q6: What are the ICE candidate types?

**Answer:**

Three, tried in order of preference:

| Type | What it is | Cost |
|---|---|---|
| **host** | Your local IP. Works if both peers are on the same network | Free |
| **srflx** (server reflexive) | Your public IP, learned via STUN. The common success case | Free |
| **relay** | A TURN server address. Always works, always costs | Expensive |

ICE tries pairs in priority order and picks the first that works. If you see `relay` candidates
being selected in production for most users, something is wrong with your STUN setup — or your
users are all on hostile networks.

---

## 4. Topologies: mesh vs SFU vs MCU

### Q7: Why does a mesh video call fall apart at five people?

**Answer:**

**This is the most commonly asked WebRTC scaling question. Do the arithmetic out loud.**

In a mesh, everyone connects directly to everyone. With N participants, each person sends N−1
separate encoded streams and receives N−1.

```
        3 people                    5 people
      A ──── B                    A ─── B
       \    /                    /|\   /|\
        \  /                    / | \ / | \
          C                    E──┼──X──┼──C
                                \ | / \ | /
   each uploads 2 streams        \|/   \|/
                                   D ─── ...

                              each uploads 4 streams
```

Assume 1.5 Mbps per video stream — modest, 720p:

| Participants | Upload needed per person | Realistic? |
|---|---|---|
| 2 | 1.5 Mbps | Yes |
| 3 | 3 Mbps | Yes |
| 4 | 4.5 Mbps | Marginal |
| 5 | 6 Mbps | **No** — typical home upload is 5–20 Mbps and shared |
| 10 | 13.5 Mbps | Absolutely not |

And it is not only bandwidth: **encoding is per-connection**, so a laptop is running four
separate video encoders. CPU and battery collapse before the network does.

**The answer:** mesh is correct for **2 participants**, acceptable to 3–4, and wrong beyond
that. Then you move to an SFU.

### Q8: SFU vs MCU — explain the difference and when you'd choose each.

**Answer:**

Both put a server in the middle. The difference is **whether the server touches the media.**

```
SFU — Selective Forwarding Unit          MCU — Multipoint Control Unit
                                         
  A ──1 up──▶┌─────┐──3 down──▶ A          A ──1 up──▶┌─────┐──1 down──▶ A
  B ──1 up──▶│ SFU │──3 down──▶ B          B ──1 up──▶│ MCU │──1 down──▶ B
  C ──1 up──▶│     │──3 down──▶ C          C ──1 up──▶│decode│──1 down──▶ C
  D ──1 up──▶└─────┘──3 down──▶ D          D ──1 up──▶│mix   │──1 down──▶ D
                                                      │encode│
  forwards packets, never decodes                     └─────┘
  cheap CPU, high bandwidth                decodes all, composites one grid, re-encodes
                                           expensive CPU, low client bandwidth
```

| | SFU | MCU |
|---|---|---|
| Server CPU | Low — just forwarding | **Very high** — decode + composite + encode per room |
| Server bandwidth | High — N×(N−1) streams out | Low — N streams out |
| Client download | N−1 streams | 1 stream |
| Client can control layout | Yes | No — the server decided |
| Added latency | Minimal | Noticeable (a full decode/encode cycle) |
| Quality | Original, per stream | Degraded by re-encoding |
| Cost at scale | **Much cheaper** | Expensive |

**When to choose which:**

- **SFU — the default, and what Agora, Zoom, Meet and LiveKit use.** Bandwidth is cheap; CPU is
  not.
- **MCU — only when the client genuinely cannot handle multiple streams:** dialling into a phone
  line (PSTN), legacy hardware conference rooms, or when you need one composited stream for
  recording or broadcast.

**A pattern worth knowing:** many systems run an SFU for the live call *and* an MCU-style
compositor purely for the recording, because a recording must be a single file.

---

## 5. Media: codecs, simulcast and adaptation

### Q9: Alice has fibre, Bob is on 3G. How do they share a call?

**Answer:**

**Simulcast.** The sender uploads several versions of the same video at different qualities, and
the SFU forwards the appropriate one to each receiver.

```
  Alice's browser encodes THREE versions simultaneously:
      high   1280x720  @ 1.5 Mbps  ─┐
      med     640x360  @ 500 kbps  ─┼──▶ SFU ──▶ Carol (fibre)   gets high
      low     320x180  @ 150 kbps  ─┘         └─▶ Bob (3G)       gets low
```

The SFU makes this decision per receiver, continuously, based on what each one reports it can
handle. **The sender is not asked and does not know.**

**Why it works:** the SFU never decodes anything — it just chooses which of three incoming
streams to forward. That is why an SFU stays cheap.

**The cost:** Alice's CPU now runs three encoders, and her upload carries all three layers
(~2.1 Mbps). That is the trade-off.

**SVC (Scalable Video Coding)** is the newer approach: one stream containing layers that can be
*stripped* rather than three separate streams. More efficient, better codec support required
(VP9, AV1).

### Q10: What happens when the network degrades mid-call?

**Answer:**

WebRTC has congestion control built in, and it is one of the genuinely good parts of the stack.

The receiver continuously reports back what it is seeing — packet loss, jitter, round-trip time.
The sender's congestion controller uses that to estimate available bandwidth and **lowers the
bitrate before packets start dropping.**

```
  network degrades
        │
        ▼
  receiver reports loss/jitter (RTCP feedback)
        │
        ▼
  sender's bandwidth estimator lowers target
        │
        ▼
  encoder drops bitrate → then resolution → then framerate
        │
        ▼
  video gets soft but KEEPS MOVING
```

**The degradation order is a product decision you can influence:**

| `degradationPreference` | Behaviour | Use for |
|---|---|---|
| `maintain-framerate` | Drops resolution, keeps motion smooth | **Camera / faces** — people tolerate soft more than stuttery |
| `maintain-resolution` | Drops framerate, keeps detail sharp | **Screen sharing** — text must stay readable |
| `balanced` | Both | General |

Knowing that screen share and camera want *opposite* settings is a nice detail to drop in an
interview.

### Q11: Which codecs, and does it matter?

**Answer:**

| Codec | Notes |
|---|---|
| **Opus** (audio) | Universal. Excellent, adaptive, no real alternative. Just use it |
| **VP8** (video) | Ancient, universally supported. The safe fallback |
| **H.264** | Hardware-accelerated on nearly all phones — **saves battery**, matters for mobile. Patent-encumbered |
| **VP9** | Better compression, supports SVC. More CPU |
| **AV1** | Best compression, royalty-free. Encoding is expensive; adoption is growing |

**The practical answer:** offer H.264 and VP8 for compatibility, prefer VP9/AV1 where both sides
support it. On mobile, **hardware acceleration matters more than compression efficiency** — a
software AV1 encode will flatten the battery and thermally throttle the phone.

---

## 6. Building the signalling server — your actual job

### Q12: Design the signalling server.

**Answer:**

This is the part you own, and it is a normal backend problem: a WebSocket server with rooms,
auth and state. Everything you know from
[03-realtime-systems-agora.md](03-realtime-systems-agora.md) applies.

**Responsibilities:**

1. Authenticate the user
2. Room lifecycle — create, join, leave, destroy when empty
3. Relay SDP offers/answers and ICE candidates between peers
4. Presence — who is in the room, who is muted, who is speaking
5. Issue media-server tokens and TURN credentials
6. Enforce policy — room capacity, who may publish, who may record

```ts
@WebSocketGateway({ namespace: '/rtc' })
export class SignallingGateway {
  @WebSocketServer() server: Server;

  // Signalling messages are just relayed — your server never parses SDP.
  // Treat it as an opaque blob. Trying to interpret or rewrite it is a
  // classic way to break calls in ways that are miserable to debug.
  @SubscribeMessage('signal')
  async relay(
    @ConnectedSocket() client: Socket,
    @MessageBody() msg: { to: string; type: 'offer' | 'answer' | 'candidate'; payload: unknown },
  ) {
    const room = client.data.roomId;

    // Authorise: is the target actually in the same room as the sender?
    // Without this check, anyone can inject signalling into any call.
    const target = await this.rooms.findPeer(room, msg.to);
    if (!target) throw new WsException('peer not in room');

    this.server.to(target.socketId).emit('signal', {
      from: client.data.userId,
      type: msg.type,
      payload: msg.payload,
    });
  }

  async handleDisconnect(client: Socket) {
    // A dropped socket does NOT mean the media stopped. Peers must be told
    // explicitly, or their UI shows a frozen tile of someone who left.
    const { roomId, userId } = client.data;
    await this.rooms.leave(roomId, userId);
    this.server.to(roomId).emit('peer-left', { userId });
    if (await this.rooms.isEmpty(roomId)) await this.rooms.destroy(roomId);
  }
}
```

**Three design points worth stating aloud:**

**Signalling is small and bursty.** A few kilobytes per participant at join time, then almost
nothing. Do not over-engineer it — one modest server handles thousands of concurrent rooms.

**Scaling it is the standard WebSocket problem.** Two signalling servers cannot see each other's
sockets, so you need Redis pub/sub between them —
[the same fix as any WebSocket fan-out](03-realtime-systems-agora.md#2-websockets).

**Never parse or rewrite SDP.** Relay it opaquely. Well-meaning "SDP munging" is a leading cause
of calls that work in Chrome and fail in Safari.

### Q13: What is a data channel, and when would you use one?

**Answer:**

WebRTC can carry arbitrary data peer-to-peer, not only media, over SCTP. Uniquely, you can
configure the reliability:

```ts
// Reliable + ordered — like a WebSocket, but peer-to-peer
pc.createDataChannel('chat');

// Unreliable — do NOT retransmit lost packets
pc.createDataChannel('cursor', { maxRetransmits: 0, ordered: false });
```

**Use it for:** cursor positions in a collaborative editor, game state, file transfer between
peers, low-latency telemetry — anything where a *stale* update is worse than a *missing* one.

**Do not use it for:** anything your server needs to see. It is peer-to-peer, so your backend
has no visibility. Chat messages that must be persisted should go over your WebSocket, not a
data channel.

---

## 7. Tokens, auth and TURN credentials

### Q14: How do you secure access to a room?

**Answer:**

Two separate things, both yours:

**1. Media-server tokens.** Agora, LiveKit and similar use short-lived signed tokens carrying
the channel name, the user id, the role (publisher vs subscriber), and an expiry.

```ts
// Generated server-side ONLY. The app certificate must never reach a client.
@Post('rooms/:id/token')
async issueToken(@Param('id') roomId: string, @CurrentUser() user: User) {
  // Authorise FIRST. The token is the capability — once issued, it works.
  const membership = await this.rooms.assertMember(roomId, user.id);

  return {
    token: buildRtcToken({
      channel: roomId,
      uid: user.id,
      role: membership.canPublish ? 'publisher' : 'subscriber',
      expiresIn: 3600,          // short. Clients refresh
    }),
    expiresAt: Date.now() + 3600_000,
  };
}
```

**The mistake to avoid:** issuing a long-lived token, or issuing before checking membership.
The token *is* the permission — there is no second check at the media server beyond its
signature.

**2. TURN credentials must be time-limited.** Static TURN credentials in client code is a real
and commonly exploited problem — people find them and use your relay as free bandwidth.

Use the standard ephemeral scheme: `username = <expiry-timestamp>:<userId>`, and
`password = HMAC-SHA1(username, sharedSecret)`. The TURN server validates the HMAC itself, so
there is no lookup and no state.

```ts
const expiry = Math.floor(Date.now() / 1000) + 3600;
const username = `${expiry}:${user.id}`;
const credential = createHmac('sha1', process.env.TURN_SECRET)
  .update(username).digest('base64');
```

---

## 8. Recording and server-side processing

### Q15: How do you record a WebRTC call?

**Answer:**

The awkward truth: **media is peer-to-peer and encrypted, so there is nothing on your server to
record.** You have to deliberately create a copy.

Three approaches:

| Approach | How | Trade-offs |
|---|---|---|
| **Client-side** | `MediaRecorder` in the browser, upload afterwards | Free; unreliable — a closed tab loses it. Fine for a personal memo, not for compliance |
| **SFU-side** | The media server already receives every stream; write them to disk | Reliable, cheap. Produces **separate files per participant** — you must composite later |
| **Headless browser** | A bot joins the call and screen-records | Produces exactly what a user saw, including UI. Expensive: one browser per recording |

**The standard production pattern** is SFU-side recording plus post-processing:

```
  call ends
     │
     ▼
  SFU has:  alice.webm  bob.webm  carol.webm  (+ timing metadata)
     │
     ▼
  queue a job ──▶ ffmpeg worker: composite grid, mix audio, transcode to MP4
     │
     ▼
  upload to S3 ──▶ write the URL to Postgres ──▶ notify the user
```

**The details interviewers probe:**

- **Synchronisation.** Participants joined at different times and their clocks differ. You need
  the SFU's timing metadata to align tracks, or audio drifts out of sync.
- **Consent.** In many jurisdictions recording without notifying all participants is illegal.
  The notification is a legal requirement, not a UI nicety.
- **Cost.** Transcoding is CPU-heavy. It belongs in a queue on separate workers, never inline —
  see [04-event-driven-architecture.md](04-event-driven-architecture.md).
- **Storage.** An hour of 720p is roughly 1 GB. Have a retention policy before you launch, not
  after the bill arrives.

---

## 9. WebRTC vs HLS — live streaming at scale

### Q16: One person broadcasting to 100,000 viewers. WebRTC?

**Answer:**

**No — and knowing why is a strong senior answer.**

WebRTC is built for *conversation*: few participants, sub-second latency, bidirectional. Sending
one stream to 100,000 viewers is a different problem, and the economics are completely
different.

```
   WebRTC broadcast                    HLS broadcast
   
   ingest ─▶ SFU ─▶ 100,000            ingest ─▶ transcode ─▶ chunks ─▶ CDN
             │      individual                                  │
             │      connections                                 └─▶ 100,000 viewers
             │                                                      fetch the SAME files
     each is stateful, each             
     costs server bandwidth             CDN edge caching does the work
     
   ~0.5s latency, very expensive        ~5-30s latency, very cheap
```

**The decisive fact: HLS is just files over HTTP**, so a CDN caches them. The 100,000th viewer
costs you almost nothing. A WebRTC connection is stateful and individually served — it costs the
same as the first.

| | WebRTC | LL-HLS | HLS / DASH |
|---|---|---|---|
| Latency | 0.2–0.5s | 2–5s | 10–30s |
| Scales to | Thousands (with expensive infra) | Millions | Millions |
| Cost per viewer | High | Low | Very low |
| Use for | Calls, auctions, betting, interactive | Sports, live commerce | Concerts, one-way events |

**The hybrid pattern**, which is what real products do and worth naming:

```
   host + guests  ──WebRTC──▶ SFU  ──RTMP──▶  transcoder ──HLS──▶ CDN ──▶ everyone else
   (a few, interactive,               (many, passive, cheap, few seconds behind)
    sub-second)
```

The people who *talk* are on WebRTC. The people who *watch* are on HLS. A viewer who joins the
conversation gets promoted from HLS to WebRTC.

**Say this out loud:** *"Latency is only worth paying for where interaction happens. I'd put
speakers on WebRTC and the audience on LL-HLS behind a CDN — and the decision threshold is
whether the viewer can affect what they're watching."*

---

## 10. Capacity planning and cost

### Q17: How many users fit on one SFU?

**Answer:**

Do the arithmetic out loud — this is exactly the estimation skill the design round tests.

**The dominant constraint is bandwidth, not CPU**, because an SFU forwards without decoding.

For a room of N participants, all publishing video at ~1.5 Mbps:

```
  server ingress = N × 1.5 Mbps
  server egress  = N × (N−1) × 1.5 Mbps     ← the one that grows quadratically
```

| Room size | Egress per room | Rooms on a 10 Gbps server |
|---|---|---|
| 2 | 3 Mbps | ~3,300 |
| 5 | 30 Mbps | ~330 |
| 10 | 135 Mbps | ~74 |
| 20 | 570 Mbps | ~17 |

**Which is why every large-room product does the same thing: stop sending everyone.**

- Forward only the **active speaker** plus a handful of recent speakers
- Send **thumbnails** (low simulcast layer) for everyone else
- **Audio-only** for participants past a threshold

A 50-person meeting where only 5 video streams are actually forwarded costs about the same as a
5-person meeting. **That single optimisation is the difference between a viable product and an
unviable one**, and mentioning it unprompted marks you out.

**Cost, roughly:**

| Item | Note |
|---|---|
| SFU bandwidth | Egress is the bill. Ingress is usually free |
| **TURN relay** | Charged **twice** — in and out. 15% of users, so budget for it |
| Recording transcode | CPU-hours, plus storage |
| Storage | ~1 GB per hour of 720p |

---

## 11. Observability — what to measure

### Q18: How do you know call quality is good?

**Answer:**

**Server metrics tell you nothing about call quality.** Media does not pass through your
signalling server, and the SFU only sees packets. The truth lives in the client's `getStats()`
API, and you must collect it deliberately.

**The metrics that matter:**

| Metric | Good | Meaning |
|---|---|---|
| **Round-trip time** | < 150ms | Above 300ms, conversation becomes awkward |
| **Packet loss** | < 1% | Above 3% is visibly bad |
| **Jitter** | < 30ms | Variation in arrival; causes stutter |
| **Freeze rate** | ~0 | The metric users actually feel |
| **Time to first frame** | < 2s | How long "connecting…" lasts |
| **Join success rate** | > 98% | **The most important business metric here** |
| **TURN relay rate** | 10–20% | A spike means STUN is broken or something is misconfigured |

**Join success rate is the one to build alerting on**, because a failed join is invisible in
server logs — the user simply never appears, and they blame your product rather than their
firewall.

```ts
// Sample client stats periodically and ship them to your backend.
// Without this you are blind: your servers look healthy while users
// experience a broken call.
const stats = await pc.getStats();
for (const report of stats.values()) {
  if (report.type === 'inbound-rtp' && report.kind === 'video') {
    telemetry.record({
      sessionId, userId,
      packetsLost: report.packetsLost,
      jitter: report.jitter,
      framesDropped: report.framesDropped,
      freezeCount: report.freezeCount,
    });
  }
}
```

Sample, do not stream — every second per participant is a lot of data. Every 10 seconds, plus a
final summary at call end, is plenty.

Depth on the general approach:
[../phase-4-cloud-infrastructure/05-observability-reliability.md](../phase-4-cloud-infrastructure/05-observability-reliability.md).

---

## 12. Debugging: the failures you will actually see

| Symptom | Likely cause | Fix |
|---|---|---|
| **Works on WiFi, fails on corporate network** | UDP blocked | TURN over **TCP on 443** |
| **Connects, then no video** | ICE succeeded but DTLS failed, or codec mismatch | Check `iceConnectionState` vs `connectionState` separately |
| **Works locally, fails between networks** | STUN missing or TURN unconfigured | The single most common production mistake |
| **One-way audio** | Asymmetric NAT/firewall | Check candidate types on both sides |
| **Video freezes then recovers** | Packet loss, no keyframe | Ensure the SFU requests keyframes (PLI/FIR) |
| **Everything fine in Chrome, broken in Safari** | Codec differences or SDP munging | Stop rewriting SDP |
| **Call drops after ~30s** | Load balancer killing an idle WebSocket | Heartbeat on the signalling channel |
| **Echo** | Acoustic echo cancellation off, or two tabs open | Check `echoCancellation` constraint |
| **Great in office, terrible for real users** | You only tested on one good network | Test on 3G, VPN, and behind a corporate proxy |

**`chrome://webrtc-internals` is the tool.** It shows live candidate pairs, selected route,
bitrate graphs and stats for every connection. Knowing it exists is itself a signal — most
candidates have never opened it.

---

## 13. Choosing a stack

### Q19: Would you build your own media server?

**Answer:**

**No, and be quick about saying so.** SFUs are years of specialised work — congestion control,
codec negotiation, packet loss recovery. There is no business case for reimplementing it.

| Option | When |
|---|---|
| **Agora** | Managed, global edge network, strong in Asia. Pay per minute. **What you have used** |
| **LiveKit** | Open source, self-hostable or cloud, modern SDKs. The current default recommendation |
| **Twilio Video / Daily** | Managed, good docs, simple pricing |
| **mediasoup** | A Node.js SFU *library* — you build the server around it. Maximum control, real work |
| **Janus / Jitsi** | Mature open source, heavier operationally |
| **Cloudflare Calls / AWS IVS** | Cloud-native, tight platform integration |

**Managed vs self-hosted, framed properly:** managed costs per-minute and removes an on-call
burden. Self-hosted costs bandwidth plus an engineer who understands media. The crossover is
usually somewhere in the low millions of minutes per month — below that, managed almost always
wins.

**Your Agora experience is a genuine asset here.** You can say what per-minute pricing does to
unit economics, and what it is like to operate against a managed provider when something goes
wrong. Very few candidates can.

---

## 14. System design walkthroughs

### 14a. Design a 1:1 video calling feature

```
  Signalling:  WebSocket (NestJS gateway) + Redis pub/sub for multi-server
  Media:       peer-to-peer, mesh of 2 — no media server needed
  NAT:         STUN + TURN (with TCP/443 fallback)
  Presence:    Redis with TTL, heartbeat every 15s
  Push:        FCM/APNs to wake the callee's device
  Persistence: Postgres — call records, duration, participants
```

**The bits interviewers push on:**
- **Ringing.** The callee may be backgrounded. A push notification wakes the app; the WebSocket
  alone is not enough.
- **Busy / no answer / declined** are all distinct states with their own timeouts.
- **Reconnection.** A phone changing WiFi→4G changes IP. ICE restart, not a new call.
- **1:1 needs no SFU** — say this. Adding one for two people is over-engineering.

### 14b. Design a live-streaming platform (your Right Tracks / Agora experience)

```
  Broadcaster ──RTMP or WebRTC──▶ ingest ──▶ transcode ladder (1080p/720p/480p/360p)
                                                     │
                                              package as LL-HLS
                                                     │
                                                    CDN ──▶ viewers
                                                     
  Chat:      WebSocket, separate path, Redis pub/sub fan-out
  Presence:  Redis, approximate counts (exact viewer count is not worth the cost)
  Recording: write the ingest stream to S3 in parallel
```

**Talk about:**
- **Why HLS and not WebRTC for viewers** — CDN caching is the whole argument (§9)
- **The transcode ladder** — one 1080p ingest becomes four renditions so a 3G phone can watch
- **Latency budget** — where each second goes: encode, ingest, transcode, packaging, CDN, player buffer
- **Chat is a completely separate system** and must survive the video path failing
- **The hybrid upgrade path** — a viewer who joins the conversation moves from HLS to WebRTC

### 14c. Design a 50-person webinar with 5 speakers

The key insight: **it is two systems, not one.**

```
  5 speakers   ──▶ WebRTC ──▶ SFU   (interactive, sub-second, full quality)
                                │
                                └──▶ RTMP ──▶ HLS ──▶ CDN ──▶ 45 attendees (passive, ~3s)
  
  "raise hand" → promote an attendee from HLS to WebRTC → they join the SFU
```

Attendees cost you almost nothing because they are on a CDN. Only the speakers consume SFU
capacity. **This is the design that makes the economics work**, and proposing it unprompted is
exactly the level of answer a lead role is looking for.

---

## 15. Interview questions

**Q: Why does WebRTC need a server at all if it is peer-to-peer?**
> Three reasons: signalling, because peers cannot find each other; STUN/TURN, because of NAT;
> and an SFU beyond about four participants, because mesh upload bandwidth does not scale.

**Q: Your video call works in the office and fails for a user at home. Where do you look?**
> ICE. Almost certainly it failed to find a direct path and either TURN was not configured or
> UDP was blocked with no TCP/443 fallback. I'd check the selected candidate pair in
> `webrtc-internals`, and confirm the TURN relay rate in our telemetry.

**Q: How many people can be in a mesh call?**
> Realistically four. Each participant uploads N−1 encoded streams, so at five people that's
> 6 Mbps up and five concurrent encoders. Past that you need an SFU.

**Q: SFU or MCU?**
> SFU by default — it forwards without decoding, so CPU stays low and clients control their own
> layout. MCU only when the client genuinely cannot handle multiple streams: PSTN dial-in,
> legacy hardware, or producing a single composited recording.

**Q: How do you handle a participant on a bad connection?**
> Simulcast. The sender publishes several quality layers and the SFU forwards the appropriate
> one per receiver, adjusting continuously. Nothing degrades for anyone else.

**Q: How would you record it?**
> SFU-side, because client-side recording is lost when a tab closes. You get separate tracks per
> participant, so a queued ffmpeg job composites and transcodes them afterwards. The subtle part
> is synchronisation — participants joined at different times, so you need the SFU's timing
> metadata.

**Q: One broadcaster, a million viewers — WebRTC?**
> No. Every WebRTC connection is stateful and individually served, so the millionth viewer costs
> as much as the first. HLS is files over HTTP, so a CDN absorbs it. I'd trade latency for cost
> and use LL-HLS, keeping WebRTC only for people who actually interact.

**Q: What is the most expensive mistake in a WebRTC system?**
> Not provisioning TURN properly. It works perfectly in testing — everyone is on the same
> network — and then roughly 15% of real users cannot connect at all, and it looks like your
> product is broken rather than their firewall.

---

## Related

- [03-realtime-systems-agora.md](03-realtime-systems-agora.md) — WebSockets, SSE, Socket.IO, Agora platform, RTMP
- [04-event-driven-architecture.md](04-event-driven-architecture.md) — queueing the recording and transcode jobs
- [../phase-4-cloud-infrastructure/01-nginx-deep-dive.md](../phase-4-cloud-infrastructure/01-nginx-deep-dive.md) — proxying WebSocket signalling correctly
- [../phase-4-cloud-infrastructure/05-observability-reliability.md](../phase-4-cloud-infrastructure/05-observability-reliability.md) — the telemetry pipeline behind §11
- [../phase-5-system-design/06-hld-practice-problems.md](../phase-5-system-design/06-hld-practice-problems.md) — where these designs get tested
- [../resume/01-master-resume.md](../resume/01-master-resume.md) — turning this into the differentiator bullet
