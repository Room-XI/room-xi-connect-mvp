import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import logger from '../logger.ts';

// Email provider configuration
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();
const USE_SENDGRID = EMAIL_PROVIDER === 'sendgrid';

/**
 * Mask email address for safe logging (PII protection)
 * e.g., "john.doe@example.com" -> "j***e@e***.com"
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[no-email]';
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';
  
  const maskedLocal = local.length > 2 
    ? local[0] + '***' + local[local.length - 1]
    : '***';
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? domainParts[0][0] + '***.' + domainParts[domainParts.length - 1]
    : '***';
  
  return `${maskedLocal}@${maskedDomain}`;
}

// Configure SendGrid if using it
if (USE_SENDGRID && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  logger.info('[Email] Using SendGrid provider');
  logger.info('[Email] SendGrid configured successfully');
} else {
  logger.info('[Email] Using Gmail SMTP provider');
}

// Gmail SMTP transporter configuration (used as fallback)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send email using the configured provider (SendGrid or Gmail)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 */
export async function sendEmail({ to, subject, html }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || 'Room XI Connect';

  if (!process.env.GMAIL_USER && !process.env.GMAIL_APP_PASSWORD && !(USE_SENDGRID && process.env.SENDGRID_API_KEY)) {
    logger.info({ to: maskEmail(to), subject, context: 'email-console-fallback' }, 'Email would be sent (console mode)');
    logger.info({ bodyLength: html ? html.length : 0 }, 'Email body logged in console mode');
    return { success: true, consoleMode: true };
  }

  if (USE_SENDGRID && process.env.SENDGRID_API_KEY) {
    const msg = {
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      html,
    };
    await sgMail.send(msg);
    logger.info({ provider: 'sendgrid', recipient: maskEmail(to) }, '[Email] Email sent successfully');
  } else {
    const mailOptions = {
      from: { name: fromName, address: fromEmail },
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
    logger.info({ provider: 'gmail', recipient: maskEmail(to) }, '[Email] Email sent successfully');
  }
}

/**
 * Send guardian verification email
 * @param {Object} options - Email options
 * @param {string} options.guardianEmail - Guardian's email address
 * @param {string} options.youthName - Youth's name
 * @param {string} options.verificationLink - Full verification URL
 * @returns {Promise<Object>} - Nodemailer send result
 */
export async function sendGuardianVerificationEmail({ guardianEmail, youthName, verificationLink }) {
  const mailOptions = {
    from: {
      name: 'Room XI Connect',
      address: process.env.GMAIL_USER,
    },
    to: guardianEmail,
    subject: 'Guardian Verification Required - Room XI Connect',
    html: `
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
          <h1>🛡️ Guardian Verification Required</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          
          <p><strong>${youthName}</strong> has created an account on <strong>Room XI Connect</strong>, a youth mental health and wellness platform for ages 13-25.</p>
          
          <div class="info-box">
            <p><strong>Why are we contacting you?</strong></p>
            <p>Alberta's Personal Information Protection Act (PIPA) requires guardian consent for youth under 16 using health-related platforms. We need you to verify and approve ${youthName}'s account.</p>
          </div>
          
          <p><strong>What is Room XI Connect?</strong></p>
          <ul>
            <li>Daily mood tracking and wellness check-ins</li>
            <li>Access to local mental health programs and resources</li>
            <li>AI companion for support and reflection</li>
            <li>Crisis support resources</li>
          </ul>
          
          <p><strong>Your Action Required:</strong></p>
          <ol>
            <li>Click the button below to review ${youthName}'s account request</li>
            <li>Create a secure 6-digit PIN</li>
            <li>Review the consent summary</li>
            <li>Approve or decline the request</li>
          </ol>
          
          <center style="margin: 20px 0;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verificationLink}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="16%" strokecolor="#667eea" fillcolor="#667eea">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Verify Guardian Consent</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td align="center" bgcolor="#667eea" style="border-radius: 6px;">
                  <a href="${verificationLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify Guardian Consent</a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </center>
          
          <p style="font-size: 12px; color: #666; margin-top: 10px; word-break: break-all;">
            <strong>If the button doesn't work, copy and paste this link:</strong><br>
            <a href="${verificationLink}" style="color: #667eea;">${verificationLink}</a>
          </p>
          
          <div class="warning">
            <p><strong>⏱️ This link expires in 30 minutes</strong> for security reasons.</p>
            <p>If the link expires, ${youthName} can request a new verification email from their account settings.</p>
          </div>
          
          <p><strong>Privacy & Data Protection:</strong></p>
          <ul>
            <li>All data is stored in Canada (PIPA and FOIP compliant)</li>
            <li>No personal information is sold or shared with third parties</li>
            <li>You can review and delete ${youthName}'s data at any time</li>
            <li>End-to-end encryption for sensitive information</li>
          </ul>
          
          <p>If you did not expect this email or have questions, please contact us at <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a>.</p>
          
          <p>Thank you for supporting ${youthName}'s mental health journey.</p>
          
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
    `,
    text: `
Guardian Verification Required - Room XI Connect

Hello,

${youthName} has created an account on Room XI Connect, a youth mental health and wellness platform for ages 13-25.

Why are we contacting you?
Alberta's Personal Information Protection Act (PIPA) requires guardian consent for youth under 16 using health-related platforms. We need you to verify and approve ${youthName}'s account.

What is Room XI Connect?
- Daily mood tracking and wellness check-ins
- Access to local mental health programs and resources
- AI companion for support and reflection
- Crisis support resources

Your Action Required:
1. Click the link below to review ${youthName}'s account request
2. Create a secure 6-digit PIN
3. Review the consent summary
4. Approve or decline the request

Verification Link: ${verificationLink}

⏱️ This link expires in 30 minutes for security reasons.
If the link expires, ${youthName} can request a new verification email from their account settings.

Privacy & Data Protection:
- All data is stored in Canada (PIPA and FOIP compliant)
- No personal information is sold or shared with third parties
- You can review and delete ${youthName}'s data at any time
- End-to-end encryption for sensitive information

If you did not expect this email or have questions, please contact us at ${process.env.GMAIL_USER}.

Thank you for supporting ${youthName}'s mental health journey.

Warm regards,
Room XI Connect Team

---
Room XI Connect - Youth Mental Health & Wellness Platform
This is an automated message. Please do not reply directly to this email.
For support, contact: ${process.env.GMAIL_USER}
    `,
  };

  try {
    await sendEmail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ type: 'guardian_verification', recipient: maskEmail(guardianEmail) }, 'Guardian verification email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'guardian_verification' }, 'Failed to send guardian verification email');
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send initial consent email with link to view full consent notice
 * Part of the two-step "Email Plus" consent flow for PIPA/PIPEDA compliance
 * 
 * @param {Object} options - Email options
 * @param {string} options.guardianEmail - Guardian's email address
 * @param {string} options.guardianName - Guardian's name
 * @param {string} options.youthName - Youth's name
 * @param {string} options.consentLink - Full URL to consent viewing page
 * @returns {Promise<Object>} - Nodemailer send result
 */
export async function sendInitialConsentEmail({ guardianEmail, guardianName, youthName, consentLink }) {
  const mailOptions = {
    from: {
      name: 'Room XI Connect',
      address: process.env.GMAIL_USER,
    },
    to: guardianEmail,
    subject: `Consent Required for ${youthName} - Room XI Connect`,
    html: `
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
          .header h1 { margin: 0; font-size: 24px; }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
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
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Parent/Guardian Consent Required</h1>
        </div>
        
        <div class="content">
          <p>Hello${guardianName ? ` ${guardianName}` : ''},</p>
          
          <p><strong>${youthName}</strong> has registered for <strong>Room XI Connect</strong>, a youth mental health and wellness platform for ages 13-25 in Edmonton.</p>
          
          <div class="info-box">
            <p><strong>Why do we need your consent?</strong></p>
            <p>Under Alberta's Personal Information Protection Act (PIPA) and Canada's PIPEDA, parental consent is required for youth under 16 to use platforms that collect health-related information.</p>
          </div>
          
          <p><strong>What happens next?</strong></p>
          <ol>
            <li><strong>Step 1:</strong> Click the button below to review our consent form</li>
            <li><strong>Step 2:</strong> Read what information we collect and your rights</li>
            <li><strong>Step 3:</strong> If you agree, submit the consent form</li>
            <li><strong>Step 4:</strong> You'll receive a final confirmation email to verify</li>
          </ol>
          
          <center style="margin: 30px 0;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${consentLink}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="16%" strokecolor="#667eea" fillcolor="#667eea">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Review Consent Form</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td align="center" bgcolor="#667eea" style="border-radius: 8px;">
                  <a href="${consentLink}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Review Consent Form</a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </center>
          
          <p style="font-size: 12px; color: #666; margin-top: 15px; word-break: break-all;">
            <strong>If the button doesn't work, copy and paste this link:</strong><br>
            <a href="${consentLink}" style="color: #667eea;">${consentLink}</a>
          </p>
          
          <div class="warning">
            <p><strong>This link expires in 24 hours</strong> for security reasons.</p>
            <p>If it expires, ${youthName} can request a new link from their account.</p>
          </div>
          
          <p>If you did not expect this email or have questions, please contact us at ${process.env.GMAIL_USER}.</p>
          
          <p style="margin-top: 30px;">
            Thank you,<br>
            <strong>Room XI Connect Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
          <p>Edmonton, Alberta, Canada</p>
        </div>
      </body>
      </html>
    `,
    text: `
Parent/Guardian Consent Required - Room XI Connect

Hello${guardianName ? ` ${guardianName}` : ''},

${youthName} has registered for Room XI Connect, a youth mental health and wellness platform for ages 13-25 in Edmonton.

Why do we need your consent?
Under Alberta's Personal Information Protection Act (PIPA) and Canada's PIPEDA, parental consent is required for youth under 16 to use platforms that collect health-related information.

What happens next?
1. Click the link below to review our consent form
2. Read what information we collect and your rights
3. If you agree, submit the consent form
4. You'll receive a final confirmation email to verify

Review Consent Form: ${consentLink}

This link expires in 24 hours for security reasons.

If you did not expect this email or have questions, please contact us at ${process.env.GMAIL_USER}.

Thank you,
Room XI Connect Team
    `,
  };

  try {
    await sendEmail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ type: 'initial_consent', recipient: maskEmail(guardianEmail) }, 'Initial consent email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'initial_consent' }, 'Failed to send initial consent email');
    throw new Error('Failed to send consent email');
  }
}

/**
 * Send confirmation email after parent has agreed to consent
 * This is the second step of the two-step "Email Plus" flow
 * 
 * @param {Object} options - Email options
 * @param {string} options.guardianEmail - Guardian's email address
 * @param {string} options.youthName - Youth's name
 * @param {string} options.confirmationLink - Full URL to confirm consent
 * @returns {Promise<Object>} - Nodemailer send result
 */
export async function sendConfirmationEmail({ guardianEmail, youthName, confirmationLink }) {
  const mailOptions = {
    from: {
      name: 'Room XI Connect',
      address: process.env.GMAIL_USER,
    },
    to: guardianEmail,
    subject: `Confirm Your Consent for ${youthName} - Room XI Connect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .header h1 { margin: 0; font-size: 24px; }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
          }
          .info-box {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Almost Done! Confirm Your Consent</h1>
        </div>
        
        <div class="content">
          <p>Thank you for reviewing and agreeing to the consent form for <strong>${youthName}</strong>.</p>
          
          <div class="info-box">
            <p><strong>One final step:</strong> Please click the button below to confirm your consent.</p>
            <p>This two-step verification helps ensure the consent was provided by you.</p>
          </div>
          
          <center style="margin: 30px 0;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${confirmationLink}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="16%" strokecolor="#22c55e" fillcolor="#22c55e">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Confirm My Consent</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td align="center" bgcolor="#22c55e" style="border-radius: 8px;">
                  <a href="${confirmationLink}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Confirm My Consent</a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </center>
          
          <p style="font-size: 12px; color: #666; margin-top: 15px; word-break: break-all;">
            <strong>If the button doesn't work, copy and paste this link:</strong><br>
            <a href="${confirmationLink}" style="color: #22c55e;">${confirmationLink}</a>
          </p>
          
          <p>Once confirmed:</p>
          <ul>
            <li>${youthName}'s Room XI Connect account will be fully activated</li>
            <li>You'll receive a confirmation email for your records</li>
            <li>You can manage or withdraw consent at any time</li>
          </ul>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link expires in 24 hours. If you did not request this, please ignore this email.
          </p>
          
          <p style="margin-top: 20px;">
            Thank you,<br>
            <strong>Room XI Connect Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
          <p>Edmonton, Alberta, Canada</p>
        </div>
      </body>
      </html>
    `,
    text: `
Almost Done! Confirm Your Consent - Room XI Connect

Thank you for reviewing and agreeing to the consent form for ${youthName}.

One final step: Please click the link below to confirm your consent.
This two-step verification helps ensure the consent was provided by you.

Confirm My Consent: ${confirmationLink}

Once confirmed:
- ${youthName}'s Room XI Connect account will be fully activated
- You'll receive a confirmation email for your records
- You can manage or withdraw consent at any time

This link expires in 24 hours. If you did not request this, please ignore this email.

Thank you,
Room XI Connect Team
    `,
  };

  try {
    await sendEmail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ type: 'confirmation', recipient: maskEmail(guardianEmail) }, 'Confirmation email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'confirmation' }, 'Failed to send confirmation email');
    throw new Error('Failed to send confirmation email');
  }
}

