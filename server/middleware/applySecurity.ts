import type { Express } from "express";
import { securityHeaders } from "./security.ts";

export function applySecurity(app: Express) {
  // Note: CSP currently uses 'unsafe-inline' for development compatibility.
  // Future enhancement: Implement CSP nonces for stricter security.
  // This requires generating per-request nonces and injecting them into
  // inline scripts/styles, which needs Vite plugin integration.
  app.use(securityHeaders);
}
