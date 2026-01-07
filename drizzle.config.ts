import type { Config } from "drizzle-kit";

export default {
  schema: ["./server/schema.ts", "./server/schema.extras.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
