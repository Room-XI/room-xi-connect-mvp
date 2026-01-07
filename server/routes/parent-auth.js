import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  acceptParentInvite,
  createOrRefreshParentInvite,
  getLinkedYouth,
  getPendingInvites,
} from "../services/parentInvite.js";
import { db } from "../db.js";
import { profiles } from "../schema.js";
import { parents, parentLinks } from "../schema.extras.js";
import { eq } from "drizzle-orm";
import logger from "../logger.ts";
import { sendParentPasswordResetEmail } from "../services/email.js";
import { getPublicUrl } from "../utils/publicUrl.ts";

const router = express.Router();
const SALT_ROUNDS = 12;

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

// ========== PASSWORD-BASED AUTH ROUTES ==========

/**
 * GET /parent-auth/validate-setup-token/:token
 * Validate password setup token before showing form
 */
router.get("/validate-setup-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [parent] = await db.select({
      id: parents.id,
      email: parents.email,
      name: parents.name,
      passwordSetupExpires: parents.passwordSetupExpires,
      passwordHash: parents.passwordHash,
    })
    .from(parents)
    .where(eq(parents.passwordSetupToken, token))
    .limit(1);

    if (!parent) {
      return res.status(404).json({ 
        error: "Invalid or expired token",
        code: "TOKEN_NOT_FOUND" 
      });
    }

    if (parent.passwordHash) {
      return res.status(400).json({ 
        error: "Password has already been set",
        code: "PASSWORD_ALREADY_SET"
      });
    }

    if (new Date() > new Date(parent.passwordSetupExpires)) {
      return res.status(410).json({ 
        error: "This link has expired",
        code: "TOKEN_EXPIRED"
      });
    }

    res.json({
      valid: true,
      email: parent.email,
      name: parent.name,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-validate-token' }, 'Token validation error');
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /parent-auth/set-password
 * Set initial password using setup token
 */
router.post("/set-password", async (req, res) => {
  try {
    const { token, password, name } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const [parent] = await db.select()
      .from(parents)
      .where(eq(parents.passwordSetupToken, token))
      .limit(1);

    if (!parent) {
      return res.status(404).json({ 
        error: "Invalid or expired token",
        code: "TOKEN_NOT_FOUND" 
      });
    }

    if (parent.passwordHash) {
      return res.status(400).json({ 
        error: "Password has already been set. Please use the login page.",
        code: "PASSWORD_ALREADY_SET"
      });
    }

    if (new Date() > new Date(parent.passwordSetupExpires)) {
      return res.status(410).json({ 
        error: "This link has expired. Please request a new one from the login page.",
        code: "TOKEN_EXPIRED"
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.update(parents)
      .set({
        passwordHash,
        name: name || parent.name,
        passwordSetupToken: null,
        passwordSetupExpires: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(parents.id, parent.id));

    // Create session
    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err, context: 'parent-auth-set-password-session' }, 'Session regeneration error');
        return res.status(500).json({ error: "Session error" });
      }

      req.session.parentId = parent.id;
      req.session.isParentSession = true;

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr, context: 'parent-auth-set-password-session-save' }, 'Session save error');
          return res.status(500).json({ error: "Session error" });
        }

        logger.info({ context: 'parent-auth-set-password', parentId: parent.id }, 'Parent password set successfully');

        res.json({
          success: true,
          message: "Password set successfully",
          parentId: parent.id,
        });
      });
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-set-password' }, 'Set password error');
    res.status(500).json({ error: "Failed to set password" });
  }
});

