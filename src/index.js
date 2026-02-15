import "./config/env.js"; // Must be imported first to load env vars
import express from "express";
import http from "http";
import { securityMiddleware } from "./config/arcjet.js";
import { matchesRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Sports API!" });
});

app.use(securityMiddleware());

app.use("/matches", matchesRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);

  console.log(
    `Websocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
