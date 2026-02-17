import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./authMiddleware";

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    return await ctx.storage.getUrl(args.storageId);
  },
});
