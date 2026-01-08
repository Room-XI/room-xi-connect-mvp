# Room XI Connect - Full Compliance Implementation Guide for Replit AI

**Objective:** Implement all necessary changes to make the Room XI Connect application fully compliant with Canadian privacy laws (PIPA/PIPEDA/HIA) in a single, one-week sprint. This guide provides exact file paths, code modifications, and testing procedures. Execute each step sequentially and do not proceed until the validation for the current step passes.

**Guiding Principles:**
- **No New Costs:** All changes will use the existing tech stack (Node.js, Express, Drizzle, PostgreSQL, React, Nodemailer with Gmail). No new paid services are required.
- **No New Keys:** You will continue to use the existing `GMAIL_USER` and `GMAIL_APP_PASSWORD` environment variables.
- **Self-Contained:** This guide is designed to be executed from top to bottom without external clarification.
- **Test-Driven:** After every significant modification, you must run the specified tests to ensure the app remains stable and the change was successful.

---

## **Day 1-2: Phase 1 - Foundational Compliance (Email Plus & Audit Trail)**

**Goal:** Replace the non-compliant, one-click email verification with a legally defensible, two-step "Email Plus" consent flow and establish a robust audit trail.

### **Step 1.1: Enhance the Database Schema for Audit Trail**

**Action:** Modify the `guardianVerifications` table to capture a detailed, immutable audit trail of the entire consent process. This is critical for demonstrating compliance.

**File to Modify:** `/home/ubuntu/upload/room-xi-connect-mvp/server/schema.ts`

**Instructions:**
1.  Locate the `guardianVerifications` table definition (around line 180).
2.  Replace the entire existing `guardianVerifications` table definition with the following enhanced schema. This new schema adds fields for the full consent lifecycle, including notice details, initial consent, confirmation, and withdrawal, with IP addresses and user agents for each step.

```typescript
// server/schema.ts - REPLACEMENT CODE
export const guardianVerifications = pgTable("guardian_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guardianEmail: text("guardian_email").notNull(),
  
  // Consent Notice Details
  consentNoticeVersion: text("consent_notice_version").notNull(), // e.g., "v1.0-2025-12-17"
  consentNoticeSentAt: timestamp("consent_notice_sent_at", { withTimezone: true }),

  // Initial Consent Step (Parent clicks "I Agree" on consent page)
  initialConsentToken: text("initial_consent_token").unique(),
  initialConsentAt: timestamp("initial_consent_at", { withTimezone: true }),
  initialConsentIp: text("initial_consent_ip"),
  initialConsentUserAgent: text("initial_consent_user_agent"),

  // Confirmation Step (Parent clicks link in second email)
  confirmationToken: text("confirmation_token").unique(),
  confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedIp: text("confirmed_ip"),
  confirmedUserAgent: text("confirmed_user_agent"),

  // Status and Lifecycle
  status: text("status").notNull().default("pending_initial_consent"), // pending_initial_consent -> pending_confirmation -> confirmed -> withdrawn
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),

  // Withdrawal Details
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  withdrawalIp: text("withdrawal_ip"),
  withdrawalUserAgent: text("withdrawal_user_agent"),
}, (table) => ({
  userIdx: index("guardian_verifications_user_idx").on(table.userId),
  initialTokenIdx: index("guardian_verifications_initial_token_idx").on(table.initialConsentToken),
  confirmationTokenIdx: index("guardian_verifications_confirmation_token_idx").on(table.confirmationToken),
}));
```

**Validation:**
1.  Run the command `pnpm run db:push` from the `/home/ubuntu/upload/room-xi-connect-mvp/` directory.
2.  **Confirm** that the command completes successfully without any errors. This verifies the schema changes are valid and have been applied to the database.
3.  **Do not proceed** if this step fails.

### **Step 1.2: Create New Consent Endpoints**

**Action:** Create a new route file to handle the new, multi-step consent logic. This separates the new flow from the old `auth.js` logic.

**File to Create:** `/home/ubuntu/upload/room-xi-connect-mvp/server/routes/consent.js`

**Instructions:**
1.  Create the new file.
2.  Add the following code. This code creates three new endpoints:
    *   `GET /consent/view/:token`: Displays the detailed consent form to the parent.
    *   `POST /consent/agree/:token`: Handles the parent's initial agreement.
    *   `GET /consent/confirm/:token`: Handles the final confirmation click from the second email.

