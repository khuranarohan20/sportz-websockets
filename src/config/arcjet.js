import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
import { HTTP_ARCJECT_RULES, WS_ARCJECT_RULES } from "../constants/acrjet.js";

const arcjetKey = process.env.ARCJET_KEY;
const arcjectMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) throw new Error("ARCJET_KEY env variable is missing");

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjectMode }),
        detectBot({
          mode: arcjectMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjectMode,
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
        shield({ mode: arcjectMode }),
        detectBot({
          mode: arcjectMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjectMode,
          interval: WS_ARCJECT_RULES.INTERVAL,
          max: WS_ARCJECT_RULES.MAX,
        }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) return next();
    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too many requests" });
        }

        return res.status(403).json({ error: "Forbidden" });
      }
    } catch (error) {
      console.error("Arcjet middleware error:", error);
      return res.status(503).json({ error: "Service Unavailable" });
    }

    next();
  };
}
