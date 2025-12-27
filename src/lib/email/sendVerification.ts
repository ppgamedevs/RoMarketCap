import { sendEmail } from "./resend";
import { getSiteUrl } from "../siteUrl";

/**
 * Send email verification email to user
 */
export async function sendVerificationEmail(email: string, token: string, name?: string | null) {
  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const subject = "Verify your email - RoMarketCap";
  const text = `Hello${name ? ` ${name}` : ""},\n\nPlease verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, you can safely ignore this email.\n\nRoMarketCap`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Hello${name ? ` ${name}` : ""},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      <p style="color: #666; font-size: 14px;">If you did not create an account, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #666; font-size: 12px;">RoMarketCap</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

