import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getConfig } from '../config/env';

let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!prisma) {
    const config = getConfig();
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl,
    });
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}

export async function disconnectPrisma() {
  await prisma?.$disconnect();
  prisma = undefined;
}
