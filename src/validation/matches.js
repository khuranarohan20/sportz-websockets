import { z } from "zod";

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const isoDateString = z.iso.datetime();

export const createMatchSchema = z
  .object({
    sport: z.string().min(1),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((data) => !isNaN(Date.parse(data.startTime)), {
    message: "startTime must be a valid ISO date string",
    path: ["startTime"],
  })
  .refine((data) => !isNaN(Date.parse(data.endTime)), {
    message: "endTime must be a valid ISO date string",
    path: ["endTime"],
  })
  .superRefine((data, ctx) => {
    const startDate = Date.parse(data.startTime);
    const endDate = Date.parse(data.endTime);

    if (!isNaN(startDate) && !isNaN(endDate) && endDate <= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endTime must be chronologically after startTime",
        path: ["endTime"],
      });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
