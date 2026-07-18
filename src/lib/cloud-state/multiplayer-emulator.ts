import {
  ROOM_LIMITS,
  admitRoomCommand,
  canResume,
  validateClientRoomCommand,
  type ClientRoomCommand,
  type RoomBudget,
} from "./multiplayer-contract";

type Seat = {
  id: string;
  tokenHash: string;
  connected: boolean;
  disconnectedAtMs: number | null;
};

export type LocalRoomSnapshot<State> = {
  roomId: string;
  revision: number;
  createdAt: string;
  lastActivityAt: string;
  connectedPlayers: number;
  state: State;
};

export type EmulatorReply<State> =
  | { ok: true; kind: "joined"; seatToken: string; seatId: string; snapshot: LocalRoomSnapshot<State> }
  | { ok: true; kind: "resumed" | "moved" | "pong" | "left"; snapshot: LocalRoomSnapshot<State> }
  | {
      ok: false;
      error:
        | "invalid_command"
        | "wrong_room"
        | "invalid_seat"
        | "stale_revision"
        | "reconnect_expired"
        | "invalid_game_action"
        | "service_unavailable_budget"
        | "room_expired"
        | "room_full"
        | "rate_limited";
    };

export type LocalRoomEmulatorOptions<State> = {
  roomId: string;
  initialState: State;
  createdAtMs: number;
  applyAction: (state: State, action: Record<string, unknown>, seatId: string) => State | null;
  tokenFactory: () => string;
  hashSeatToken: (token: string) => string;
  budget?: RoomBudget;
};

const DEFAULT_BUDGET: RoomBudget = { requestsUsedToday: 0, gbSecondsUsedToday: 0, storedBytes: 0 };

/**
 * In-memory, network-free pilot for the authoritative Durable Object contract.
 * Raw seat tokens never enter room snapshots or persistent state; only their
 * injected hash is kept on seats. The bounded idempotency cache is memory-only.
 */
export function createLocalRoomEmulator<State>(options: LocalRoomEmulatorOptions<State>) {
  let state = structuredClone(options.initialState);
  let revision = 0;
  let lastActivityAtMs = options.createdAtMs;
  let budget = options.budget ?? DEFAULT_BUDGET;
  const seats = new Map<string, Seat>();
  const commandReplies = new Map<string, EmulatorReply<State>>();
  const rateWindows = new Map<string, { startedAtMs: number; count: number }>();

  const connectedPlayers = () => [...seats.values()].filter((seat) => seat.connected).length;
  const snapshot = (): LocalRoomSnapshot<State> => ({
    roomId: options.roomId,
    revision,
    createdAt: new Date(options.createdAtMs).toISOString(),
    lastActivityAt: new Date(lastActivityAtMs).toISOString(),
    connectedPlayers: connectedPlayers(),
    state: structuredClone(state),
  });

  const remember = (id: string, reply: EmulatorReply<State>) => {
    if (commandReplies.size >= 256) commandReplies.delete(commandReplies.keys().next().value as string);
    commandReplies.set(id, reply);
    return reply;
  };

  const seatForToken = (token: string) => {
    const hash = options.hashSeatToken(token);
    return [...seats.values()].find((seat) => seat.tokenHash === hash) ?? null;
  };

  const countRate = (key: string, nowMs: number) => {
    const current = rateWindows.get(key);
    if (!current || nowMs - current.startedAtMs >= ROOM_LIMITS.rateWindowMs) {
      rateWindows.set(key, { startedAtMs: nowMs, count: 1 });
      return 0;
    }
    current.count += 1;
    return current.count - 1;
  };

  function dispatch(input: unknown, nowMs: number, sourceKey = "local-client"): EmulatorReply<State> {
    const parsed = validateClientRoomCommand(input, nowMs);
    if (!parsed.ok) return { ok: false, error: "invalid_command" };
    const command: ClientRoomCommand = parsed.value;
    if (command.roomId !== options.roomId) return { ok: false, error: "wrong_room" };
    const previous = commandReplies.get(command.clientCommandId);
    if (previous) return structuredClone(previous);

    const seat = command.type === "join" ? null : seatForToken(command.seatToken);
    if (command.type !== "join" && !seat) return remember(command.clientCommandId, { ok: false, error: "invalid_seat" });
    const rateKey = seat?.id ?? sourceKey;
    const admission = admitRoomCommand({
      budget,
      room: { createdAtMs: options.createdAtMs, lastActivityAtMs, connectedPlayers: connectedPlayers() },
      nowMs,
      commandsInCurrentWindow: countRate(rateKey, nowMs),
      commandType: command.type,
    });
    if (!admission.ok) return remember(command.clientCommandId, { ok: false, error: admission.reason });

    if (command.type === "join") {
      const seatToken = options.tokenFactory();
      const tokenHash = options.hashSeatToken(seatToken);
      if (seatForToken(seatToken)) return remember(command.clientCommandId, { ok: false, error: "invalid_seat" });
      const seatId = `seat-${seats.size + 1}`;
      seats.set(seatId, { id: seatId, tokenHash, connected: true, disconnectedAtMs: null });
      revision += 1;
      lastActivityAtMs = nowMs;
      return remember(command.clientCommandId, { ok: true, kind: "joined", seatToken, seatId, snapshot: snapshot() });
    }

    if (command.type === "resume") {
      if (seat!.connected || seat!.disconnectedAtMs === null || !canResume(seat!.disconnectedAtMs, nowMs)) {
        return remember(command.clientCommandId, { ok: false, error: "reconnect_expired" });
      }
      seat!.connected = true;
      seat!.disconnectedAtMs = null;
      lastActivityAtMs = nowMs;
      return remember(command.clientCommandId, { ok: true, kind: "resumed", snapshot: snapshot() });
    }

    if (!seat!.connected) return remember(command.clientCommandId, { ok: false, error: "invalid_seat" });
    if (command.type === "move") {
      if (command.expectedRevision !== revision) return remember(command.clientCommandId, { ok: false, error: "stale_revision" });
      const nextState = options.applyAction(structuredClone(state), command.action, seat!.id);
      if (nextState === null) return remember(command.clientCommandId, { ok: false, error: "invalid_game_action" });
      state = structuredClone(nextState);
      revision += 1;
      lastActivityAtMs = nowMs;
      return remember(command.clientCommandId, { ok: true, kind: "moved", snapshot: snapshot() });
    }

    if (command.type === "leave") {
      seats.delete(seat!.id);
      revision += 1;
      lastActivityAtMs = nowMs;
      return remember(command.clientCommandId, { ok: true, kind: "left", snapshot: snapshot() });
    }

    lastActivityAtMs = nowMs;
    return remember(command.clientCommandId, { ok: true, kind: "pong", snapshot: snapshot() });
  }

  function disconnect(seatToken: string, nowMs: number): boolean {
    const seat = seatForToken(seatToken);
    if (!seat || !seat.connected) return false;
    seat.connected = false;
    seat.disconnectedAtMs = nowMs;
    return true;
  }

  return {
    dispatch,
    disconnect,
    getSnapshot: snapshot,
    setBudget(next: RoomBudget) { budget = next; },
  };
}
