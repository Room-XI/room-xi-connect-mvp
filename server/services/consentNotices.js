/**
 * Versioned Consent Notices for PIPA/PIPEDA Compliance
 * 
 * Each consent notice is versioned and timestamped. The version string
 * is stored in the guardian_verifications audit trail to prove exactly
 * what text the parent agreed to.
 * 
 * Format: vX.Y-YYYY-MM-DD
 */

export const CONSENT_NOTICE_VERSION = 'v2.0-2025-01-17';

/**
 * Generate the full consent notice HTML page for parents to view and agree to.
 * This is displayed when they click the link in the initial email.
 * 
 * @param {string} youthName - The youth's first name
 * @param {string} token - The initial consent token for form submission
 * @param {string} formNonce - One-time CSRF nonce for form security
 * @returns {string} - Full HTML page
 */
export function consentNoticeV1(youthName, token, formNonce = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guardian Consent - Room XI Connect</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #667eea;
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    .section h3 {
      color: #333;
      font-size: 16px;
      margin: 15px 0 10px 0;
    }
    .info-box {
      background: #f8f9ff;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .warning-box {
      background: #fff8e6;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .privacy-box {
      background: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    ul, ol {
      padding-left: 25px;
      margin: 10px 0;
    }
    li {
      margin: 8px 0;
    }
    .consent-form {
      background: #f8f9ff;
      padding: 30px;
      border-radius: 12px;
      margin-top: 30px;
    }
    .checkbox-group {
      margin: 20px 0;
    }
    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      transition: all 0.2s;
    }
    .checkbox-label:hover {
      border-color: #667eea;
    }
    .checkbox-label input {
      width: 22px;
      height: 22px;
      margin-top: 2px;
      cursor: pointer;
    }
    .checkbox-text {
      flex: 1;
    }
    .checkbox-text strong {
      display: block;
      margin-bottom: 5px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      border: none;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      width: 100%;
      margin-top: 20px;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    .button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .version-info {
      text-align: center;
      color: #888;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .youth-name {
      color: #667eea;
      font-weight: 600;
    }
    @media (max-width: 600px) {
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 22px;
      }
      .content {
        padding: 25px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Guardian Consent Required</h1>
      <p>Room XI Connect - Youth Mental Health & Wellness Platform</p>
    </div>
    
    <div class="content">
      <div class="info-box">
        <p><strong><span class="youth-name">${youthName}</span></strong> has registered for Room XI Connect and is requesting your consent to enable full platform features and partner program registration.</p>
      </div>

      <div class="section">
        <h2>About Room XI Connect</h2>
        <p>Room XI Connect is a youth mental health and wellness platform designed for ages 13-25. The platform provides:</p>
        <ul>
          <li><strong>Daily Mood Check-ins:</strong> Track emotional wellness with a simple, trauma-informed interface</li>
          <li><strong>Program Discovery:</strong> Find local mental health programs, recreational activities, and support services</li>
          <li><strong>AI Companion (Ximi):</strong> A supportive AI chat assistant for reflection and coping strategies (not a substitute for professional help)</li>
          <li><strong>Crisis Resources:</strong> Quick access to emergency contacts and crisis support lines</li>
        </ul>
      </div>

      <div class="section">
        <h2>Understanding This Consent</h2>
        <div class="warning-box">
          <p><strong>What This Consent Enables:</strong></p>
          <ul style="margin-top: 10px;">
            <li><strong>Room XI Programs:</strong> Full access to Room XI-operated programs and services</li>
            <li><strong>Partner Program Registration:</strong> Streamlined registration for partner organizations without additional paperwork</li>
            <li><strong>Parent Portal Access:</strong> You'll be able to view ${youthName}'s activity (subject to their privacy preferences)</li>
          </ul>
        </div>
        <div class="info-box" style="margin-top: 15px;">
          <p><strong>Important:</strong> ${youthName} has already agreed to the Room XI Terms of Service. This consent allows <em>additional</em> data sharing with partner programs and gives you access to the Parent Portal.</p>
        </div>
      </div>

      <div class="section">
        <h2>Youth Privacy Controls</h2>
        <p>${youthName} has control over what you can see in the Parent Portal:</p>
        <ul>
          <li>They can choose to hide their mood data from your view</li>
          <li>They can hide attendance at specific programs (e.g., support groups)</li>
          <li>Demographic information (identity, orientation) is private by default</li>
          <li>AI chat conversations are encrypted and not visible to parents</li>
        </ul>
        <p style="margin-top: 10px;"><em>This youth-empowerment approach aligns with the Mature Minor Doctrine and helps build trust while keeping you informed of what they're comfortable sharing.</em></p>
      </div>

      <div class="section">
        <h2>What Information We Collect</h2>
        <h3>Required Information:</h3>
        <ul>
          <li>Email address and name</li>
          <li>Date of birth (to verify age eligibility)</li>
          <li>Daily mood check-in responses (mood level 1-6, wellness dimensions)</li>
        </ul>
        
        <h3>Optional Information (Youth Can Choose to Share):</h3>
        <ul>
          <li>Postal code (for finding nearby programs)</li>
          <li>Health profile (allergies, accessibility needs) - only if they opt in</li>
          <li>Demographics (kept private from guardians unless youth approves disclosure)</li>
          <li>AI chat conversations (encrypted, not reviewed by humans)</li>
        </ul>
      </div>

      <div class="section">
        <h2>Your Rights as a Guardian</h2>
        <div class="privacy-box">
          <ul>
            <li><strong>Access:</strong> Request a copy of your child's data at any time via the Parent Portal</li>
            <li><strong>Correction:</strong> Request corrections to inaccurate information</li>
            <li><strong>Per-Program Consent:</strong> Approve or deny consent requests from individual partner programs</li>
            <li><strong>Notification:</strong> Be notified if there is ever a data breach affecting your child</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>What Happens If You Withdraw Consent</h2>
        <div class="info-box">
          <p><strong>Withdrawing consent does not remove ${youthName}'s access to Room XI Connect.</strong></p>
          <p style="margin-top: 10px;">If you withdraw consent:</p>
          <ul style="margin-top: 10px;">
            <li>Your Parent Portal access will be disabled</li>
            <li>Data sharing with partner programs will stop</li>
            <li>Room XI staff will be notified for in-person follow-up</li>
            <li>${youthName} can still use the app to find programs and access crisis resources</li>
          </ul>
          <p style="margin-top: 10px;"><em>This approach ensures ${youthName} always has access to mental health resources, even during family disagreements. If consent needs to be re-established, we'll work with you and ${youthName} in person.</em></p>
        </div>
      </div>

      <div class="section">
        <h2>Data Protection & Privacy</h2>
        <ul>
          <li>All data is stored in Canada on secure, encrypted servers</li>
          <li>We do <strong>not</strong> sell or share personal information with third parties</li>
          <li>Sensitive health data is encrypted end-to-end</li>
          <li>We comply with PIPA, PIPEDA, and Alberta's Health Information Act (HIA)</li>
          <li>Data is retained only as long as the account is active, plus 30 days after deletion</li>
          <li>Staff access is logged and audited</li>
        </ul>
      </div>

      <div class="section">
        <h2>Crisis Safety</h2>
        <p>If ${youthName} indicates they are in crisis during a check-in or chat, the platform will:</p>
        <ol>
          <li>Display immediate crisis resources (Kids Help Phone, 988 Suicide Crisis Helpline)</li>
          <li>Encourage them to reach out to a trusted adult</li>
          <li><strong>We do not notify guardians automatically</strong> to preserve trust and encourage help-seeking</li>
        </ol>
        <p>If you have concerns about ${youthName}'s safety, please speak with them directly or contact a mental health professional.</p>
      </div>

      <form class="consent-form" action="/api/consent/agree/${token}" method="POST">
        <input type="hidden" name="_nonce" value="${formNonce}">
        <h2>Provide Your Consent</h2>
        <p>By checking the boxes below and clicking "I Agree," you confirm that:</p>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" name="consent_guardian" required>
            <span class="checkbox-text">
              <strong>I am the parent or legal guardian</strong>
              I confirm that I am the parent or legal guardian of ${youthName} and have the authority to provide consent on their behalf.
            </span>
          </label>
        </div>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" name="consent_understood" required>
            <span class="checkbox-text">
              <strong>I have read and understood this notice</strong>
              I have reviewed the information above about what data is collected, how it is used, and my rights under Canadian privacy law.
            </span>
          </label>
        </div>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" name="consent_grant" required>
            <span class="checkbox-text">
              <strong>I consent to ${youthName}'s use of Room XI Connect</strong>
              I grant consent for ${youthName} to use Room XI Connect and for the platform to collect and process their information as described above.
            </span>
          </label>
        </div>

        <button type="submit" class="button" id="submit-btn" disabled>
          I Agree - Submit Consent
        </button>
        
        <div class="version-info">
          <p>Consent Notice Version: ${CONSENT_NOTICE_VERSION}</p>
          <p>This consent is legally binding under PIPA and PIPEDA.</p>
          <p>A confirmation email will be sent to verify your decision.</p>
        </div>
      </form>
    </div>
  </div>

  <script src="/static/consent-form.js" defer></script>
</body>
</html>
`;
}

/**
 * Generate the confirmation success page shown after parent clicks confirm link
 * 
 * @param {string} youthName - The youth's first name
 * @returns {string} - Full HTML page
 */
export function confirmationSuccessPage(youthName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consent Confirmed - Room XI Connect</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 50px 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      font-size: 40px;
    }
    h1 {
      color: #22c55e;
      font-size: 28px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 15px;
      color: #555;
    }
    .info-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: left;
    }
    .info-box h3 {
      color: #16a34a;
      margin-bottom: 10px;
    }
    .info-box ul {
      padding-left: 20px;
    }
    .info-box li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Consent Confirmed!</h1>
    <p>Thank you for confirming your consent. <strong>${youthName}</strong>'s Room XI Connect account is now fully activated.</p>
    
    <div class="info-box">
      <h3>What Happens Next?</h3>
      <ul>
        <li>${youthName} will be notified that their account is now active</li>
        <li>They can begin using all features of Room XI Connect</li>
        <li>You will receive a confirmation email for your records</li>
        <li>You can contact us anytime to manage or withdraw consent</li>
      </ul>
    </div>
    
    <p>If you have any questions, please contact us at support@roomxi.org</p>
    <p style="color: #888; font-size: 14px; margin-top: 30px;">You may close this window.</p>
  </div>
</body>
</html>
`;
}

/**
 * Generate the "pending confirmation" page shown after initial consent
 * 
 * @param {string} guardianEmail - Guardian's email (partially masked)
 * @returns {string} - Full HTML page
 */
export function pendingConfirmationPage(guardianEmail) {
  const maskedEmail = maskEmail(guardianEmail);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation Email Sent - Room XI Connect</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 50px 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      font-size: 40px;
    }
    h1 {
      color: #d97706;
      font-size: 28px;
      margin-bottom: 20px;
    }
    p { margin-bottom: 15px; color: #555; }
    .email-box {
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #92400e;
    }
    .steps {
      text-align: left;
      background: #f9fafb;
      padding: 25px;
      border-radius: 12px;
      margin-top: 30px;
    }
    .steps h3 { color: #374151; margin-bottom: 15px; }
    .steps ol { padding-left: 25px; }
    .steps li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📧</div>
    <h1>Almost Done!</h1>
    <p>Thank you for reviewing the consent form. To complete the process, please check your email:</p>
    
    <div class="email-box">${maskedEmail}</div>
    
    <p>We've sent a confirmation email to verify your consent.</p>
    
    <div class="steps">
      <h3>Final Step:</h3>
      <ol>
        <li>Check your inbox (and spam folder)</li>
        <li>Open the email from Room XI Connect</li>
        <li>Click the "Confirm My Consent" button</li>
        <li>Your child's account will be activated</li>
      </ol>
    </div>
    
    <p style="color: #888; font-size: 14px; margin-top: 30px;">
      The confirmation link expires in 24 hours.
    </p>
  </div>
</body>
</html>
`;
}

/**
 * Generate an expired/invalid link page
 * 
 * @returns {string} - Full HTML page
 */
export function expiredLinkPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired - Room XI Connect</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 50px 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      font-size: 40px;
    }
    h1 { color: #dc2626; font-size: 28px; margin-bottom: 20px; }
    p { margin-bottom: 15px; color: #555; }
    .info-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: left;
    }
    .info-box h3 { color: #dc2626; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⏱️</div>
    <h1>Link Expired or Invalid</h1>
    <p>This consent link is no longer valid. Links expire after 24 hours for security reasons.</p>
    
    <div class="info-box">
      <h3>What You Can Do:</h3>
      <ul>
        <li>Ask your child to log in to Room XI Connect</li>
        <li>They can request a new consent email from their Settings page</li>
        <li>A fresh link will be sent to your email</li>
      </ul>
    </div>
    
    <p>If you continue to have issues, please contact support@roomxi.org</p>
  </div>
</body>
</html>
`;
}

/**
 * Mask email for display (e.g., j***@gmail.com)
 */
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}

export default {
  CONSENT_NOTICE_VERSION,
  consentNoticeV1,
  confirmationSuccessPage,
  pendingConfirmationPage,
  expiredLinkPage,
};
