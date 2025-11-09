const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

let impl;
if (provider === "sendgrid") {
  impl = await import("./email.sendgrid.js");
} else {
  impl = await import("./email.gmail.js");
}

export const sendGuardianVerificationEmail = impl.sendGuardianVerificationEmail;
export const verifyEmailConfig = impl.verifyEmailConfig;
