import { desc, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { MAX_MATCH_QUERY_LIMIT } from "../constants/match.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  updateScoreSchema,
} from "../validation/matches.js";
import type { Match } from "../db/db.js";

export const matchesRouter = Router();

matchesRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query.",
      details: parsed.error.issues,
    });
    return;
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_MATCH_QUERY_LIMIT);

  try {
    const data: Match[] = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.status(200).json({ data });
    return;
  } catch (error) {
    res.status(500).json({
      error: "Failed to list matches.",
      details: JSON.stringify((error as Error).message),
    });
    return;
  }
});

matchesRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid payload.",
      details: parsed.error.issues,
    });
    return;
  }

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  try {
    // getMatchStatus can return null for invalid dates, but Zod validation prevents that
    const status = getMatchStatus(startTime, endTime) ?? "scheduled";

    const [match] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status,
      })
      .returning();

    try {
      res.app.locals.broadcastMatchCreated?.(match);
    } catch (err) {
      console.error("Failed to broadcast match creation:", err);
    }

    res.status(201).json({ data: match });
    return;
  } catch (error) {
    res.status(500).json({
      error: "Failed to create match.",
      details: JSON.stringify((error as Error).message),
    });
    return;
  }
});

matchesRouter.patch("/:id/score", async (req: Request, res: Response): Promise<void> => {
  // Validate match ID parameter
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    res.status(400).json({
      error: "Invalid match ID.",
      details: paramsParsed.error.issues,
    });
    return;
  }

  // Validate request body
  const bodyParsed = updateScoreSchema.safeParse(req.body);

  if (!bodyParsed.success) {
    res.status(400).json({
      error: "Invalid score update.",
      details: bodyParsed.error.issues,
    });
    return;
  }

  const { id } = paramsParsed.data;
  const { homeScore, awayScore } = bodyParsed.data;

  try {
    const [updated] = await db
      .update(matches)
      .set({ homeScore, awayScore })
      .where(eq(matches.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    res.status(200).json({ data: updated });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update score" });
    return;
  }
});
