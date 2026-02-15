import express, { type Application } from "express";
import http, { type Server } from "http";
import { securityMiddleware } from "./config/arcjet.ts";
import "./config/env.ts"; // Must be imported first to load env vars
import { commentaryRouter } from "./routes/commentary.ts";
import { matchesRouter } from "./routes/matches.ts";
import { attachWebSocketServer } from "./ws/server.ts";

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

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);

  console.log(
    `Websocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
