import { ConvexReactClient } from "convex/react";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!CONVEX_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL environment variable. Run `npx convex dev` to get your URL."
  );
}

export const convex = new ConvexReactClient(CONVEX_URL);
