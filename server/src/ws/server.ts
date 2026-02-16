import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../config/arcjet.js";
import { MAX_PAYLOAD_SIZE, PING_PONG_INTERVAL } from "../constants/ws.js";
import type { Match, Commentary } from "../db/db.js";
import type { Server } from "http";
import type { IncomingMessage } from "http";

// Extended WebSocket interface for custom properties
interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  subscriptions: Set<number>;
}

// Type for subscriber management
const matchSubscribers = new Map<number, Set<ExtendedWebSocket>>();

// Type guard for WebSocket ready state
function isOpen(socket: ExtendedWebSocket): boolean {
  return socket.readyState === WebSocket.OPEN;
}

function subscribe(matchId: number, socket: ExtendedWebSocket): void {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId)!.add(socket);
}

function unsubscribe(matchId: number, socket: ExtendedWebSocket): void {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket: ExtendedWebSocket): void {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(
  matchId: number,
  payload: Record<string, unknown>,
): void {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const subscriber of subscribers) {
    if (!isOpen(subscriber)) continue;
    subscriber.send(message);
  }
}

function sendJson(socket: ExtendedWebSocket, payload: Record<string, unknown>): void {
  if (!isOpen(socket)) return;

  socket.send(JSON.stringify(payload));
}

function broadcastToAll(
  wss: WebSocketServer,
  payload: Record<string, unknown>,
): void {
  for (const client of wss.clients) {
    const ws = client as ExtendedWebSocket;
    sendJson(ws, payload);
  }
}

// Type for client messages
type ClientMessage =
  | { type: "subscribe"; matchId: number }
  | { type: "unsubscribe"; matchId: number }
  | { type: string; matchId?: number };

function handleMessage(socket: ExtendedWebSocket, data: Buffer): void {
  let message: unknown;

  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  const msg = message as ClientMessage;

  if (msg?.type === "subscribe" && typeof msg?.matchId === "number" && Number.isInteger(msg.matchId)) {
    subscribe(msg.matchId, socket);
    socket.subscriptions.add(msg.matchId);
    sendJson(socket, { type: "subscribed", matchId: msg.matchId });
    return;
  }

  if (msg?.type === "unsubscribe" && typeof msg?.matchId === "number" && Number.isInteger(msg.matchId)) {
    unsubscribe(msg.matchId, socket);
    socket.subscriptions.delete(msg.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: msg.matchId });
    return;
  }
}

// Return type for broadcast functions
export interface BroadcastFunctions {
  broadcastMatchCreated: (match: Match) => void;
  broadcastCommentary: (matchId: number, comment: Commentary) => void;
}

export function attachWebSocketServer(server: Server): BroadcastFunctions {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: MAX_PAYLOAD_SIZE,
  });

  wss.on("connection", async (socket: WebSocket, req: IncomingMessage) => {
    const extendedSocket = socket as ExtendedWebSocket;

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded"
            : "Forbidden";

          extendedSocket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("Arcjet ws error:", error);
        extendedSocket.close(1011, "Server security error");
        return;
      }
    }

    extendedSocket.isAlive = true;

    extendedSocket.on("pong", () => {
      extendedSocket.isAlive = true;
    });

    extendedSocket.subscriptions = new Set();

    extendedSocket.on("message", (data: Buffer) => {
      handleMessage(extendedSocket, data);
    });

    extendedSocket.on("error", () => {
      extendedSocket.terminate();
    });

    extendedSocket.on("close", () => {
      cleanupSubscriptions(extendedSocket);
    });

    sendJson(extendedSocket, { type: "welcome" });

    extendedSocket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const extendedWs = ws as ExtendedWebSocket;
      if (extendedWs.isAlive === false) return extendedWs.terminate();

      extendedWs.isAlive = false;
      extendedWs.ping();
    });
  }, PING_PONG_INTERVAL);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match: Match): void {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentary(matchId: number, comment: Commentary): void {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}
