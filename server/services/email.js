import nodemailer from 'nodemailer';

// Gmail SMTP transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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
            <li>Create a secure 4-digit PIN</li>
            <li>Review the consent summary</li>
            <li>Approve or decline the request</li>
          </ol>
          
          <center>
            <a href="${verificationLink}" class="button">Verify Guardian Consent</a>
          </center>
          
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
2. Create a secure 4-digit PIN
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
    const info = await transporter.sendMail(mailOptions);
    console.log('Guardian verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send guardian verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Verify email configuration is working
 * @returns {Promise<boolean>}
 */
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email service ready (Gmail SMTP)');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
}
