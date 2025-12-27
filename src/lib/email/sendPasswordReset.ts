import { sendEmail } from "./resend";
import { getSiteUrl } from "../siteUrl";

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(email: string, token: string, name?: string | null) {
  const siteUrl = getSiteUrl();
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const subject = "Reset your password - RoMarketCap";
  const text = `Hello${name ? ` ${name}` : ""},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nRoMarketCap`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Hello${name ? ` ${name}` : ""},</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
      <p style="color: #666; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #666; font-size: 12px;">RoMarketCap</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

