const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

let impl;
if (provider === "sendgrid") {
  impl = await import("./email.sendgrid.js");
} else if (provider === "console") {
  impl = await import("./email.console.js");
} else if (provider === "gmail" && process.env.GMAIL_APP_PASSWORD) {
  impl = await import("./email.gmail.js");
} else {
  console.warn('[Email] No email provider configured or credentials missing. Using console fallback.');
  impl = await import("./email.console.js");
}

export const sendGuardianVerificationEmail = impl.sendGuardianVerificationEmail;
export const verifyEmailConfig = impl.verifyEmailConfig;