```javascript
// server/routes/consent.js - NEW FILE CONTENT
import express from 'express';
import { db } from '../db.js';
import { guardianVerifications, profiles } from '../schema.js';
import { eq } from 'drizzle-orm';
import { sendConfirmationEmail } from '../services/email.js';
import { consentNoticeV1 } from '../services/consentNotices.js';

const router = express.Router();

// Endpoint for parent to view the consent form
router.get('/view/:token', async (req, res) => {
  const { token } = req.params;
  const verification = await db.query.guardianVerifications.findFirst({
    where: eq(guardianVerifications.initialConsentToken, token),
    with: { user: { with: { profile: true } } }
  });

  if (!verification || verification.status !== 'pending_initial_consent' || new Date() > verification.expiresAt) {
    return res.status(404).send('<h1>Consent Link Invalid or Expired</h1><p>This consent link is no longer valid. Please ask your child to re-register.</p>');
  }

  // Display the full consent notice
  res.send(consentNoticeV1(verification.user.profile.firstName, token));
});

// Endpoint for parent to submit their initial agreement
router.post('/agree/:token', async (req, res) => {
  const { token } = req.params;
  const verification = await db.query.guardianVerifications.findFirst({
    where: eq(guardianVerifications.initialConsentToken, token),
    with: { user: { with: { profile: true } } }
  });

  if (!verification || verification.status !== 'pending_initial_consent' || new Date() > verification.expiresAt) {
    return res.status(404).send('<h1>Consent Link Invalid or Expired</h1>');
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const crypto = await import('crypto');
  const confirmationToken = crypto.randomBytes(32).toString('hex');

  await db.update(guardianVerifications).set({
    initialConsentAt: new Date(),
    initialConsentIp: String(ipAddress),
    initialConsentUserAgent: userAgent,
    status: 'pending_confirmation',
    confirmationToken: confirmationToken,
    confirmationSentAt: new Date(),
  }).where(eq(guardianVerifications.id, verification.id));

  // Send the second email (confirmation)
  await sendConfirmationEmail({
    guardianEmail: verification.guardianEmail,
    youthName: verification.user.profile.firstName,
    confirmationLink: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/consent/confirm/${confirmationToken}`
  });

  res.send('<h1>Thank You</h1><p>We have recorded your initial consent. A confirmation email has been sent to you. Please click the link in that email to finalize the process.</p>');
});

