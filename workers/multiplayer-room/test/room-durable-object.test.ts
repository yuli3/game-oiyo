import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

function connect(roomId: string) {
  const id = env.ROOM.idFromName(roomId);
  const stub = env.ROOM.get(id);
  return stub;
}

async function upgrade(roomId: string): Promise<WebSocket> {
  const stub = connect(roomId);
  const response = await stub.fetch(`https://example.com/room/${roomId}`, {
    headers: { Upgrade: "websocket" },
  });
  const socket = response.webSocket;
  if (!socket) throw new Error("expected a WebSocket response");
  socket.accept();
  return socket;
}

function nextMessage(socket: WebSocket): Promise<any> {
  return new Promise((resolve) => {
    socket.addEventListener("message", (event) => resolve(JSON.parse(event.data as string)), { once: true });
  });
}

function send(socket: WebSocket, command: Record<string, unknown>) {
  socket.send(JSON.stringify({ v: 1, sentAt: new Date().toISOString(), ...command }));
}

let n = 0;
const cmdId = () => `cmd_${String(++n).padStart(8, "0")}`;

describe("RoomDurableObject (Connect Four PoC)", () => {
  it("rejects a non-websocket request", async () => {
    const stub = connect(`room-plain-${cmdId()}`);
    const res = await stub.fetch("https://example.com/room/whatever");
    expect(res.status).toBe(426);
  });

  it("two seats join, alternate turns, and see each other's moves via broadcast", async () => {
    const roomId = `room-two-seats-${cmdId()}`;
    // Both sockets are accepted (and thus in the broadcast set) as soon as
    // they upgrade — before either has sent a `join` command.
    const a = await upgrade(roomId);
    const b = await upgrade(roomId);

    send(a, { type: "join", roomId, clientCommandId: cmdId() });
    const aJoined = await nextMessage(a);
    expect(aJoined.ok && aJoined.kind).toBe("joined");
    // a's join broadcasts a "sync" snapshot to every OTHER connected socket — b, here.
    const bSeesAJoin = await nextMessage(b);
    expect(bSeesAJoin.ok && bSeesAJoin.kind).toBe("sync");
    expect(bSeesAJoin.snapshot.connectedPlayers).toBe(1);

    send(b, { type: "join", roomId, clientCommandId: cmdId() });
    const bJoined = await nextMessage(b);
    expect(bJoined.ok && bJoined.kind).toBe("joined");
    expect(bJoined.snapshot.connectedPlayers).toBe(2);
    const aSeesBJoin = await nextMessage(a);
    expect(aSeesBJoin.ok && aSeesBJoin.kind).toBe("sync");
    expect(aSeesBJoin.snapshot.connectedPlayers).toBe(2);

    send(a, { type: "move", roomId, clientCommandId: cmdId(), seatToken: aJoined.seatToken, expectedRevision: bJoined.snapshot.revision, action: { col: 3 } });
    const aMoveReply = await nextMessage(a);
    expect(aMoveReply.ok && aMoveReply.kind).toBe("moved");
    expect(aMoveReply.snapshot.state.board[5][3]).toBe(1);

    const bSeesMove = await nextMessage(b);
    expect(bSeesMove.ok && bSeesMove.kind).toBe("sync");
    expect(bSeesMove.snapshot.state.board[5][3]).toBe(1);
    expect(bSeesMove.snapshot.state.turn).toBe(2);

    a.close(1000, "test done");
    b.close(1000, "test done");
  });

  it("rejects a move from the wrong seat's turn", async () => {
    const roomId = `room-turn-order-${cmdId()}`;
    const a = await upgrade(roomId);
    const b = await upgrade(roomId);

    send(a, { type: "join", roomId, clientCommandId: cmdId() });
    await nextMessage(a);
    await nextMessage(b); // a's join broadcast to b
    send(b, { type: "join", roomId, clientCommandId: cmdId() });
    const bJoined = await nextMessage(b);
    await nextMessage(a); // b's join broadcast to a

    // b is mark 2 and it's mark 1's turn — b's move must be rejected as an invalid game action.
    send(b, { type: "move", roomId, clientCommandId: cmdId(), seatToken: bJoined.seatToken, expectedRevision: bJoined.snapshot.revision, action: { col: 0 } });
    const reply = await nextMessage(b);
    expect(reply).toEqual({ ok: false, error: "invalid_game_action" });

    a.close(1000, "test done");
    b.close(1000, "test done");
  });

  it("persists revision and board across a Durable Object eviction", async () => {
    const roomId = `room-persist-${cmdId()}`;
    const stub = connect(roomId);
    const a = await upgrade(roomId);

    send(a, { type: "join", roomId, clientCommandId: cmdId() });
    const joined = await nextMessage(a);
    send(a, { type: "move", roomId, clientCommandId: cmdId(), seatToken: joined.seatToken, expectedRevision: joined.snapshot.revision, action: { col: 2 } });
    const moved = await nextMessage(a);
    expect(moved.ok).toBe(true);

    // Client-initiated close is what a real dropped/closed connection looks
    // like — it runs `webSocketClose` on the DO (marking the seat
    // disconnected, within the reconnect grace window) before the DO is
    // evicted. `evictDurableObject`'s own "close" mode simulates an abrupt
    // connection drop where no close handler runs at all, which is a
    // different (still-"connected") scenario the protocol intentionally
    // does NOT treat as resumable.
    a.close(1000, "client disconnect");
    await new Promise((resolve) => setTimeout(resolve, 50)); // let the close handshake + webSocketClose's persist() finish

    const { evictDurableObject } = await import("cloudflare:test");
    await evictDurableObject(stub);

    // Reconnect after eviction — a fresh fetch() re-derives the emulator from
    // persisted storage, so the board/revision must reflect the prior move.
    const b = await upgrade(roomId);
    send(b, {
      type: "resume",
      roomId,
      clientCommandId: cmdId(),
      seatToken: joined.seatToken,
      lastSeenRevision: moved.snapshot.revision,
    });
    const resumed = await nextMessage(b);
    expect(resumed.ok && resumed.kind).toBe("resumed");
    expect(resumed.snapshot.revision).toBe(moved.snapshot.revision);
    expect(resumed.snapshot.state.board[5][2]).toBe(1);

    b.close(1000, "test done");
  });
});
