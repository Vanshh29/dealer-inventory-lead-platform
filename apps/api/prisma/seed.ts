import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { generateVehicles } from './seed-data';

const prisma = new PrismaClient();

// Demo credentials for local development only. Override with SEED_PASSWORD; never reuse in production.
const password = process.env.SEED_PASSWORD ?? 'Passw0rd!Passw0rd!';

const users: { email: string; role: Role }[] = [
  { email: 'admin@dealer.test', role: 'ADMIN' },
  { email: 'sales@dealer.test', role: 'SALES' },
  { email: 'viewer@dealer.test', role: 'VIEWER' },
];

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { ...u, passwordHash },
    });
  }
  console.log(`Seeded ${users.length} users (one per role).`);

  const count = Number(process.env.SEED_VEHICLES ?? 240);
  const { vehicles, images } = generateVehicles(count);
  const CHUNK = 1000;
  for (let i = 0; i < vehicles.length; i += CHUNK) {
    await prisma.vehicle.createMany({ data: vehicles.slice(i, i + CHUNK), skipDuplicates: true });
  }
  for (let i = 0; i < images.length; i += CHUNK) {
    await prisma.vehicleImage.createMany({
      data: images.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  console.log(`Seeded ${count} vehicles with ${images.length} images (idempotent).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