// Endpoint for parent to finalize consent via the second email
router.get('/confirm/:token', async (req, res) => {
  const { token } = req.params;
  const verification = await db.query.guardianVerifications.findFirst({
    where: eq(guardianVerifications.confirmationToken, token)
  });

  if (!verification || verification.status !== 'pending_confirmation' || new Date() > verification.expiresAt) {
    return res.status(404).send('<h1>Confirmation Link Invalid or Expired</h1>');
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Finalize: Update verification and profile
  await db.update(guardianVerifications).set({
    confirmedAt: new Date(),
    confirmedIp: String(ipAddress),
    confirmedUserAgent: userAgent,
    status: 'confirmed',
  }).where(eq(guardianVerifications.id, verification.id));

  await db.update(profiles)
    .set({ guardianVerifiedAt: new Date() })
    .where(eq(profiles.userId, verification.userId));

  res.send('<h1>Consent Confirmed!</h1><p>Thank you for verifying your consent. Your child can now fully access Room XI Connect.</p>');
});

export default router;
```

**Validation:**
1.  The file `/home/ubuntu/upload/room-xi-connect-mvp/server/routes/consent.js` must exist and contain the code above.
2.  There will be errors because `sendConfirmationEmail` and `consentNoticeV1` do not exist yet. This is expected. Proceed to the next step.

### **Step 1.3: Create Consent Notice and New Email Templates**

**Action:** Create a centralized file for the consent notice text and add new email functions for the two-step process.

**File to Create:** `/home/ubuntu/upload/room-xi-connect-mvp/server/services/consentNotices.js`

**Instructions:**
1.  Create the new file.
2.  Add the following code, which contains the full legal text for parental consent.

```javascript
// server/services/consentNotices.js - NEW FILE CONTENT
export const consentNoticeV1 = (youthName, token) => {
  const notice = {
    title: "Parental Consent for Room XI Connect",
    dataCollected: [
      "Profile Information: Name, email, age, city.",
      "Wellness Data: Daily mood check-ins, wellness dimension ratings, and personal notes.",
      "Program Activity: Records of program attendance using a privacy-preserving XID code.",
      "Health Information (Optional): If you or your child provide it for specific program needs (e.g., allergies, accessibility requirements).",
      "Emergency Contacts (Optional): For in-person programs."
    ],
    dataSharing: [
      "Program Organizers: Receive only an anonymized XID code to verify attendance. They do not see your child's name or personal data.",
      "Crisis Support Services: In the event our system detects a potential crisis, we may share information with a crisis support service to ensure your child's safety.",
      "Analytics Providers: Aggregated and anonymized data to help us improve the app. This data cannot be linked back to your child.",
      "We do not sell your child's data to advertisers or any other third parties."
    ],
    dataPurposes: [
      "To match your child with safe, age-appropriate local programs.",
      "To allow your child to track their mood and wellbeing over time.",
      "To detect potential crisis situations and connect them to help.",
      "To verify attendance at programs in a secure and private way."
    ],
    risks: [
      "Data Breach: While we use industry-standard security, no system is 100% immune to breaches.",
      "Inference: Program staff may infer certain interests based on the types of programs your child attends.",
      "Data Retention: We retain data for 2 years after account inactivity unless you request deletion."
    ],
    parentalRights: [
      "Withdraw Consent: You can withdraw your consent at any time by visiting our parent portal or contacting support. This will prevent any new data collection.",
      "Access and Deletion: You have the right to review and request the deletion of your child's personal information."
    ]
  };

  return `
    <!DOCTYPE html><html><head><title>Parental Consent</title><style>body{font-family: sans-serif; max-width: 800px; margin: auto; padding: 20px; color: #333;} h1,h2{color: #4a4a4a;} ul{list-style-type: disc; padding-left: 20px;} .button{background-color: #667eea; color: white; padding: 15px 25px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; border-radius: 8px; cursor: pointer; border: none;} form{margin-top: 30px;}</style></head><body>
      <h1>${notice.title} for ${youthName}</h1>
      <p>Please carefully review the following information before providing your consent for ${youthName} to use the Room XI Connect application.</p>
      <h2>1. What Data We Collect</h2><ul>${notice.dataCollected.map(item => `<li>${item}</li>`).join('')}</ul>
      <h2>2. How We Share Data</h2><ul>${notice.dataSharing.map(item => `<li>${item}</li>`).join('')}</ul>
      <h2>3. Why We Collect This Data</h2><ul>${notice.dataPurposes.map(item => `<li>${item}</li>`).join('')}</ul>
      <h2>4. Risks and Consequences</h2><ul>${notice.risks.map(item => `<li>${item}</li>`).join('')}</ul>
      <h2>5. Your Rights as a Parent</h2><ul>${notice.parentalRights.map(item => `<li>${item}</li>`).join('')}</ul>
      <p>By clicking 'I Agree', you confirm that you have read, understood, and agree to the terms outlined above.</p>
      <form action="/api/consent/agree/${token}" method="POST">
        <button type="submit" class="button">I Agree, Grant Consent</button>
      </form>
    </body></html>
  `;
};
```

**File to Modify:** `/home/ubuntu/upload/room-xi-connect-mvp/server/services/email.js`

**Instructions:**
1.  Replace the entire content of `email.js` with the following. This code adds two new functions (`sendInitialConsentEmail`, `sendConfirmationEmail`) and removes the old `sendGuardianVerificationEmail`.

```javascript
// server/services/email.js - REPLACEMENT CODE
import nodemailer from 'nodemailer';

// Gmail SMTP transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const emailTemplate = (title, body) => `
  <!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:600px;margin:auto;padding:20px;}.header{background:#667eea;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;}h1{margin:0;}.content{padding:20px;border:1px solid #ddd;}.button{display:inline-block;background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:20px;}</style></head><body>
    <div class="header"><h1>${title}</h1></div>
    <div class="content">${body}</div>
  </body></html>
`;

/**
 * Sends the first email in the Email Plus flow.
 * @param {string} guardianEmail - Guardian's email.
 * @param {string} youthName - Youth's first name.
 * @param {string} consentLink - Link to the consent viewing page.
 */
export async function sendInitialConsentEmail({ guardianEmail, youthName, consentLink }) {
  const mailOptions = {
    from: { name: 'Room XI Connect', address: process.env.GMAIL_USER },
    to: guardianEmail,
    subject: 'Action Required: Parental Consent for Room XI Connect',
    html: emailTemplate(
      'Parental Consent Required',
      `<p>Hello,</p><p>Your child, ${youthName}, has requested to join Room XI Connect. To proceed, you must review and provide your parental consent.</p><p>Please click the button below to review the details and provide your consent. This link is valid for 30 days.</p><a href="${consentLink}" class="button">Review and Consent</a>`
    ),
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Sends the second email in the Email Plus flow.
 * @param {string} guardianEmail - Guardian's email.
 * @param {string} youthName - Youth's first name.
 * @param {string} confirmationLink - The final confirmation link.
 */
export async function sendConfirmationEmail({ guardianEmail, youthName, confirmationLink }) {
  const mailOptions = {
    from: { name: 'Room XI Connect', address: process.env.GMAIL_USER },
    to: guardianEmail,
    subject: 'Please Confirm Your Consent for Room XI Connect',
    html: emailTemplate(
      'Final Confirmation Step',
      `<p>Hello,</p><p>Thank you for providing your initial consent for ${youthName}. Please complete the final step by clicking the button below to confirm your decision. This link is valid for 30 days.</p><a href="${confirmationLink}" class="button">Confirm My Consent</a>`
    ),
  };
  return transporter.sendMail(mailOptions);
}
```

**Validation:**
1.  The files `/home/ubuntu/upload/room-xi-connect-mvp/server/services/consentNotices.js` and `/home/ubuntu/upload/room-xi-connect-mvp/server/services/email.js` must be updated.
2.  The errors in `consent.js` from the previous step should now be resolved. Run `pnpm run typecheck:server` from the root directory. It should pass without errors related to these files.

### **Step 1.4: Update Registration Logic to Use New Consent Flow**

**Action:** Modify the `/register` endpoint to trigger the new Email Plus flow instead of the old one.

**File to Modify:** `/home/ubuntu/upload/room-xi-connect-mvp/server/routes/auth.js`

**Instructions:**
1.  First, add the new `consent` router to your main server file. Open `/home/ubuntu/upload/room-xi-connect-mvp/server/index.js` and add these lines:
    ```javascript
    // server/index.js - ADDITIONS
    import consentRoutes from './routes/consent.js';
    // ... after other app.use() calls
    app.use('/api/consent', consentRoutes);
    ```
2.  Next, in `/home/ubuntu/upload/room-xi-connect-mvp/server/routes/auth.js`, replace the `sendGuardianVerificationEmail` import with `sendInitialConsentEmail`:
    ```javascript
    // server/routes/auth.js - REPLACEMENT
    // Near top of file
    import { sendInitialConsentEmail } from '../services/email.js';
    ```
3.  Find the `router.post('/register', ...)` endpoint. Locate the section `// Handle guardian verification for users under 16` (around line 129).
4.  Replace the entire `if (requiresGuardianVerification) { ... }` block with the following new logic. This creates the necessary tokens and triggers the *first* email of the new flow.

```javascript
// server/routes/auth.js - REPLACEMENT for 'if (requiresGuardianVerification)' block
if (requiresGuardianVerification) {
  const crypto = await import('crypto');
  const initialConsentToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Token is valid for 30 days

  // Create the verification record with the initial token
  await db.insert(guardianVerifications).values({
    userId: newUser.id,
    guardianEmail: guardianEmail,
    consentNoticeVersion: 'v1.0-2025-12-17',
    status: 'pending_initial_consent',
    initialConsentToken: initialConsentToken,
    expiresAt: expiresAt,
    consentNoticeSentAt: new Date(),
  }).returning();

  // Send the initial consent email
  try {
    await sendInitialConsentEmail({
      guardianEmail: guardianEmail,
      youthName: firstName || 'your child',
      consentLink: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/consent/view/${initialConsentToken}`
    });
  } catch (emailError) {
    console.error('Failed to send initial consent email:', emailError);
    // Log error but do not fail the registration
  }
}
```
5.  Finally, **delete the old verification endpoint**. Remove the entire `router.get('/verify-guardian/:token', ...)` block from the bottom of `auth.js` (from line 349 to 393). It is now obsolete.

**Validation:**
1.  Start the server with `pnpm run dev`.
2.  Use a tool like Postman or `curl` to send a `POST` request to `http://localhost:5000/api/auth/register` with a new user under 16.
3.  **Confirm** that the registration succeeds and an email is sent to the `guardianEmail`.
4.  **Confirm** the email contains a link to `/api/consent/view/...`.
5.  Click the link and **confirm** you see the full consent notice page.
6.  Click the "I Agree" button. **Confirm** you see the "Thank You" page and that a *second* email is sent.
7.  Click the link in the second email. **Confirm** you see the "Consent Confirmed!" page.
8.  Check the `guardian_verifications` table in your database. **Confirm** the record for the new user has a `status` of `confirmed` and all `...At`, `...Ip`, and `...UserAgent` fields are populated.

