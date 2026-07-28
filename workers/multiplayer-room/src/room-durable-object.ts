import { DurableObject } from "cloudflare:workers";
import {
  createLocalRoomEmulator,
  type Seat,
} from "../../../src/lib/cloud-state/multiplayer-emulator";
import { CLOUDFLARE_DURABLE_OBJECTS_FREE_BASELINE } from "../../../src/lib/cloud-state/multiplayer-contract";
import { applyConnectFourAction, createConnectFourState, type ConnectFourState } from "./connect-four-authority";

// `Env` is the ambient global interface `wrangler types` generates into
// worker-configuration.d.ts from this project's wrangler.jsonc bindings —
// re-run `npx wrangler types` after changing the `durable_objects` binding.

type PersistedRoom = {
  state: ConnectFourState;
  revision: number;
  createdAtMs: number;
  lastActivityAtMs: number;
  seats: Seat[];
  /** UTC yyyy-mm-dd — the free-tier budget counters reset when this changes. */
  dayKey: string;
  requestsUsedToday: number;
  gbSecondsUsedToday: number;
};

type Emulator = ReturnType<typeof createLocalRoomEmulator<ConnectFourState>>;

function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashSeatToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * One Durable Object instance = one authoritative room. Wraps the network-free
 * `createLocalRoomEmulator` (already covered by 9 unit tests in the game repo)
 * with SQLite-backed persistence (via the storage KV API, which is SQLite on
 * the free plan) and WebSocket Hibernation so the room survives eviction
 * between moves without holding the DO warm in memory.
 *
 * PoC game: Connect Four (`connect-four-authority.ts`) — a small, standalone,
 * server-trusted reimplementation, not the shared single-player AI logic.
 */
