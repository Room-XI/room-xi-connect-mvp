import crypto from 'crypto';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';
import { getPublicUrl } from '../utils/publicUrl.js';

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();
const USE_SENDGRID = EMAIL_PROVIDER === 'sendgrid';

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || 'Room XI Connect';

  if (USE_SENDGRID && process.env.SENDGRID_API_KEY) {
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to,
      from: { email: fromEmail!, name: fromName },
      subject,
      html,
    };
    await sgMail.default.send(msg);
    console.log(`[Email] Verification sent via SendGrid to: ${to}`);
  } else {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    const mailOptions = {
      from: { name: fromName, address: fromEmail! },
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Verification sent via Gmail to: ${to}`);
  }
}

export async function sendVerificationEmail(userId: string, email: string): Promise<{ token: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);

  await db.update(users)
    .set({
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    })
    .where(eq(users.id, userId));

  const baseUrl = getPublicUrl();
  const verificationLink = `${baseUrl}/api/auth/verify-email/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .info-box {
          background: #f5f7fa;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          background: #f5f7fa;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e0e0e0;
          border-top: none;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📧 Verify Your Email Address</h1>
      </div>
      
      <div class="content">
        <p>Hello,</p>
        
        <p>Thank you for creating an account with <strong>Room XI Connect</strong>! To complete your registration and get full access to all features, please verify your email address.</p>
        
        <div class="info-box">
          <p><strong>Why verify your email?</strong></p>
          <p>Verifying your email ensures you can recover your account and receive important notifications about your mental health journey.</p>
        </div>
        
        <center>
          <a href="${verificationLink}" class="button">Verify My Email</a>
        </center>
        
        <div class="warning">
          <p><strong>⏱️ This link expires in 24 hours</strong> for security reasons.</p>
          <p>If the link expires, you can request a new verification email from your account settings.</p>
        </div>
        
        <p>If you did not create an account with Room XI Connect, you can safely ignore this email.</p>
        
        <p style="margin-top: 30px;">
          Warm regards,<br>
          <strong>Room XI Connect Team</strong>
        </p>
      </div>
      
      <div class="footer">
        <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>For support, contact: ${process.env.GMAIL_USER}</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - Room XI Connect',
      html,
    });
    console.log('Email verification sent to:', email);
    return { token };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message: string; userId?: string }> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (!user) {
    return { success: false, message: 'Invalid verification token' };
  }

  if (user.emailVerified) {
    return { success: true, message: 'Email already verified', userId: user.id };
  }

  if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
    return { success: false, message: 'Verification token has expired' };
  }

  await db.update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log('Email verified for user:', user.id);
  return { success: true, message: 'Email verified successfully', userId: user.id };
}

export async function resendVerificationEmail(userId: string): Promise<{ success: boolean; message: string }> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.emailVerified) {
    return { success: false, message: 'Email already verified' };
  }

  try {
    await sendVerificationEmail(userId, user.email);
    return { success: true, message: 'Verification email sent' };
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    return { success: false, message: 'Failed to send verification email' };
  }
}
