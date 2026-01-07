import express from "express";
import crypto from "crypto";
import { db } from "../db.js";
import { partnerOrganizations, consentDelegations, consentDelegationEvents } from "../schema.js";
import { eq, and } from "drizzle-orm";
import logger from "../logger.ts";

const router = express.Router();

const CONSENT_NOTICE_VERSION = "v1.0-partner-2025-01";

const VALID_SCOPES = [
  "field_trip",
  "photo_release", 
  "video_release",
  "medical_emergency",
  "program_participation",
  "transportation",
  "overnight_activity",
  "media_consent"
];

async function authenticatePartner(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Missing authentication",
      message: "Partner API requires Bearer token authentication"
    });
  }
  
  const clientId = req.headers["x-client-id"];
  const clientSecret = authHeader.slice(7);
  
  if (!clientId) {
    return res.status(401).json({
      error: "Missing client ID",
      message: "X-Client-ID header is required"
    });
  }
  
  try {
    const [partner] = await db
      .select()
      .from(partnerOrganizations)
      .where(eq(partnerOrganizations.clientId, clientId))
      .limit(1);
    
    if (!partner) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    if (partner.status !== "approved") {
      return res.status(403).json({ 
        error: "Partner not approved",
        message: "Your organization is pending approval or has been suspended"
      });
    }
    
    const secretHash = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");
    
    if (secretHash !== partner.clientSecretHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    req.partner = partner;
    next();
  } catch (error) {
    logger.error({ err: error, context: 'partner-consent-auth' }, 'Partner auth error');
    res.status(500).json({ error: "Authentication failed" });
  }
}

router.get("/health", (req, res) => {
  res.json({
    status: "available",
    version: CONSENT_NOTICE_VERSION,
    availableScopes: VALID_SCOPES,
    documentation: "https://roomxi.ca/developer/consent-api",
    message: "Room XI Connect Partner Consent API is ready for integration"
  });
});

router.get("/scopes", (req, res) => {
  res.json({
    scopes: VALID_SCOPES.map(scope => ({
      id: scope,
      name: scope.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      description: getScopeDescription(scope)
    }))
  });
});

function getScopeDescription(scope) {
  const descriptions = {
    field_trip: "Permission for youth to participate in off-site field trips",
    photo_release: "Permission to take and use photographs of the youth",
    video_release: "Permission to record video of the youth",
    medical_emergency: "Authorization to seek emergency medical treatment",
    program_participation: "General consent to participate in program activities",
    transportation: "Permission to transport the youth",
    overnight_activity: "Consent for overnight activities or camping",
    media_consent: "Permission for media interviews or publications"
  };
  return descriptions[scope] || "Consent scope for " + scope;
}

router.post("/consent-request", authenticatePartner, async (req, res) => {
  const { youthEmail, scopes, purposeDescription, eventName, eventDate, validUntil } = req.body;
  
  if (!youthEmail || !scopes || !purposeDescription) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["youthEmail", "scopes", "purposeDescription"]
    });
  }
  
  const invalidScopes = scopes.filter(s => !VALID_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    return res.status(400).json({
      error: "Invalid scopes",
      invalidScopes,
      validScopes: VALID_SCOPES
    });
  }
  
  const disallowedScopes = scopes.filter(s => 
    req.partner.allowedScopes && 
    req.partner.allowedScopes.length > 0 && 
    !req.partner.allowedScopes.includes(s)
  );
  
  if (disallowedScopes.length > 0) {
    return res.status(403).json({
      error: "Scope not allowed for your organization",
      disallowedScopes,
      yourAllowedScopes: req.partner.allowedScopes
    });
  }
  
  res.status(501).json({
    status: "not_implemented",
    message: "Consent request creation is not yet available. This endpoint will be activated when partner integrations go live.",
    requestId: crypto.randomUUID(),
    partnerName: req.partner.name,
    requestedScopes: scopes,
    nextSteps: [
      "Contact Room XI to activate your partner integration",
      "Provide your use case and expected volume",
      "Complete security review process"
    ]
  });
});

router.get("/consent-status/:delegationId", authenticatePartner, async (req, res) => {
  const { delegationId } = req.params;
  
  try {
    const [delegation] = await db
      .select()
      .from(consentDelegations)
      .where(and(
        eq(consentDelegations.id, delegationId),
        eq(consentDelegations.partnerId, req.partner.id)
      ))
      .limit(1);
    
    if (!delegation) {
      return res.status(404).json({ error: "Consent request not found" });
    }
    
    res.json({
      id: delegation.id,
      status: delegation.status,
      requestedScopes: delegation.requestedScopes,
      guardianDecision: delegation.guardianDecision,
      guardianDecisionAt: delegation.guardianDecisionAt,
      consentValidFrom: delegation.consentValidFrom,
      consentValidUntil: delegation.consentValidUntil,
      createdAt: delegation.createdAt
    });
  } catch (error) {
    logger.error({ err: error, context: 'partner-consent-status' }, 'Consent status error');
    res.status(500).json({ error: "Failed to retrieve consent status" });
  }
});

router.post("/consent-withdraw/:delegationId", authenticatePartner, async (req, res) => {
  const { delegationId } = req.params;
  const { reason } = req.body;
  
  res.status(501).json({
    status: "not_implemented",
    message: "Partner-initiated withdrawal is not yet available",
    delegationId
  });
});

router.get("/my-consents", authenticatePartner, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  try {
    let query = db
      .select({
        id: consentDelegations.id,
        status: consentDelegations.status,
        requestedScopes: consentDelegations.requestedScopes,
        purposeDescription: consentDelegations.purposeDescription,
        eventName: consentDelegations.eventName,
        eventDate: consentDelegations.eventDate,
        guardianDecision: consentDelegations.guardianDecision,
        createdAt: consentDelegations.createdAt
      })
      .from(consentDelegations)
      .where(eq(consentDelegations.partnerId, req.partner.id))
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const delegations = await query;
    
    res.json({
      delegations,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: delegations.length
      }
    });
  } catch (error) {
    logger.error({ err: error, context: 'partner-consent-list' }, 'List consents error');
    res.status(500).json({ error: "Failed to list consent requests" });
  }
});

export default router;
