import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_SUPERPOWERS = [
  {
    name: 'HTTP Fetcher',
    description: 'Call external APIs via HTTP.',
    content: 'Uses http_call to perform curl-like requests and return responses.',
    tools: JSON.stringify(['http_call']),
    scripts: JSON.stringify([]),
  },
  {
    name: 'Product Catalogs',
    description: 'Search in product catalogs and retrieve product information.',
    content: `Use the query_files tool to search the product catalog.

Guidelines:
1. Always use query_files with the catalog file as context to search for products.
2. If no results are found, try making the query broader and search again.
3. Always consult the catalog even if the user repeats a similar question.
4. Include specific keywords in addition to the semantic question in your query.
5. Elaborate the query taking into account the conversation history. For example, if the user previously searched for a "red car", and now says "under 2 thousand", the new query should be "red car under 2000".`,
    tools: JSON.stringify(['query_files']),
    scripts: JSON.stringify([]),
  },
  {
    name: 'Appointment Scheduler',
    description: 'Schedule appointments and check availability.',
    content: `Use the run_script tool to schedule appointments.

Guidelines:
1. First run the 'checkAvailability' script to find available times.
2. Ask the user which time they prefer.
3. Once the user agrees on a time, run the 'bookAppointment' script.
4. If the booking fails, propose other available days from the availability check to the user.`,
    tools: JSON.stringify(['run_script']),
    scripts: JSON.stringify([
      {
        name: 'checkAvailability',
        content: `function main(params) {
  // Simple mock returning fixed available slots
  return { 
    success: true, 
    availableSlots: ["2026-03-01T10:00:00Z", "2026-03-02T15:00:00Z", "2026-03-05T09:00:00Z"] 
  };
}`,
      },
      {
        name: 'bookAppointment',
        content: `function main(params) {
  const { date } = params;
  if (!date) {
    return { success: false, error: "Date parameter is required" };
  }
  
  // Mock logic: fail if the date falls on a weekend
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return { success: false, error: "Invalid date format" };
  }
  
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  if (isWeekend) {
    return { success: false, error: "Cannot book appointments on weekends" };
  }
  
  return { success: true, message: "Appointment successfully booked for " + date };
}`,
      }
    ]),
  }
];

const DEFAULT_AGENT = {
  name: 'Assistant Bot',
  basePrompt:
    'You are a helpful assistant. Use your available skills to answer questions and perform tasks for the user.',
};

async function main() {
  const existing = await prisma.superpower.findFirst();
  if (existing) {
    console.log('Default data already present, skipping seed.');
    return;
  }

  const createdSuperpowers = [];
  for (const spData of DEFAULT_SUPERPOWERS) {
    const sp = await prisma.superpower.create({ data: spData });
    createdSuperpowers.push(sp);
    console.log('Seeded superpower:', sp.name);
  }

  const agent = await prisma.agent.create({
    data: {
      ...DEFAULT_AGENT,
      superpowers: {
        create: createdSuperpowers.map(sp => ({ superpowerId: sp.id })),
      },
    },
  });

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