/**
 * Send final consent completion email to guardian
 * 
 * @param {Object} options - Email options
 * @param {string} options.guardianEmail - Guardian's email address
 * @param {string} options.youthName - Youth's name
 * @param {string} options.consentDate - Date consent was confirmed
 * @returns {Promise<Object>} - Nodemailer send result
 */
export async function sendConsentCompleteEmail({ guardianEmail, youthName, consentDate }) {
  const mailOptions = {
    from: {
      name: 'Room XI Connect',
      address: process.env.GMAIL_USER,
    },
    to: guardianEmail,
    subject: `Consent Confirmed for ${youthName} - Room XI Connect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .header h1 { margin: 0; font-size: 24px; }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .info-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Consent Confirmed</h1>
        </div>
        
        <div class="content">
          <p>Your consent for <strong>${youthName}</strong> to use Room XI Connect has been confirmed.</p>
          
          <div class="info-box">
            <p><strong>Consent Details:</strong></p>
            <ul>
              <li>Youth: ${youthName}</li>
              <li>Platform: Room XI Connect</li>
              <li>Date Confirmed: ${consentDate}</li>
              <li>Status: Active</li>
            </ul>
          </div>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>${youthName}'s account is now fully active</li>
            <li>They can access all features of Room XI Connect</li>
            <li>You can contact us anytime to review or withdraw consent</li>
          </ul>
          
          <p><strong>Your Rights:</strong></p>
          <ul>
            <li>Request a copy of ${youthName}'s data at any time</li>
            <li>Request corrections to inaccurate information</li>
            <li>Withdraw consent (which will deactivate the account)</li>
            <li>Request deletion of all data</li>
          </ul>
          
          <p>Please save this email for your records.</p>
          
          <p style="margin-top: 30px;">
            Thank you for supporting ${youthName}'s wellness journey,<br>
            <strong>Room XI Connect Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
          <p>For support: ${process.env.GMAIL_USER}</p>
        </div>
      </body>
      </html>
    `,
    text: `
Consent Confirmed - Room XI Connect

Your consent for ${youthName} to use Room XI Connect has been confirmed.

Consent Details:
- Youth: ${youthName}
- Platform: Room XI Connect
- Date Confirmed: ${consentDate}
- Status: Active

What's Next?
- ${youthName}'s account is now fully active
- They can access all features of Room XI Connect
- You can contact us anytime to review or withdraw consent

Your Rights:
- Request a copy of ${youthName}'s data at any time
- Request corrections to inaccurate information
- Withdraw consent (which will deactivate the account)
- Request deletion of all data

Please save this email for your records.

Thank you for supporting ${youthName}'s wellness journey,
Room XI Connect Team

For support: ${process.env.GMAIL_USER}
    `,
  };

  try {
    await sendEmail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ type: 'consent_complete', recipient: maskEmail(guardianEmail) }, 'Consent complete email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'consent_complete' }, 'Failed to send consent complete email');
    throw new Error('Failed to send consent complete email');
  }
}

