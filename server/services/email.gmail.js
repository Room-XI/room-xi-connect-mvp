import nodemailer from "nodemailer";
import logger from '../logger.ts';

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendGuardianVerificationEmail({ guardianEmail, youthName, verifyUrl }) {
  if (!guardianEmail || !verifyUrl) {
    throw new Error("guardianEmail and verifyUrl are required");
  }

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Room XI"}" <${process.env.EMAIL_FROM || process.env.GMAIL_USER}>`,
    to: guardianEmail,
    subject: "Please verify consent - Room XI Connect",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Guardian Verification Required</h2>
        <p>Hello,</p>
        <p>${youthName || "Your youth"} has requested access to Room XI Connect, a mental health and wellness platform.</p>
        <p>Please verify your consent by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #4299e1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Consent
          </a>
        </div>
        <p style="color: #718096; font-size: 14px;">
          If you did not expect this email, you can safely ignore it.
        </p>
        <p style="color: #718096; font-size: 14px;">
          This verification link will expire in 7 days.
        </p>
      </div>
    `,
  });
}

export async function verifyEmailConfig() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] WARNING: Gmail credentials not set - email functionality will be disabled');
    return false;
  }
  try {
    await transporter.verify();
    logger.info({ context: 'email-gmail' }, 'Gmail configured successfully');
    return true;
  } catch (err) {
    console.warn('[Email] WARNING: Gmail verification failed -', err.message);
    return false;
  }
}
