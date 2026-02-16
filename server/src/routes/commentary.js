import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { MAX_MATCH_QUERY_LIMIT } from "../constants/match.ts";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters.",
      details: queryResult.error.issues,
    });
  }

  const { id: matchId } = paramsResult.data;
  const limit = Math.min(
    queryResult.data.limit || MAX_MATCH_QUERY_LIMIT,
    MAX_MATCH_QUERY_LIMIT,
  );

  try {
    const commentaryEntries = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({ data: commentaryEntries });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch commentary.",
      details: JSON.stringify(error.message),
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid payload.",
      details: parsedBody.error.issues,
    });
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

    return res.status(201).json({ data: commentaryEntry });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create commentary.",
      details: JSON.stringify(error.message),
    });
  }
});