/**
 * Send staff notification email when parent withdraws consent
 * This notifies Room XI staff so they can follow up appropriately
 * 
 * @param {Object} options - Email options
 * @param {string} options.youthName - Youth's name
 * @param {string} options.youthEmail - Youth's email
 * @param {string} options.parentEmail - Parent's email who withdrew consent
 * @param {string} options.withdrawalTimestamp - When the withdrawal occurred
 * @param {string} options.youthId - Youth's user ID for reference
 * @returns {Promise<Object>} - Nodemailer send result
 */
export async function sendConsentWithdrawalStaffNotification({ 
  youthName, 
  youthEmail, 
  parentEmail, 
  withdrawalTimestamp,
  youthId 
}) {
  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || process.env.GMAIL_USER;
  
  const mailOptions = {
    from: {
      name: 'Room XI Connect System',
      address: process.env.GMAIL_USER,
    },
    to: staffEmail,
    subject: `[STAFF ALERT] Guardian Consent Withdrawn - ${youthName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .header h1 { margin: 0; font-size: 24px; }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .alert-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .info-table th, .info-table td {
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-table th {
            background: #f5f7fa;
            font-weight: 600;
            width: 40%;
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Guardian Consent Withdrawn</h1>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <p><strong>Action Required:</strong> A guardian has withdrawn consent for a youth user. The youth will be prompted to complete a Mature Minor Assessment on their next login.</p>
          </div>
          
          <h3>Withdrawal Details</h3>
          <table class="info-table">
            <tr>
              <th>Youth Name</th>
              <td>${youthName}</td>
            </tr>
            <tr>
              <th>Youth Email</th>
              <td>${youthEmail}</td>
            </tr>
            <tr>
              <th>Youth ID</th>
              <td>${youthId}</td>
            </tr>
            <tr>
              <th>Parent Email</th>
              <td>${parentEmail}</td>
            </tr>
            <tr>
              <th>Withdrawal Time</th>
              <td>${withdrawalTimestamp}</td>
            </tr>
          </table>
          
          <h3>What Happens Next</h3>
          <ul>
            <li><strong>Youth Access:</strong> The youth retains access to the app for program discovery and crisis resources</li>
            <li><strong>Parent Portal:</strong> Disabled - parent can no longer view youth data</li>
            <li><strong>Third-Party Sharing:</strong> Stopped - no more data sharing with partner programs</li>
            <li><strong>Mature Minor Assessment:</strong> Youth will be prompted to complete an assessment on next login</li>
          </ul>
          
          <h3>Recommended Actions</h3>
          <ol>
            <li>Review the youth's account for any ongoing program enrollments</li>
            <li>Check if any partner organizations need to be notified</li>
            <li>Monitor the youth's mature minor assessment completion</li>
            <li>Consider reaching out if appropriate based on context</li>
          </ol>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated notification. The consent withdrawal has been logged in the consent audit trail for compliance purposes.
          </p>
        </div>
        
        <div class="footer">
          <p>Room XI Connect - Staff Notification System</p>
          <p>This email contains confidential information. Handle according to privacy policies.</p>
        </div>
      </body>
      </html>
    `,
    text: `
[STAFF ALERT] Guardian Consent Withdrawn

Action Required: A guardian has withdrawn consent for a youth user.

WITHDRAWAL DETAILS:
- Youth Name: ${youthName}
- Youth Email: ${youthEmail}
- Youth ID: ${youthId}
- Parent Email: ${parentEmail}
- Withdrawal Time: ${withdrawalTimestamp}

WHAT HAPPENS NEXT:
- Youth Access: The youth retains access to the app for program discovery and crisis resources
- Parent Portal: Disabled - parent can no longer view youth data
- Third-Party Sharing: Stopped - no more data sharing with partner programs
- Mature Minor Assessment: Youth will be prompted to complete an assessment on next login

RECOMMENDED ACTIONS:
1. Review the youth's account for any ongoing program enrollments
2. Check if any partner organizations need to be notified
3. Monitor the youth's mature minor assessment completion
4. Consider reaching out if appropriate based on context

This is an automated notification. The consent withdrawal has been logged in the consent audit trail for compliance purposes.

---
Room XI Connect - Staff Notification System
This email contains confidential information. Handle according to privacy policies.
    `,
  };

  try {
    await sendEmail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ type: 'staff_notification', recipient: maskEmail(staffEmail) }, 'Staff notification email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'staff_notification' }, 'Failed to send staff notification email');
    throw new Error('Failed to send staff notification email');
  }
}

