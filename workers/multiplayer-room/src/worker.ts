export { RoomDurableObject } from "./room-durable-object";

// `Env` below is the ambient global interface `wrangler types` generates.

/**
 * Routes `/room/:roomId` WebSocket upgrades to the single authoritative DO
 * instance for that room (`idFromName` — same name always resolves to the
 * same instance). Everything else 404s; there is no other surface here.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([^/]+)$/);
    if (!match) return new Response("not found", { status: 404 });

    const roomId = match[1];
    const id = env.ROOM.idFromName(roomId);
    const stub = env.ROOM.get(id);
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
