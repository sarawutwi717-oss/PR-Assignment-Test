import { prisma } from '../src/lib/prisma';
import { seedPRs } from '../src/lib/db';

async function main() {
  const count = await seedPRs();
  console.log(count > 0
    ? `Seeded ${count} PR documents.`
    : 'Database already contains PR data; no seed changes made.');
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed the database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
