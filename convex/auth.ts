// Convex auth functions — email/password with email verification
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// PBKDF2 with 100k iterations — resistant to brute-force
const PBKDF2_ITERATIONS = 100_000;

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateVerificationCode(): string {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);
  const num =
    (array[0] * 65536 + array[1] * 256 + array[2]) % 900000 + 100000;
  return num.toString();
}

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting: max attempts per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMITS: Record<string, number> = {
  signin: 10,
  signup: 5,
  reset: 5,
  resend: 3,
};

async function checkRateLimit(
  ctx: any,
  action: string,
  identifier: string
): Promise<void> {
  const key = `${action}:${identifier}`;
  const maxAttempts = RATE_LIMITS[action] ?? 10;
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();

  if (existing) {
    if (now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
      // Window expired — reset
      await ctx.db.patch(existing._id, { attempts: 1, windowStart: now });
      return;
    }
    if (existing.attempts >= maxAttempts) {
      throw new Error(
        "Too many attempts. Please wait 15 minutes before trying again."
      );
    }
    await ctx.db.patch(existing._id, { attempts: existing.attempts + 1 });
  } else {
    await ctx.db.insert("rateLimits", { key, attempts: 1, windowStart: now });
  }
}

// ============================================================
// SIGN UP
// ============================================================

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    await checkRateLimit(ctx, "signup", normalizedEmail);

    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if email already exists
    const existing = await ctx.db
      .query("authCredentials")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      throw new Error("An account with this email already exists");
    }

    // Create profile
    const externalId = `local-${Date.now()}-${generateToken().slice(0, 8)}`;
    const profileId = await ctx.db.insert("profiles", {
      externalId,
      email: normalizedEmail,
      displayName: args.displayName.trim(),
      preferencesJson: JSON.stringify({ goals: [], priorities: {} }),
      emailVerified: false,
    });

    // Hash password and store credentials
    const salt = generateSalt();
    const passwordHash = await hashPassword(args.password, salt);

    await ctx.db.insert("authCredentials", {
      email: normalizedEmail,
      passwordHash,
      salt,
      profileId,
    });

    // Create streak
    await ctx.db.insert("userStreaks", {
      externalUserId: externalId,
      currentStreak: 0,
      longestStreak: 0,
    });

    // Generate verification code
    const code = generateVerificationCode();
    await ctx.db.insert("emailVerifications", {
      profileId,
      email: normalizedEmail,
      code,
      expiresAt: Date.now() + VERIFICATION_EXPIRY_MS,
      used: false,
    });

    // Send verification email via Resend
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      to: normalizedEmail,
      displayName: args.displayName.trim(),
      code,
    });

    return {
      profileId,
      externalId,
      email: normalizedEmail,
      displayName: args.displayName.trim(),
      verificationCode: code,
      emailVerified: false,
    };
  },
});

// ============================================================
// SIGN IN
// ============================================================

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    await checkRateLimit(ctx, "signin", normalizedEmail);

    const cred = await ctx.db
      .query("authCredentials")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!cred) {
      throw new Error("No account found with this email");
    }

    const hash = await hashPassword(args.password, cred.salt);
    if (hash !== cred.passwordHash) {
      throw new Error("Incorrect password");
    }

    // Get profile
    const profile = await ctx.db.get(cred.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Block unverified users
    if (!profile.emailVerified) {
      throw new Error(
        "Please verify your email before signing in. Check your inbox for the verification code."
      );
    }

    // Create session
    const token = generateToken();
    await ctx.db.insert("authSessions", {
      profileId: cred.profileId,
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return {
      token,
      user: {
        id: profile.externalId,
        email: profile.email,
        displayName: profile.displayName,
        emailVerified: profile.emailVerified,
      },
    };
  },
});

// ============================================================
// VERIFY EMAIL
// ============================================================

export const verifyEmail = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();

    // Find the profile by email
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!profile) {
      throw new Error("No account found with this email");
    }

    // Find valid verification code
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("code"), args.code),
          q.eq(q.field("used"), false),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (!verification) {
      throw new Error("Invalid or expired verification code");
    }

    // Mark as verified
    await ctx.db.patch(profile._id, { emailVerified: true });
    await ctx.db.patch(verification._id, { used: true });

    return { success: true };
  },
});

// ============================================================
// RESEND VERIFICATION CODE
// ============================================================

export const resendVerification = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    await checkRateLimit(ctx, "resend", normalizedEmail);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!profile) {
      throw new Error("No account found with this email");
    }

    if (profile.emailVerified) {
      throw new Error("Email is already verified");
    }

    const code = generateVerificationCode();
    await ctx.db.insert("emailVerifications", {
      profileId: profile._id,
      email: normalizedEmail,
      code,
      expiresAt: Date.now() + VERIFICATION_EXPIRY_MS,
      used: false,
    });

    // Send verification email via Resend
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      to: normalizedEmail,
      displayName: profile.displayName,
      code,
    });

    return { verificationCode: code };
  },
});

// ============================================================
// VALIDATE SESSION
// ============================================================

export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const profile = await ctx.db.get(session.profileId);
    if (!profile) return null;

    return {
      id: profile.externalId,
      email: profile.email,
      displayName: profile.displayName,
      emailVerified: profile.emailVerified,
    };
  },
});

// ============================================================
// SIGN OUT
// ============================================================

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// ============================================================
// REQUEST PASSWORD RESET
// ============================================================

export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    await checkRateLimit(ctx, "reset", normalizedEmail);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    // Don't reveal whether account exists
    if (!profile) return { sent: true };

    const code = generateVerificationCode();
    await ctx.db.insert("emailVerifications", {
      profileId: profile._id,
      email: normalizedEmail,
      code,
      expiresAt: Date.now() + VERIFICATION_EXPIRY_MS,
      used: false,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendPasswordResetEmail, {
      to: normalizedEmail,
      displayName: profile.displayName,
      code,
    });

    return { sent: true };
  },
});

// ============================================================
// RESET PASSWORD
// ============================================================

export const resetPassword = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const normalizedEmail = args.email.trim().toLowerCase();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!profile) throw new Error("No account found with this email");

    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("code"), args.code),
          q.eq(q.field("used"), false),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (!verification) {
      throw new Error("Invalid or expired reset code");
    }

    // Update password
    const cred = await ctx.db
      .query("authCredentials")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!cred) throw new Error("Credentials not found");

    const salt = generateSalt();
    const passwordHash = await hashPassword(args.newPassword, salt);

    await ctx.db.patch(cred._id, { passwordHash, salt });
    await ctx.db.patch(verification._id, { used: true });

    // Invalidate all existing sessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// ============================================================
// GET PROFILE
// ============================================================

export const getProfile = query({
  args: { externalUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalUserId))
      .first();
  },
});

// ============================================================
// UPDATE PROFILE PREFERENCES
// ============================================================

export const updatePreferences = mutation({
  args: {
    externalUserId: v.string(),
    preferencesJson: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", args.externalUserId)
      )
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      preferencesJson: args.preferencesJson,
    });
  },
});
