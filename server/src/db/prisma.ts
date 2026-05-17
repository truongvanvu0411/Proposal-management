import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getConfig } from '../config/env';

let pool: Pool | undefined;
let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!prisma) {
    const config = getConfig();
    pool = new Pool({ connectionString: config.databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}

export async function disconnectPrisma() {
  await prisma?.$disconnect();
  await pool?.end();
  prisma = undefined;
  pool = undefined;
}
