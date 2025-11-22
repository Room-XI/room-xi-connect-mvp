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
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2C4A3E;">You've been invited to Room XI Connect</h2>
      <p style="color: #4A5F57; line-height: 1.6;">
        ${youthText} has invited you to be their parent/guardian on Room XI Connect, 
        a youth mental health and wellness platform.
      </p>
      <p style="color: #4A5F57; line-height: 1.6;">
        As a parent/guardian, you'll be able to:
      </p>
      <ul style="color: #4A5F57; line-height: 1.8;">
        <li>Provide consent for platform use and program participation</li>
        <li>View which programs your youth is interested in</li>
        <li>Manage privacy and consent preferences</li>
      </ul>
      <div style="margin: 30px 0;">
        <a href="${link}" 
           style="background-color: #5FA8A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #7D8471; font-size: 14px; line-height: 1.6;">
        This link will expire in 30 days. If you did not expect this invitation, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #E8E5DE; margin: 30px 0;">
      <p style="color: #7D8471; font-size: 12px;">
        Room XI Connect | Privacy-first youth mental health platform
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
