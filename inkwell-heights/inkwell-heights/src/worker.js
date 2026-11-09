// Inkwell Heights: serves the game and runs the shared multiplayer city.
//
// Every visitor's browser opens a WebSocket to /ws. All of them land in ONE Durable Object
// ("the city"), which keeps each player's latest state and relays it to everyone else.
// The game itself decides who hosts the simulation; this server only passes state around,
// so it stays tiny and cheap. Uses the WebSocket Hibernation API, so when nobody is
// actively playing the city sleeps and costs nothing.

import { DurableObject } from "cloudflare:workers";

const MAX_CONNECTIONS = 32;   // players (4) plus people watching
const MAX_STATE_BYTES = 4096; // one person's state, same budget the game is built for
const MAX_MSGS_PER_SEC = 25;  // the game sends about 8 a second; anything far above is junk

export class City extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = new Map(); // peer id -> latest state (JSON text)
    this.rate = new Map();  // peer id -> { t, n }
    // Keep-alive pings are answered without waking the city up.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request) {
    if (this.ctx.getWebSockets().length >= MAX_CONNECTIONS) {
      return new Response("Inkwell Heights is full right now. Try again soon.", { status: 503 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const peer = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer });

    // Tell the newcomer who they are and who is already here.
    const peers = [];
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const a = ws.deserializeAttachment();
      if (!a) continue;
      const s = this.state.get(a.peer);
      peers.push({ peer: a.peer, pr: s ? JSON.parse(s) : {} });
    }
    server.send(JSON.stringify({ t: "hi", you: peer, peers }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > MAX_STATE_BYTES + 512) return;
    const a = ws.deserializeAttachment();
    if (!a) return;

    // Simple per-person rate limit.
    const now = Date.now();
    let r = this.rate.get(a.peer);
    if (!r || now - r.t > 1000) { r = { t: now, n: 0 }; this.rate.set(a.peer, r); }
    if (++r.n > MAX_MSGS_PER_SEC) return;

    let m;
    try { m = JSON.parse(message); } catch { return; }
    if (!m || m.t !== "p" || typeof m.pr !== "object" || m.pr === null || Array.isArray(m.pr)) return;
    const text = JSON.stringify(m.pr);
    if (new TextEncoder().encode(text).length > MAX_STATE_BYTES) return;

    this.state.set(a.peer, text);
    const out = `{"t":"p","peer":${JSON.stringify(a.peer)},"pr":${text}}`;
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) { try { other.send(out); } catch {} }
    }
  }

  webSocketClose(ws, code, reason) {
    this.leave(ws);
    try { ws.close(code, reason); } catch {}
  }

  webSocketError(ws) {
    this.leave(ws);
  }

  leave(ws) {
    const a = ws.deserializeAttachment();
    if (!a) return;
    this.state.delete(a.peer);
    this.rate.delete(a.peer);
    const out = JSON.stringify({ t: "left", peer: a.peer });
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) { try { other.send(out); } catch {} }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("This address is for the game's live connection.", { status: 426 });
      }
      // Everyone joins the same city.
      const city = env.CITY.get(env.CITY.idFromName("main"));
      return city.fetch(request);
    }
    // Everything else is the game itself (public/index.html).
    return env.ASSETS.fetch(request);
  },
};
