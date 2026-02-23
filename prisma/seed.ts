import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../src/generated/prisma/client';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

const DEFAULT_SUPERPOWER = {
  name: 'HTTP Fetcher',
  description: 'Call external APIs via HTTP.',
  content:
    'Uses http_call to perform curl-like requests and return responses.',
  tools: JSON.stringify(['http_call']),
  scripts: JSON.stringify([]),
};

const DEFAULT_AGENT = {
  name: 'Researcher Bot',
  basePrompt:
    'You are a helpful researcher. Use your superpower to answer questions.',
};

async function main() {
  const existing = await prisma.superpower.findFirst();
  if (existing) {
    console.log('Default data already present, skipping seed.');
    return;
  }

  const superpower = await prisma.superpower.create({
    data: DEFAULT_SUPERPOWER,
  });

  const agent = await prisma.agent.create({
    data: {
      ...DEFAULT_AGENT,
      superpowers: {
        create: [{ superpowerId: superpower.id }],
      },
    },
  });

  console.log('Seeded default superpower:', superpower.name);
  console.log('Seeded default agent:', agent.name);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
