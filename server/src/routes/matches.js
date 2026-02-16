import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { MAX_MATCH_QUERY_LIMIT } from "../constants/match.ts";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.ts";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";

export const matchesRouter = Router();

matchesRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query.",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_MATCH_QUERY_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    return res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({
      error: "Failed to list matches.",
      details: JSON.stringify(error.message),
    });
  }
});

matchesRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload.",
      details: parsed.error.issues,
    });
  }

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  try {
    const [match] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    try {
      res.app.locals.broadcastMatchCreated?.(match);
    } catch (err) {
      console.error("Failed to broadcast match creation:", err);
    }

    return res.status(201).json({ data: match });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create match.",
      details: JSON.stringify(error.message),
    });
  }
});

matchesRouter.patch("/:id/score", async (req, res) => {
  const matchId = Number(req.params.id);

  if (!Number.isInteger(matchId)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }

  const { homeScore, awayScore } = req.body;

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return res
      .status(400)
      .json({ error: "homeScore and awayScore must be integers" });
  }

  try {
    const [updated] = await db
      .update(matches)
      .set({ homeScore, awayScore })
      .where(eq(matches.id, matchId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.status(200).json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update score" });
  }
});
