import { NextFunction, Request, Response } from "express";

interface Options {
  windowMs: number; // e.g., 15 * 60 * 1000
  max: number; // e.g., 5
  key?: (req: Request) => string; // override keying function
}

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export function rateLimit(options: Options) {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyFn = options.key ?? ((req: Request) => `${req.ip}:login`);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now >= entry.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res
        .status(429)
        .json({ error: "Too many requests. Try again later." });
    }

    entry.count += 1;
    return next();
  };
}
