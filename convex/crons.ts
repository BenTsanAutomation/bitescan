import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup expired sessions",
  { hours: 6 },
  internal.cleanup.purgeExpiredSessions
);
crons.interval(
  "cleanup expired verifications",
  { hours: 24 },
  internal.cleanup.purgeExpiredVerifications
);
crons.interval(
  "cleanup stale rate limits",
  { hours: 1 },
  internal.cleanup.purgeStaleRateLimits
);

export default crons;