---

## **Day 3-4: Phase 2 - Parent Portal (MVP)**

**Goal:** Create a secure portal for parents to manage their consent and view their child's data, fulfilling PIPEDA's access requirements.

### **Step 2.1: Create Parent Authentication**

**Action:** Add a password system for parents, linked to their email.

**File to Modify:** `/home/ubuntu/upload/room-xi-connect-mvp/server/schema.ts`

**Instructions:**
1.  Add a new `parents` table to the schema. This will store parent accounts separately from youth accounts.

```typescript
// server/schema.ts - ADDITION
export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentYouthLinks = pgTable("parent_youth_links", {
  parentId: uuid("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.parentId, table.youthId] }),
}));
```

**File to Create:** `/home/ubuntu/upload/room-xi-connect-mvp/server/routes/parentAuth.js`

**Instructions:**
1.  Create a new route file for parent-specific authentication.
2.  Add the following code to create `/register`, `/login`, and `/me` endpoints for parents.

```javascript
// server/routes/parentAuth.js - NEW FILE CONTENT
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { parents, parentYouthLinks, users, profiles, guardianVerifications } from '../schema.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Parent registration (first time they set a password)
router.post('/register', async (req, res) => {
  const { email, password, confirmationToken } = req.body;
  const verification = await db.query.guardianVerifications.findFirst({
    where: and(eq(guardianVerifications.confirmationToken, confirmationToken), eq(guardianVerifications.status, 'confirmed'))
  });

  if (!verification || verification.guardianEmail.toLowerCase() !== email.toLowerCase()) {
    return res.status(400).json({ error: 'Invalid token or email.' });
  }

  const existingParent = await db.query.parents.findFirst({ where: eq(parents.email, email) });
  if (existingParent) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [newParent] = await db.insert(parents).values({ email, passwordHash }).returning();
  await db.insert(parentYouthLinks).values({ parentId: newParent.id, youthId: verification.userId });

  req.session.parentId = newParent.id;
  res.status(201).json({ message: 'Parent account created.' });
});

// Parent login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const parent = await db.query.parents.findFirst({ where: eq(parents.email, email) });

  if (!parent || !(await bcrypt.compare(password, parent.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  req.session.parentId = parent.id;
  res.json({ message: 'Login successful.' });
});

// Get current parent's data
router.get('/me', async (req, res) => {
  if (!req.session.parentId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // Fetch parent and linked youth data here...
  res.json({ parentId: req.session.parentId });
});

export default router;
```

