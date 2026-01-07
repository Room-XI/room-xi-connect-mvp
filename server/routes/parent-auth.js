import express from "express";
import {
  acceptParentInvite,
  createOrRefreshParentInvite,
  getLinkedYouth,
  getPendingInvites,
} from "../services/parentInvite.js";
import { db } from "../db.js";
import { profiles } from "../schema.js";
import { eq } from "drizzle-orm";
import logger from "../logger.ts";

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

const requireParent = (req, res, next) => {
  if (!req.session?.parentId) {
    return res.status(401).json({ error: "Parent authentication required" });
  }
  next();
};

router.post("/invite", requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userId = req.session.userId;
    
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const youthName = profile?.preferredName || profile?.firstName || "A youth";

    const invite = await createOrRefreshParentInvite(userId, email, youthName);

    res.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-invite' }, 'Error creating parent invite');
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

router.get("/invites/pending", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const invites = await getPendingInvites(userId);

    res.json({
      invites: invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-pending' }, 'Error fetching pending invites');
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

router.get("/accept/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { parentId, userId } = await acceptParentInvite(token);

    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err, context: 'parent-auth-accept-session' }, 'Session regeneration error');
        return res.status(500).send("Session error");
      }

      req.session.parentId = parentId;
      req.session.isParentSession = true;

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr, context: 'parent-auth-accept-session-save' }, 'Session save error');
          return res.status(500).send("Session error");
        }

        res.redirect("/parent");
      });
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-accept' }, 'Error accepting parent invite');
    const safeErrorMessage = String(error.message || 'An error occurred')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    res.status(400).send(`
      <html>
        <head>
          <title>Invalid Invitation</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #F0EDE6 0%, #E8E5DE 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #2C4A3E; margin-bottom: 16px; }
            p { color: #4A5F57; line-height: 1.6; }
            .error { color: #E67E73; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid or Expired Invitation</h1>
            <p class="error">${safeErrorMessage}</p>
            <p>Please contact the youth who sent you the invitation to request a new one.</p>
          </div>
        </body>
      </html>
    `);
  }
});

router.get("/status", requireParent, async (req, res) => {
  try {
    if (!req.session.parentId) {
      return res.status(401).json({ error: "Parent authentication required" });
    }

    const parentId = req.session.parentId;
    const youth = await getLinkedYouth(parentId);

    res.json({
      authenticated: true,
      parentId,
      linkedYouth: youth,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-status' }, 'Error fetching parent status');
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

router.post("/logout", requireParent, async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err, context: 'parent-auth-logout' }, 'Session destruction error');
        return res.status(500).json({ error: "Logout failed" });
      }

      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-logout' }, 'Parent logout error');
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
