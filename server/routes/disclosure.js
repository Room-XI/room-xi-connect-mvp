import express from "express";
import { z } from "zod";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { parentLinks } from "../schema.extras.js";
import { eq, and } from "drizzle-orm";
import logger from "../logger.ts";

const router = express.Router();

// Helper to verify parent is linked to youth
async function verifyParentYouthLink(parentId, youthId) {
  const [link] = await db
    .select()
    .from(parentLinks)
    .where(
      and(
        eq(parentLinks.parentId, parentId),
        eq(parentLinks.userId, youthId)
      )
    );
  return !!link;
}

const requireYouth = (req, res, next) => {
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

// Parent requests access to youth demographics
router.post("/request", requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;
    const { youthId, reason } = req.body;

    if (!youthId) {
      return res.status(400).json({ error: "Youth ID required" });
    }

    // Verify parent is linked to this youth
    const isLinked = await verifyParentYouthLink(parentId, youthId);
    if (!isLinked) {
      return res.status(403).json({ error: "You are not linked to this youth" });
    }

    // Check if there's already a pending request
    const existing = await db.execute(sql`
      SELECT id, status FROM disclosure_requests 
      WHERE parent_id = ${parentId} 
        AND youth_id = ${youthId} 
        AND status = 'pending'
        AND expires_at > NOW()
    `);

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: "Request already pending",
        requestId: existing.rows[0].id 
      });
    }

    // Create new disclosure request
    const result = await db.execute(sql`
      INSERT INTO disclosure_requests (parent_id, youth_id, reason)
      VALUES (${parentId}, ${youthId}, ${reason || null})
      RETURNING id, status, requested_at, expires_at
    `);

    // Log the request
    await db.execute(sql`
      INSERT INTO disclosure_audit_log (disclosure_request_id, action, actor_id, actor_type, metadata)
      VALUES (${result.rows[0].id}, 'requested', ${parentId}, 'parent', ${JSON.stringify({ reason })})
    `);

    res.json({ 
      success: true, 
      request: result.rows[0],
      message: "Request sent. Youth will be notified to approve or deny."
    });
  } catch (error) {
    logger.error({ err: error, context: 'disclosure-request' }, 'Disclosure request error');
    res.status(500).json({ error: "Failed to create request" });
  }
});

// Youth views pending disclosure requests
router.get("/pending", requireYouth, async (req, res) => {
  try {
    const youthId = req.session.userId;

    const requests = await db.execute(sql`
      SELECT 
        dr.id,
        dr.parent_id,
        dr.reason,
        dr.status,
        dr.requested_at,
        dr.expires_at,
        p.email as parent_email
      FROM disclosure_requests dr
      LEFT JOIN parents p ON p.id = dr.parent_id
      WHERE dr.youth_id = ${youthId}
        AND dr.status = 'pending'
        AND dr.expires_at > NOW()
      ORDER BY dr.requested_at DESC
    `);

    res.json({ requests: requests.rows });
  } catch (error) {
    logger.error({ err: error, context: 'disclosure-pending' }, 'Error fetching pending requests');
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// Youth responds to a disclosure request (approve or deny)
router.post("/respond", requireYouth, async (req, res) => {
  try {
    const youthId = req.session.userId;
    const { requestId, decision } = req.body;

    if (!requestId || !['approved', 'denied'].includes(decision)) {
      return res.status(400).json({ error: "Invalid request or decision" });
    }

    // Verify the request belongs to this youth and is pending
    const request = await db.execute(sql`
      SELECT id, parent_id, status FROM disclosure_requests
      WHERE id = ${requestId} 
        AND youth_id = ${youthId}
        AND status = 'pending'
        AND expires_at > NOW()
    `);

    if (request.rows.length === 0) {
      return res.status(404).json({ error: "Request not found or already processed" });
    }

    // Update the request
    await db.execute(sql`
      UPDATE disclosure_requests 
      SET status = ${decision}, 
          decided_at = NOW(),
          updated_at = NOW()
      WHERE id = ${requestId}
    `);

    // Log the decision
    await db.execute(sql`
      INSERT INTO disclosure_audit_log (disclosure_request_id, action, actor_id, actor_type, metadata)
      VALUES (${requestId}, ${decision}, ${youthId}, 'youth', ${JSON.stringify({ decision })})
    `);

    res.json({ 
      success: true, 
      decision,
      message: decision === 'approved' 
        ? "Access granted. Parent can now view your demographics."
        : "Request denied. Your demographics remain private."
    });
  } catch (error) {
    logger.error({ err: error, context: 'disclosure-response' }, 'Disclosure response error');
    res.status(500).json({ error: "Failed to process response" });
  }
});

// Parent checks if they have access to youth demographics
router.get("/access/:youthId", requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;
    const { youthId } = req.params;

    // Verify parent is linked to this youth
    const isLinked = await verifyParentYouthLink(parentId, youthId);
    if (!isLinked) {
      return res.status(403).json({ error: "You are not linked to this youth" });
    }

    const approved = await db.execute(sql`
      SELECT id, decided_at FROM disclosure_requests
      WHERE parent_id = ${parentId}
        AND youth_id = ${youthId}
        AND status = 'approved'
      ORDER BY decided_at DESC
      LIMIT 1
    `);

    if (approved.rows.length > 0) {
      res.json({ 
        hasAccess: true, 
        grantedAt: approved.rows[0].decided_at 
      });
    } else {
      // Check if there's a pending request
      const pending = await db.execute(sql`
        SELECT id, requested_at FROM disclosure_requests
        WHERE parent_id = ${parentId}
          AND youth_id = ${youthId}
          AND status = 'pending'
          AND expires_at > NOW()
        LIMIT 1
      `);

      res.json({ 
        hasAccess: false,
        pendingRequest: pending.rows.length > 0 ? pending.rows[0] : null
      });
    }
  } catch (error) {
    logger.error({ err: error, context: 'disclosure-access-check' }, 'Access check error');
    res.status(500).json({ error: "Failed to check access" });
  }
});

// Youth views their disclosure history
router.get("/history", requireYouth, async (req, res) => {
  try {
    const youthId = req.session.userId;

    const history = await db.execute(sql`
      SELECT 
        dr.id,
        dr.status,
        dr.reason,
        dr.requested_at,
        dr.decided_at,
        p.email as parent_email
      FROM disclosure_requests dr
      LEFT JOIN parents p ON p.id = dr.parent_id
      WHERE dr.youth_id = ${youthId}
      ORDER BY dr.created_at DESC
      LIMIT 50
    `);

    res.json({ history: history.rows });
  } catch (error) {
    logger.error({ err: error, context: 'disclosure-history' }, 'Error fetching disclosure history');
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