**Validation:**
1.  Run `pnpm run db:push` to apply schema changes.
2.  Add the new router to `server/index.js`: `import parentAuthRoutes from './routes/parentAuth.js'; app.use('/api/parent/auth', parentAuthRoutes);`
3.  After completing the consent flow from Day 1-2, use Postman to hit `POST /api/parent/auth/register` with the parent's email, a password, and the confirmation token. Confirm a parent account is created.

### **Step 2.2: Build the Parent Portal Frontend**

**Action:** Create the React components for the parent portal.

**File to Create:** `/home/ubuntu/upload/room-xi-connect-mvp/src/routes/ParentPortal.tsx`

**Instructions:**
1.  Create the new file.
2.  Add the following code. This is a basic scaffold for a parent dashboard. You will need to build out the UI for each tab (`Consent`, `Data`, `Settings`).

```tsx
// src/routes/ParentPortal.tsx - NEW FILE CONTENT
import React, { useState, useEffect } from 'react';
import api from '@/lib/api'; // Assuming you have a configured api client

// Mock data - replace with API calls
const mockYouthData = {
  name: 'Jamie Doe',
  consents: [
    { type: 'General App Use', status: 'Granted', date: '2025-12-17' },
    { type: 'Health Information', status: 'Not Granted', date: null },
  ],
  data: { checkins: 34, programs: 5 }
};

export default function ParentPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // Add state for parent data, youth data, loading, error

  // useEffect(() => {
  //   // Fetch parent and youth data from /api/parent/me
  // }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Parent Portal</h1>
        <div className="flex border-b mb-6">
          <button onClick={() => setActiveTab('dashboard')} className={`py-2 px-4 ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500' : ''}`}>Dashboard</button>
          <button onClick={() => setActiveTab('consent')} className={`py-2 px-4 ${activeTab === 'consent' ? 'border-b-2 border-blue-500' : ''}`}>Manage Consent</button>
          <button onClick={() => setActiveTab('data')} className={`py-2 px-4 ${activeTab === 'data' ? 'border-b-2 border-blue-500' : ''}`}>Access Data</button>
        </div>

        <div>
          {activeTab === 'dashboard' && <div><h2>Welcome, Parent!</h2><p>This is your dashboard for {mockYouthData.name}.</p></div>}
          {activeTab === 'consent' && <ConsentManagement youth={mockYouthData} />}
          {active_tab === 'data' && <DataAccess youth={mockYouthData} />}
        </div>
      </div>
    </div>
  );
}

