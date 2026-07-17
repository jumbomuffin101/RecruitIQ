import { execFileSync } from "node:child_process";
import { getTestDatabaseUrl } from "../tests/support/test-database";

const databaseUrl = getTestDatabaseUrl();
if (!databaseUrl) {
  throw new Error("DATABASE_URL_TEST is required. Refusing to reset any database.");
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const env = { ...process.env, DATABASE_URL: databaseUrl };

execFileSync(command, ["prisma", "migrate", "reset", "--force", "--skip-seed"], { stdio: "inherit", env });
execFileSync(command, ["tsx", "scripts/seed-test-db.ts"], { stdio: "inherit", env });
