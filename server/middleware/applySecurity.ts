import type { Express } from "express";
import { securityHeaders } from "./security.js";

export function applySecurity(app: Express) {
  // Apply security headers globally
  // Note: CSP uses 'unsafe-inline' and 'unsafe-eval' for development compatibility
  // TODO: Replace with nonces in production when feasible
  app.use(securityHeaders);
}