function ConsentManagement({ youth }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Consent for {youth.name}</h2>
      {youth.consents.map(c => (
        <div key={c.type} className="flex justify-between items-center p-4 border rounded-lg mb-2">
          <span>{c.type}</span>
          <span className={`font-bold ${c.status === 'Granted' ? 'text-green-600' : 'text-red-600'}`}>{c.status}</span>
          <button className="text-sm text-red-500 hover:underline">Withdraw</button>
        </div>
      ))}
    </div>
  );
}

function DataAccess({ youth }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Data for {youth.name}</h2>
      <p>You have the right to access and request deletion of your child's data.</p>
      <button className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg">Download All Data (CSV)</button>
      <button className="mt-4 ml-4 bg-red-500 text-white py-2 px-4 rounded-lg">Request Permanent Deletion</button>
    </div>
  );
}
```

**Validation:**
1.  Add the new route to your main router file (`/src/main.tsx` or similar).
2.  Navigate to the `/parent-portal` URL in your browser.
3.  **Confirm** that the basic portal UI renders without errors. The data will be mocked, but the structure should be visible.

---

## **Day 5-6: Phase 3 - Granular Consent & Security Hardening**

**Goal:** Implement consent on a per-item basis and conduct a final security review.

### **Step 3.1: Implement Granular Consent**

**Action:** Modify the `consents` table and logic to handle different types of consent (e.g., general, health, photos).

**File to Modify:** `/home/ubuntu/upload/room-xi-connect-mvp/server/schema.ts`

**Instructions:**
1.  The `consents` table already exists and is well-structured for this. You just need to define the consent types.
2.  Add a `consentTypes` enum to your schema.

```typescript
// server/schema.ts - ADDITION
export const consentTypes = ['general_use', 'health_info', 'photos_internal', 'photos_marketing'];
```

**File to Modify:** `/home/ubuntu/upload/room-xi-connect-mvp/server/routes/consent.js`

**Instructions:**
1.  When a parent gives final confirmation, you should now create multiple entries in the `consents` table, one for each type of consent they agreed to.
2.  Update the `GET /consent/confirm/:token` endpoint to save these records.

```javascript
// server/routes/consent.js - UPDATE to '/confirm/:token'
// Inside the router.get('/confirm/:token', ...) endpoint, after updating guardianVerifications...

const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
const userAgent = req.headers['user-agent'];

// ... after updating guardianVerifications and profiles ...