/**
 * Send password reset email
 * @param {Object} options - Email options
 * @param {string} options.email - User's email address
 * @param {string} options.resetLink - Full password reset URL with token
 * @returns {Promise<Object>} - Send result
 */
export async function sendPasswordResetEmail({ email, resetLink }) {
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
        .header h1 { margin: 0; font-size: 24px; }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
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
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Password Reset Request</h1>
      </div>
      
      <div class="content">
        <p>Hello,</p>
        
        <p>We received a request to reset your password for your <strong>Room XI Connect</strong> account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <center style="margin: 20px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetLink}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="16%" strokecolor="#667eea" fillcolor="#667eea">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Reset Password</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#667eea" style="border-radius: 6px;">
                <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a>
              </td>
            </tr>
          </table>
          <!--<![endif]-->
        </center>
        
        <p style="font-size: 12px; color: #666; margin-top: 10px; word-break: break-all;">
          <strong>If the button doesn't work, copy and paste this link:</strong><br>
          <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
        </p>
        
        <div class="warning">
          <p><strong>This link expires in 24 hours</strong> for security reasons.</p>
          <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        
        <p style="margin-top: 30px;">
          Stay safe,<br>
          <strong>Room XI Connect Team</strong>
        </p>
      </div>
      
      <div class="footer">
        <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset Request - Room XI Connect',
      html,
    });
    logger.info({ type: 'password_reset', recipient: maskEmail(email) }, 'Password reset email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'password_reset' }, 'Failed to send password reset email');
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send parent password setup email after consent is confirmed
 * 
 * @param {Object} options - Email options
 * @param {string} options.guardianEmail - Guardian's email address
 * @param {string} options.guardianName - Guardian's name
 * @param {string} options.youthName - Youth's name
 * @param {string} options.passwordSetupLink - Full URL to set password
 * @returns {Promise<Object>} - Send result
 */
export async function sendParentPasswordSetupEmail({ guardianEmail, guardianName, youthName, passwordSetupLink }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #5FA8A3 0%, #2C4A3E 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 { margin: 0; font-size: 24px; }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .info-box {
          background: #E8F5F3;
          border-left: 4px solid #5FA8A3;
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
          background: #FFF5F5;
          border-left: 4px solid #E67E73;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Set Up Your Parent Portal Access</h1>
      </div>
      
      <div class="content">
        <p>Hello${guardianName ? ` ${guardianName}` : ''},</p>
        
        <p>Thank you for confirming your consent for <strong>${youthName}</strong> to use Room XI Connect.</p>
        
        <div class="info-box">
          <p><strong>Your Parent Portal is Ready!</strong></p>
          <p>As a guardian, you have access to a dedicated parent portal where you can:</p>
          <ul>
            <li>View ${youthName}'s wellness summary (based on their privacy settings)</li>
            <li>Manage consent preferences</li>
            <li>Access crisis support resources</li>
            <li>Export or delete data if needed</li>
          </ul>
        </div>
        
        <p>Click the button below to create your password and access your portal:</p>
        
        <center style="margin: 25px 0;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#5FA8A3" style="border-radius: 8px;">
                <a href="${passwordSetupLink}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Set Up My Password</a>
              </td>
            </tr>
          </table>
        </center>
        
        <p style="font-size: 12px; color: #666; margin-top: 15px; word-break: break-all;">
          <strong>If the button doesn't work, copy and paste this link:</strong><br>
          <a href="${passwordSetupLink}" style="color: #5FA8A3;">${passwordSetupLink}</a>
        </p>
        
        <div class="warning">
          <p><strong>This link expires in 7 days</strong> for security reasons.</p>
          <p>If it expires, you can request a new one by visiting the parent portal login page.</p>
        </div>
        
        <p style="margin-top: 30px;">
          Welcome to Room XI Connect,<br>
          <strong>Room XI Connect Team</strong>
        </p>
      </div>
      
      <div class="footer">
        <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
        <p>Edmonton, Alberta, Canada</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: guardianEmail,
      subject: `Set Up Your Parent Portal Password - Room XI Connect`,
      html,
    });
    logger.info({ type: 'parent_password_setup', recipient: maskEmail(guardianEmail) }, 'Parent password setup email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'parent_password_setup' }, 'Failed to send parent password setup email');
    throw new Error('Failed to send parent password setup email');
  }
}

