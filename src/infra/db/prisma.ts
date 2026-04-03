import { ENV } from "../../config/env";
import { PrismaClient as PrismaClientCtor } from "../../generated/prisma/client";
import type { PrismaClient as PrismaClientType } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function buildConnectionString(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      "Invalid DATABASE_URL. Please provide a valid Postgres connection string.",
    );
  }

  const isSupabasePooler = /pooler\.supabase\.com$/i.test(parsed.hostname);
  if (isSupabasePooler && !parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }

  return parsed.toString();
}

const connectionString = buildConnectionString(ENV.DATABASE_URL);

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

export const prisma: PrismaClientType = new PrismaClientCtor({ adapter });