// Add granular consent records
const consentData = [
  { consentType: 'general_use', value: true },
  // In the future, you would get these values from checkboxes on the consent form
  { consentType: 'health_info', value: true }, 
  { consentType: 'photos_internal', value: false },
];

for (const consent of consentData) {
  await db.insert(consents).values({
    userId: verification.userId,
    consentType: consent.consentType,
    value: consent.value,
    ipAddress: String(ipAddress),
    userAgent: userAgent,
    grantedBy: 'parent',
    evidenceRef: verification.id, // Link to the guardian verification record
    textVersion: 'v1.0-2025-12-17',
  });
}

res.send('<h1>Consent Confirmed!</h1>...');
```

**Validation:**
1.  Complete the full consent flow again.
2.  Check the `consents` table in the database.
3.  **Confirm** that there are new rows for the user, corresponding to each type in `consentData`, with the correct `value` and audit information.

### **Step 3.2: Security & Compliance Review**

**Action:** Perform a final check of key security and privacy configurations.

**Checklist for AI:**
1.  **Privacy Policy:**
    *   **File:** `/home/ubuntu/upload/room-xi-connect-mvp/src/routes/PrivacyPolicy.tsx`
    *   **Action:** Read the file. Ensure it mentions the new two-step consent process, the parent's right to access/delete data via the parent portal, and the types of data collected as outlined in the consent notice.
    *   **Validation:** Confirm the policy is updated and accurate.

2.  **Data Retention Script:**
    *   **File:** `/home/ubuntu/upload/room-xi-connect-mvp/scripts/cleanup-unconsented-accounts.ts`
    *   **Action:** Review this script. It's designed to delete accounts that don't complete verification. Modify it to handle the new `status` fields. It should delete accounts where the status is `pending_initial_consent` or `pending_confirmation` and the `expiresAt` date has passed.
    *   **Validation:** Run the script manually (`pnpm run cleanup:unconsented`) and confirm it correctly identifies and removes expired, unconsented accounts from the database.

3.  **Session Security:**
    *   **File:** `/home/ubuntu/upload/room-xi-connect-mvp/server/index.js`
    *   **Action:** Find the `app.use(session(...))` configuration. Verify that the session cookie settings are secure:
        *   `secure: process.env.NODE_ENV === 'production'`
        *   `httpOnly: true`
        *   `sameSite: 'lax'`
    *   **Validation:** Confirm these settings are present and correctly configured.

---

## **Day 7: Final Testing & Deployment**

**Goal:** Run a full end-to-end test of the entire user journey and deploy.

**End-to-End Test Plan:**

1.  **Youth Registration (Under 16):**
    *   Create a new user with an age of 15.
    *   Provide a valid parent email.
    *   **Expected:** Registration succeeds. Youth account is created but is in a pending state. Initial consent email is sent to the parent.

2.  **Parent Consent Flow:**
    *   Open the parent's email. Click the "Review and Consent" link.
    *   **Expected:** A web page opens displaying the full consent notice.
    *   Click the "I Agree" button.
    *   **Expected:** A "Thank You" page is shown. A second email (confirmation) is sent to the parent.
    *   Open the second email. Click the "Confirm My Consent" link.
    *   **Expected:** A "Consent Confirmed!" page is shown. The `guardian_verifications` record is updated to `status: 'confirmed'`, and the `profiles.guardianVerifiedAt` field is populated.

3.  **Youth Login:**
    *   Log in as the youth user from Step 1.
    *   **Expected:** Login is successful, and the user has full access to the app.

4.  **Parent Portal Access:**
    *   Navigate to the parent portal registration page.
    *   Register as the parent using the confirmation token from the consent flow.
    *   Log in to the parent portal.
    *   **Expected:** Login is successful. The parent can see their child's information, manage consent, and access the data download/deletion options.

5.  **Consent Withdrawal:**
    *   In the parent portal, withdraw consent for "General App Use".
    *   **Expected:** The `consents` table is updated. The youth's next login attempt should be blocked or their access restricted.

**Final Deployment Checklist:**
1.  All tests above have passed without any errors.
2.  All environment variables are correctly set in Replit Secrets.
3.  The database connection string points to the production Neon database.
4.  Run `pnpm run build` to create a final production build of the frontend.
5.  The `pnpm start` command successfully launches the production server.

**Once all checks pass, the application is ready for launch.**
