import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function sendGuardianVerificationEmail({ guardianEmail, youthName, verifyUrl }) {
  if (!guardianEmail || !verifyUrl) {
    throw new Error("guardianEmail and verifyUrl are required");
  }

  const msg = {
    to: guardianEmail,
    from: { 
      email: process.env.EMAIL_FROM || process.env.GMAIL_USER, 
      name: process.env.EMAIL_FROM_NAME || "Room XI" 
    },
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
  };

  await sgMail.send(msg);
}

export async function verifyEmailConfig() {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is required for SendGrid email provider");
  }
  return true;
}
