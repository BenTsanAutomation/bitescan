import { internalMutation } from "./_generated/server";

const STALE_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

export const purgeExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db.query("authSessions").collect();
    let deleted = 0;

    for (const session of sessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
        deleted += 1;
      }
    }

    return { deleted };
  },
});

export const purgeExpiredVerifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const verifications = await ctx.db.query("emailVerifications").collect();
    let deleted = 0;

    for (const verification of verifications) {
      if (verification.expiresAt < now || verification.used) {
        await ctx.db.delete(verification._id);
        deleted += 1;
      }
    }

    return { deleted };
  },
});

export const purgeStaleRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rateLimits = await ctx.db.query("rateLimits").collect();
    let deleted = 0;

    for (const row of rateLimits) {
      if (now - row.windowStart > STALE_RATE_LIMIT_MS) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }

    return { deleted };
  },
});
