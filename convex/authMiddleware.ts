// Server-side auth middleware for Convex functions
// Validates session token and returns the authenticated user's externalId.
// Use this in every mutation/query that touches user data.
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<{ externalUserId: string; profileId: any }> {
  if (!token) {
    throw new Error("Authentication required");
  }

  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session expired. Please sign in again.");
  }

  const profile = await ctx.db.get(session.profileId);
  if (!profile) {
    throw new Error("Profile not found");
  }

  return {
    externalUserId: profile.externalId,
    profileId: profile._id,
  };
}