/**
 * Send parent password reset email
 * 
 * @param {Object} options - Email options
 * @param {string} options.email - Parent's email address
 * @param {string} options.resetLink - Full URL to reset password
 * @returns {Promise<Object>} - Send result
 */
export async function sendParentPasswordResetEmail({ email, resetLink }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #5FA8A3 0%, #2C4A3E 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 { margin: 0; font-size: 24px; }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
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
          background: #FFF5F5;
          border-left: 4px solid #E67E73;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Parent Portal Password Reset</h1>
      </div>
      
      <div class="content">
        <p>Hello,</p>
        
        <p>We received a request to reset your password for your <strong>Room XI Connect Parent Portal</strong> account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <center style="margin: 25px 0;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#5FA8A3" style="border-radius: 8px;">
                <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Reset My Password</a>
              </td>
            </tr>
          </table>
        </center>
        
        <p style="font-size: 12px; color: #666; margin-top: 15px; word-break: break-all;">
          <strong>If the button doesn't work, copy and paste this link:</strong><br>
          <a href="${resetLink}" style="color: #5FA8A3;">${resetLink}</a>
        </p>
        
        <div class="warning">
          <p><strong>This link expires in 24 hours</strong> for security reasons.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
        </div>
        
        <p style="margin-top: 30px;">
          Stay safe,<br>
          <strong>Room XI Connect Team</strong>
        </p>
      </div>
      
      <div class="footer">
        <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: email,
      subject: 'Parent Portal Password Reset - Room XI Connect',
      html,
    });
    logger.info({ type: 'parent_password_reset', recipient: maskEmail(email) }, 'Parent password reset email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'parent_password_reset' }, 'Failed to send parent password reset email');
    throw new Error('Failed to send parent password reset email');
  }
}

