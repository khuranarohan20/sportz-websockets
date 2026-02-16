import express, { type Application } from "express";
import http, { type Server } from "http";
import { securityMiddleware } from "./config/arcjet.js";
import "./config/env.js"; // Must be imported first to load env vars
import { commentaryRouter } from "./routes/commentary.js";
import { matchesRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const PORT: number = Number(process.env.PORT || 8000);
const HOST: string = process.env.HOST || "0.0.0.0";

const app: Application = express();
const server: Server = http.createServer(app);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the Sports API!" });
});

app.use(securityMiddleware());

app.use("/matches", matchesRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);

// TODO: Type these properly after Phase 4 when routes are converted to TypeScript
app.locals.broadcastMatchCreated = broadcastMatchCreated as (matchData: any) => void;
app.locals.broadcastCommentary = broadcastCommentary as (commentaryData: any) => void;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);

  console.log(
    `Websocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
