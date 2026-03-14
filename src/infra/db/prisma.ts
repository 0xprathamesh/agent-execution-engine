import { ENV } from "../../config/env";
import { PrismaClient as PrismaClientCtor } from "../../generated/prisma/client";
import type { PrismaClient as PrismaClientType } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma: PrismaClientType = new PrismaClientCtor({ adapter });