export class RoomDurableObject extends DurableObject<Env> {
  private roomId: string | null = null;
  private emulator: Emulator | null = null;
  private tokenHashCache = new Map<string, string>();
  /** Set immediately before a `join` dispatch so the emulator's sync `tokenFactory` can consume it. */
  private pendingJoinToken: string | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomId = url.pathname.split("/").filter(Boolean).pop();
    if (!roomId) return new Response("missing room id", { status: 400 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket upgrade", { status: 426 });
    }

    await this.ensureEmulator(roomId);

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async ensureEmulator(roomId: string): Promise<Emulator> {
    if (this.emulator && this.roomId === roomId) return this.emulator;

    const persisted = await this.ctx.storage.get<PersistedRoom>("room");
    this.roomId = roomId;
    const createdAtMs = persisted?.createdAtMs ?? Date.now();

    this.emulator = createLocalRoomEmulator<ConnectFourState>({
      roomId,
      initialState: createConnectFourState(),
      createdAtMs,
      applyAction: applyConnectFourAction,
      // Both callbacks must be sync (createLocalRoomEmulator's dispatch() is
      // sync). The actual token generation + SHA-256 hashing happens async in
      // webSocketMessage BEFORE dispatch is called, for the one command type
      // that needs each: `tokenFactory` only fires on `join`, `hashSeatToken`
      // only needs a cache hit for tokens webSocketMessage already pre-hashed.
      tokenFactory: () => {
        const token = this.pendingJoinToken;
        this.pendingJoinToken = null;
        if (!token) throw new Error("tokenFactory called without a pending join token");
        return token;
      },
      hashSeatToken: (token) => {
        const hash = this.tokenHashCache.get(token);
        if (!hash) throw new Error("hashSeatToken called for a token that was not pre-hashed");
        return hash;
      },
      restore: persisted
        ? { state: persisted.state, revision: persisted.revision, lastActivityAtMs: persisted.lastActivityAtMs, seats: persisted.seats }
        : undefined,
    });
    return this.emulator;
  }

  private async persist(nowMs: number, dayKey: string, requestsUsedToday: number, gbSecondsUsedToday: number): Promise<void> {
    if (!this.emulator) return;
    const snapshot = this.emulator.getSnapshot();
    const record: PersistedRoom = {
      state: snapshot.state,
      revision: snapshot.revision,
      createdAtMs: Date.parse(snapshot.createdAt),
      lastActivityAtMs: nowMs,
      seats: this.emulator.getSeats(),
      dayKey,
      requestsUsedToday,
      gbSecondsUsedToday,
    };
    await this.ctx.storage.put("room", record);
  }

  private async budgetForThisRequest(nowMs: number): Promise<{ dayKey: string; requestsUsedToday: number; gbSecondsUsedToday: number }> {
    const persisted = await this.ctx.storage.get<PersistedRoom>("room");
    const dayKey = utcDayKey(nowMs);
    const sameDay = persisted?.dayKey === dayKey;
    return {
      dayKey,
      requestsUsedToday: (sameDay ? persisted?.requestsUsedToday ?? 0 : 0) + 1,
      gbSecondsUsedToday: sameDay ? persisted?.gbSecondsUsedToday ?? 0 : 0,
    };
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const startedAtMs = Date.now();
    if (!this.emulator || !this.roomId) return; // fetch() always runs first; defensive only.

    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      ws.send(JSON.stringify({ ok: false, error: "invalid_json" }));
      return;
    }

    // seatToken hashing must be sync inside the emulator's dispatch call, so we
    // pre-hash any seatToken present on the incoming command and stash it for
    // the emulator's `hashSeatToken` lookup — raw token never touches storage.
    if (parsed && typeof parsed === "object" && typeof (parsed as { seatToken?: unknown }).seatToken === "string") {
      const token = (parsed as { seatToken: string }).seatToken;
      this.tokenHashCache.set(token, await hashSeatToken(token));
    } else if (parsed && typeof parsed === "object" && (parsed as { type?: unknown }).type === "join") {
      // `join` has no client-supplied seatToken — the server mints one, so
      // prepare it (and its hash) before dispatch synchronously calls tokenFactory.
      const token = randomToken();
      this.tokenHashCache.set(token, await hashSeatToken(token));
      this.pendingJoinToken = token;
    }

    const nowMs = Date.now();
    const { dayKey, requestsUsedToday, gbSecondsUsedToday } = await this.budgetForThisRequest(nowMs);
    this.emulator.setBudget({
      requestsUsedToday,
      gbSecondsUsedToday,
      storedBytes: 0, // Wave 1: track actual `room` record byte size once non-trivial state ships.
    });

    const reply = this.emulator.dispatch(parsed, nowMs);
    ws.send(JSON.stringify(reply));

    if (reply.ok && reply.kind === "joined") {
      ws.serializeAttachment({ seatToken: reply.seatToken });
    }

    if (reply.ok) {
      // Best-effort GB-seconds estimate for the fail-closed budget guard —
      // wall-clock duration of this handler at the Workers default 128MB,
      // not real Cloudflare billing data.
      const elapsedGbSeconds = ((Date.now() - startedAtMs) / 1000) * 0.125;
      await this.persist(nowMs, dayKey, requestsUsedToday, gbSecondsUsedToday + elapsedGbSeconds);
      this.broadcastSnapshot(ws, reply.snapshot);
    }
    this.tokenHashCache.clear();
    this.pendingJoinToken = null;
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    await this.handleDisconnect(ws);
  }

  private async handleDisconnect(ws: WebSocket): Promise<void> {
    if (!this.emulator) return;
    const attachment = ws.deserializeAttachment() as { seatToken?: string } | null;
    if (!attachment?.seatToken) return;
    const nowMs = Date.now();
    this.tokenHashCache.set(attachment.seatToken, await hashSeatToken(attachment.seatToken));
    this.emulator.disconnect(attachment.seatToken, nowMs);
    this.tokenHashCache.clear();
    const { dayKey, requestsUsedToday, gbSecondsUsedToday } = await this.budgetForThisRequest(nowMs);
    await this.persist(nowMs, dayKey, requestsUsedToday, gbSecondsUsedToday);
  }

  /** Every other connected socket in the room gets the fresh snapshot too, so peers see moves live. */
  private broadcastSnapshot(sender: WebSocket, snapshot: ReturnType<Emulator["getSnapshot"]>): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === sender) continue;
      try {
        socket.send(JSON.stringify({ ok: true, kind: "sync", snapshot }));
      } catch {
        // socket already closing — webSocketClose will clean it up.
      }
    }
  }
}

export { CLOUDFLARE_DURABLE_OBJECTS_FREE_BASELINE };