export async function sendParentMagicLinkEmail({ email, magicLink }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .footer { background: #f5f7fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; text-align: center; font-size: 12px; color: #666; }
        .warning { background: #FFF5F5; border-left: 4px solid #E67E73; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Parent Portal Sign In</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>You requested a sign-in link for your <strong>Room XI Connect Parent Portal</strong> account.</p>
        <p>Click the button below to sign in:</p>
        <center style="margin: 25px 0;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#e11d48" style="border-radius: 8px;">
                <a href="${magicLink}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Sign In to Parent Portal</a>
              </td>
            </tr>
          </table>
        </center>
        <p style="font-size: 12px; color: #666; margin-top: 15px; word-break: break-all;">
          <strong>If the button doesn't work, copy and paste this link:</strong><br>
          <a href="${magicLink}" style="color: #e11d48;">${magicLink}</a>
        </p>
        <div class="warning">
          <p><strong>This link expires in 15 minutes</strong> and can only be used once.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
        <p style="margin-top: 30px;">
          Stay safe,<br>
          <strong>Room XI Connect Team</strong>
        </p>
      </div>
      <div class="footer">
        <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: email,
      subject: 'Sign In to Parent Portal - Room XI Connect',
      html,
    });
    logger.info({ type: 'parent_magic_link', recipient: maskEmail(email) }, 'Parent magic link email sent');
    return { messageId: 'sent' };
  } catch (error) {
    logger.error({ err: error, type: 'parent_magic_link' }, 'Failed to send parent magic link email');
    throw new Error('Failed to send parent magic link email');
  }
}

/**
 * Verify email configuration is working
 * @returns {Promise<boolean>}
 */
export async function verifyEmailConfig() {
  if (USE_SENDGRID) {
    if (!process.env.SENDGRID_API_KEY) {
      logger.error('[Email] SENDGRID_API_KEY is not configured');
      return false;
    }
    if (!process.env.EMAIL_FROM) {
      logger.warn('[Email] EMAIL_FROM not set, emails may fail without a verified sender');
    }
    logger.info('[Email] Email service ready (SendGrid)');
    return true;
  }
  
  try {
    await transporter.verify();
    logger.info('[Email] Email service ready (Gmail SMTP)');
    return true;
  } catch (error) {
    logger.error({ err: error }, '[Email] Email service configuration error');
    return false;
  }
}