/**
 * POST /parent-auth/login
 * Parent login with email and password
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [parent] = await db.select()
      .from(parents)
      .where(eq(parents.email, normalizedEmail))
      .limit(1);

    if (!parent) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!parent.passwordHash) {
      return res.status(401).json({ 
        error: "Please set your password first using the link sent to your email",
        code: "PASSWORD_NOT_SET"
      });
    }

    const isValid = await bcrypt.compare(password, parent.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    await db.update(parents)
      .set({ lastLoginAt: new Date() })
      .where(eq(parents.id, parent.id));

    // Create session
    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err, context: 'parent-auth-login-session' }, 'Session regeneration error');
        return res.status(500).json({ error: "Session error" });
      }

      req.session.parentId = parent.id;
      req.session.isParentSession = true;

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr, context: 'parent-auth-login-session-save' }, 'Session save error');
          return res.status(500).json({ error: "Session error" });
        }

        logger.info({ context: 'parent-auth-login', parentId: parent.id }, 'Parent logged in successfully');

        res.json({
          success: true,
          parentId: parent.id,
          email: parent.email,
          name: parent.name,
        });
      });
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-login' }, 'Login error');
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /parent-auth/forgot-password
 * Request password reset email
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    };

    const [parent] = await db.select()
      .from(parents)
      .where(eq(parents.email, normalizedEmail))
      .limit(1);

    if (!parent) {
      // Don't reveal if account exists
      return res.json(successResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.update(parents)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
        updatedAt: new Date(),
      })
      .where(eq(parents.id, parent.id));

    // Send reset email
    try {
      const baseUrl = getPublicUrl(req);
      const resetLink = `${baseUrl}/parent/reset-password/${resetToken}`;
      
      await sendParentPasswordResetEmail({
        email: parent.email,
        resetLink,
      });
      
      logger.info({ context: 'parent-auth-forgot-password', email: '[REDACTED]' }, 'Password reset email sent');
    } catch (emailError) {
      logger.error({ err: emailError, context: 'parent-auth-forgot-password-email' }, 'Failed to send reset email');
    }

    res.json(successResponse);
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-forgot-password' }, 'Forgot password error');
    res.status(500).json({ error: "Failed to process request" });
  }
});

/**
 * GET /parent-auth/validate-reset-token/:token
 * Validate password reset token before showing form
 */
router.get("/validate-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [parent] = await db.select({
      id: parents.id,
      email: parents.email,
      passwordResetExpires: parents.passwordResetExpires,
    })
    .from(parents)
    .where(eq(parents.passwordResetToken, token))
    .limit(1);

    if (!parent) {
      return res.status(404).json({ 
        error: "Invalid or expired token",
        code: "TOKEN_NOT_FOUND" 
      });
    }

    if (new Date() > new Date(parent.passwordResetExpires)) {
      return res.status(410).json({ 
        error: "This link has expired",
        code: "TOKEN_EXPIRED"
      });
    }

    res.json({
      valid: true,
      email: parent.email,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-validate-reset-token' }, 'Reset token validation error');
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /parent-auth/reset-password
 * Reset password using reset token
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const [parent] = await db.select()
      .from(parents)
      .where(eq(parents.passwordResetToken, token))
      .limit(1);

    if (!parent) {
      return res.status(404).json({ 
        error: "Invalid or expired token",
        code: "TOKEN_NOT_FOUND" 
      });
    }

    if (new Date() > new Date(parent.passwordResetExpires)) {
      return res.status(410).json({ 
        error: "This link has expired. Please request a new one.",
        code: "TOKEN_EXPIRED"
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.update(parents)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(parents.id, parent.id));

    logger.info({ context: 'parent-auth-reset-password', parentId: parent.id }, 'Parent password reset successfully');

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-reset-password' }, 'Reset password error');
    res.status(500).json({ error: "Failed to reset password" });
  }
});

/**
 * GET /parent-auth/me
 * Get current parent session info
 */
router.get("/me", requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;

    const [parent] = await db.select({
      id: parents.id,
      email: parents.email,
      name: parents.name,
      lastLoginAt: parents.lastLoginAt,
      createdAt: parents.createdAt,
    })
    .from(parents)
    .where(eq(parents.id, parentId))
    .limit(1);

    if (!parent) {
      return res.status(404).json({ error: "Parent not found" });
    }

    const youth = await getLinkedYouth(parentId);

    res.json({
      authenticated: true,
      parent: {
        id: parent.id,
        email: parent.email,
        name: parent.name,
        lastLoginAt: parent.lastLoginAt,
        createdAt: parent.createdAt,
      },
      linkedYouth: youth,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-auth-me' }, 'Get current parent error');
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
