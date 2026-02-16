import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
import type { Request, Response, NextFunction } from "express";
import { HTTP_ARCJECT_RULES, WS_ARCJECT_RULES } from "../constants/arcjet.ts";

const arcjetKey: string | undefined = process.env.ARCJET_KEY;
const arcjetMode: "LIVE" | "DRY_RUN" =
  process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: HTTP_ARCJECT_RULES.INTERVAL,
          max: HTTP_ARCJECT_RULES.MAX,
        }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: WS_ARCJECT_RULES.INTERVAL,
          max: WS_ARCJECT_RULES.MAX,
        }),
      ],
    })
  : null;

export function securityMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!httpArcjet) {
      next();
      return;
    }

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          res.status(429).json({ error: "Too many requests" });
          return;
        }

        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } catch (error: unknown) {
      console.error("Arcjet middleware error:", error);
      res.status(503).json({ error: "Service Unavailable" });
      return;
    }

    next();
  };
}
