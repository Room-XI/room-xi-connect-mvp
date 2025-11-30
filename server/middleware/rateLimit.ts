import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const authLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // 15 attempts per 15 minutes (production-hardened)
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later" },
});

export const adminLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Very strict for admin login
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many admin login attempts, please try again later" },
});

export const writeLimiter: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 200, // 200 requests per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});
