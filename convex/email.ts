// Convex actions for sending emails via Resend
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const FROM_EMAIL = () =>
  process.env.RESEND_FROM_EMAIL || "BiteScan <onboarding@resend.dev>";

export const sendVerificationEmail = internalAction({
  args: {
    to: v.string(),
    displayName: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not set");
      return { success: false, error: "Email service not configured" };
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🍃</span>
          <h1 style="color: #16a34a; margin: 8px 0 4px; font-size: 28px;">BiteScan</h1>
          <p style="color: #6b7280; margin: 0;">Your AI nutrition companion</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Verify your email</h2>
          <p style="color: #374151;">Hi ${args.displayName},</p>
          <p style="color: #374151;">Thanks for signing up for BiteScan! Enter this code in the app to verify your email:</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="background: #16a34a; color: white; padding: 16px 32px; border-radius: 12px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
              ${args.code}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours.</p>
          <p style="color: #9ca3af; font-size: 13px;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        // TODO: Replace onboarding@resend.dev with your verified domain
        // (e.g. noreply@bitescan.app). The Resend test domain only delivers
        // to the account owner's email address.
        body: JSON.stringify({
          from: FROM_EMAIL(),
          to: [args.to],
          subject: `${args.code} is your BiteScan verification code`,
          html,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Resend API error:", err);
        return { success: false, error: err };
      }

      const data = await response.json();
      console.log("Verification email sent:", data.id);
      return { success: true, id: data.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const sendPasswordResetEmail = internalAction({
  args: {
    to: v.string(),
    displayName: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not set");
      return { success: false, error: "Email service not configured" };
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🍃</span>
          <h1 style="color: #16a34a; margin: 8px 0 4px; font-size: 28px;">BiteScan</h1>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Reset your password</h2>
          <p style="color: #374151;">Hi ${args.displayName},</p>
          <p style="color: #374151;">Enter this code in the app to reset your password:</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="background: #ef4444; color: white; padding: 16px 32px; border-radius: 12px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
              ${args.code}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours.</p>
          <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL(),
          to: [args.to],
          subject: `${args.code} — Reset your BiteScan password`,
          html,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Resend API error:", err);
        return { success: false, error: err };
      }

      const data = await response.json();
      console.log("Password reset email sent:", data.id);
      return { success: true, id: data.id };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: String(error) };
    }
  },
});
