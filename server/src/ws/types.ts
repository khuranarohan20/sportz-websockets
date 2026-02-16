import type { Match, Commentary } from "../db/db.js";

/**
 * Client → Server messages (discriminated union)
 * Messages sent by WebSocket clients to the server
 */
export type ClientMessage =
  | { type: "subscribe"; matchId: number }
  | { type: "unsubscribe"; matchId: number };

/**
 * Server → Client messages (discriminated union)
 * Messages sent by the server to WebSocket clients
 */
export type ServerMessage =
  | { type: "welcome" }
  | { type: "subscribed"; matchId: number }
  | { type: "unsubscribed"; matchId: number }
  | { type: "error"; message: string }
  | { type: "match_created"; data: Match }
  | { type: "commentary"; data: Commentary };
