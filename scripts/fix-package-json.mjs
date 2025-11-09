import { readFileSync, writeFileSync } from "node:fs";

const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

pkg.scripts = pkg.scripts || {};

// Add production start script if not present
if (!pkg.scripts.start) {
  pkg.scripts.start = "NODE_ENV=production node server/index.js";
}

// Normalize dev ports to 5000 if using 5173
if (pkg.scripts["dev:client"]?.includes("5173")) {
  pkg.scripts["dev:client"] = pkg.scripts["dev:client"].replace("5173", "5000");
}

// Move drizzle-kit to devDependencies if in dependencies
pkg.devDependencies = pkg.devDependencies || {};
if (pkg.dependencies?.["drizzle-kit"]) {
  pkg.devDependencies["drizzle-kit"] = pkg.dependencies["drizzle-kit"];
  delete pkg.dependencies["drizzle-kit"];
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log("✅ package.json fixed:");
console.log("  - Added/verified production start script");
console.log("  - Normalized ports to 5000");
console.log("  - Moved drizzle-kit to devDependencies");
