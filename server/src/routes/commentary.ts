import { desc, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { MAX_MATCH_QUERY_LIMIT } from "../constants/match.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";
import type { Commentary } from "../db/db.js";

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
    return;
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    res.status(400).json({
      error: "Invalid query parameters.",
      details: queryResult.error.issues,
    });
    return;
  }

  const { id: matchId } = paramsResult.data;
  const limit = Math.min(
    queryResult.data.limit || MAX_MATCH_QUERY_LIMIT,
    MAX_MATCH_QUERY_LIMIT,
  );

  try {
    const commentaryEntries: Commentary[] = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    res.status(200).json({ data: commentaryEntries });
    return;
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch commentary.",
      details: JSON.stringify((error as Error).message),
    });
    return;
  }
});

commentaryRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
    return;
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid payload.",
      details: parsedBody.error.issues,
    });
    return;
  }

  const { id: matchId } = paramsResult.data;

  try {
    const [commentaryEntry] = await db
      .insert(commentary)
      .values({
        matchId,
        ...parsedBody.data,
      })
      .returning();

    try {
      res.app.locals.broadcastCommentary?.(
        commentaryEntry.matchId,
        commentaryEntry,
      );
    } catch (err) {
      console.error("Failed to broadcast match commentary:", err);
    }

    res.status(201).json({ data: commentaryEntry });
    return;
  } catch (error) {
    res.status(500).json({
      error: "Failed to create commentary.",
      details: JSON.stringify((error as Error).message),
    });
    return;
  }
});
