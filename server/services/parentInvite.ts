import crypto from "crypto";
import { db } from "../db.js";
import { parentInvites, parents, parentLinks } from "../schema.extras.js";
import { profiles } from "../schema.js";
import { eq, and } from "drizzle-orm";
import nodemailer from "nodemailer";

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : process.env.PUBLIC_BASE_URL || "http://localhost:5000";

async function sendParentInviteEmail(toEmail: string, token: string, youthName?: string) {
  const link = `${BASE_URL}/parent/accept/${token}`;
  const aboutLink = `${BASE_URL}/about`;
  const privacyLink = `${BASE_URL}/privacy-policy`;
  const crisisLink = `${BASE_URL}/safety-resources`;
  
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.error("Gmail credentials not configured. Email not sent.");
    console.log(`[DEV MODE] Parent invite link for ${toEmail}: ${link}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  const youthText = youthName ? `${youthName}` : "A youth";
  const subject = `${youthText} invited you to Room XI Connect`;
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAF9F6;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2C4A3E; font-size: 28px; margin: 0;">Room XI Connect</h1>
        <p style="color: #5FA8A3; font-size: 14px; margin: 4px 0 0;">Youth Mental Health & Wellness Platform</p>
      </div>
      
      <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #E8E5DE;">
        <h2 style="color: #2C4A3E; margin-top: 0;">You've been invited!</h2>
        <p style="color: #4A5F57; line-height: 1.6;">
          ${youthText} has invited you to be their parent/guardian on Room XI Connect.
        </p>
        
        <div style="background: #F5F4F0; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2C4A3E; margin: 0 0 12px; font-size: 16px;">What is Room XI?</h3>
          <p style="color: #4A5F57; line-height: 1.6; margin: 0;">
            Room XI Connect is a <strong>privacy-first</strong> platform that helps youth (ages 13-25) in Edmonton:
          </p>
          <ul style="color: #4A5F57; line-height: 1.8; margin: 12px 0 0; padding-left: 20px;">
            <li>Track their mood and mental wellness</li>
            <li>Discover free youth programs in the community</li>
            <li>Access crisis support resources when needed</li>
            <li>Connect with Ximi, our supportive AI companion</li>
          </ul>
        </div>
        
        <h3 style="color: #2C4A3E; font-size: 16px;">As a parent/guardian, you'll be able to:</h3>
        <ul style="color: #4A5F57; line-height: 1.8;">
          <li>Provide consent for platform use and program participation</li>
          <li>View which programs your youth is interested in</li>
          <li>Manage privacy and consent preferences</li>
        </ul>
        
        <div style="background: #E8F5F3; padding: 12px 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5FA8A3;">
          <p style="color: #2C4A3E; margin: 0; font-size: 14px;">
            <strong>Privacy Note:</strong> Your youth's personal journal entries and detailed mood data remain private. 
            You will only see general activity and program interests unless they choose to share more.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" 
             style="background-color: #5FA8A3; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #7D8471; font-size: 13px; line-height: 1.6; text-align: center;">
          This link will expire in 30 days. If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
      
      <div style="margin-top: 24px; padding: 16px; background: #FFF5F5; border-radius: 8px; border: 1px solid #FFE0E0;">
        <h4 style="color: #C53030; margin: 0 0 8px; font-size: 14px;">Crisis Resources</h4>
        <p style="color: #4A5F57; font-size: 13px; line-height: 1.6; margin: 0;">
          If your youth is in immediate danger, call 911. For mental health crisis support:<br/>
          <strong>Kids Help Phone:</strong> 1-800-668-6868 | Text CONNECT to 686868
        </p>
      </div>
      
      <div style="margin-top: 24px; text-align: center;">
        <a href="${aboutLink}" style="color: #5FA8A3; font-size: 13px; text-decoration: none; margin: 0 12px;">Learn More About Us</a>
        <a href="${privacyLink}" style="color: #5FA8A3; font-size: 13px; text-decoration: none; margin: 0 12px;">Privacy Policy</a>
        <a href="${crisisLink}" style="color: #5FA8A3; font-size: 13px; text-decoration: none; margin: 0 12px;">Crisis Resources</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #E8E5DE; margin: 24px 0;">
      <p style="color: #7D8471; font-size: 12px; text-align: center; margin: 0;">
        Room XI Connect | Room Eleven Foundation | Edmonton, Alberta, Canada<br/>
        A non-profit initiative supporting youth mental health and wellness
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Room XI Connect" <${gmailUser}>`,
      to: toEmail,
      subject,
      html,
    });
    console.log(`Parent invite email sent to ${toEmail}`);
  } catch (error) {
    console.error("Failed to send parent invite email:", error);
    throw new Error("Failed to send invitation email");
  }
}

export async function createOrRefreshParentInvite(
  userId: string,
  email: string,
  youthName?: string
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const normalizedEmail = email.toLowerCase().trim();

  const [invite] = await db
    .insert(parentInvites)
    .values({
      userId,
      email: normalizedEmail,
      token,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: parentInvites.email,
      set: {
        userId,
        token,
        expiresAt,
        acceptedAt: null,
      },
    })
    .returning();

  await sendParentInviteEmail(normalizedEmail, token, youthName);

  return invite;
}

export async function acceptParentInvite(token: string, relation = "guardian") {
  return await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(parentInvites)
      .where(eq(parentInvites.token, token));

    if (!invite) {
      throw new Error("Invitation not found");
    }

    if (invite.expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    if (invite.acceptedAt) {
      const [existingParent] = await tx
        .select()
        .from(parents)
        .where(eq(parents.email, invite.email.toLowerCase()));
      
      if (existingParent) {
        return { parentId: existingParent.id, userId: invite.userId };
      }
      throw new Error("Invitation has already been accepted");
    }

    const email = invite.email.toLowerCase();

    let parentId: string;
    const [existingParent] = await tx
      .select()
      .from(parents)
      .where(eq(parents.email, email));

    if (existingParent) {
      parentId = existingParent.id;
    } else {
      const [newParent] = await tx
        .insert(parents)
        .values({ email })
        .returning();
      
      if (!newParent || !newParent.id) {
        throw new Error("Failed to create parent account");
      }
      
      parentId = newParent.id;
    }

    const [existingLink] = await tx
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.parentId, parentId),
          eq(parentLinks.userId, invite.userId)
        )
      );

    if (!existingLink) {
      await tx.insert(parentLinks).values({
        parentId,
        userId: invite.userId,
        relation,
        verifiedAt: new Date(),
      });
    }

    await tx
      .update(parentInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(parentInvites.id, invite.id));

    return { parentId, userId: invite.userId };
  });
}

export async function getLinkedYouth(parentId: string) {
  const links = await db
    .select({
      userId: parentLinks.userId,
      relation: parentLinks.relation,
      verifiedAt: parentLinks.verifiedAt,
      preferredName: profiles.preferredName,
      firstName: profiles.firstName,
      age: profiles.age,
    })
    .from(parentLinks)
    .leftJoin(profiles, eq(parentLinks.userId, profiles.userId))
    .where(eq(parentLinks.parentId, parentId));

  return links;
}

export async function getPendingInvites(userId: string) {
  const invites = await db
    .select()
    .from(parentInvites)
    .where(
      and(
        eq(parentInvites.userId, userId),
        eq(parentInvites.acceptedAt, null as any)
      )
    );

  return invites;
}
