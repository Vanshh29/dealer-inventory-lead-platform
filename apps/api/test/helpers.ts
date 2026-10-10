import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LeadStatus, Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Roles } from '../src/common/decorators';
import { PrismaService } from '../src/common/prisma.service';
import { configureApp } from '../src/setup';
import { setupSwagger } from '../src/swagger';

export const PASSWORD = 'Sup3r-secret-pass!';

/** Probe routes that exist only in tests, to verify the role matrix through the real guards. */
@Controller('probe')
class RbacProbeController {
  @Get('any-authenticated') any() {
    return { ok: true };
  }
  @Get('admin') @Roles('ADMIN') admin() {
    return { ok: true };
  }
  @Get('sales') @Roles('SALES', 'ADMIN') sales() {
    return { ok: true };
  }
  @Get('read') @Roles('VIEWER', 'SALES', 'ADMIN') read() {
    return { ok: true };
  }
}

export async function createApp(opts: { swagger?: boolean } = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [RbacProbeController],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  if (opts.swagger) setupSwagger(app);
  await app.init();
  return app;
}

export async function resetDb(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.auditLog.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.vehicle.deleteMany(); // images cascade
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedUser(
  app: INestApplication,
  role: Role,
  email = `${role.toLowerCase()}@test.dev`,
) {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  return app.get(PrismaService).user.create({ data: { email, passwordHash, role } });
}

/** Returns a supertest agent that is logged in and keeps its cookies. */
export async function loginAs(app: INestApplication, role: Role) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/auth/login')
    .send({ email: `${role.toLowerCase()}@test.dev`, password: PASSWORD })
    .expect(200);
  return agent;
}

let vinCounter = 0;
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
export function nextVin(): string {
  let n = ++vinCounter;
  let s = '';
  for (let i = 0; i < 17; i++) {
    s = VIN_CHARS[n % VIN_CHARS.length] + s;
    n = Math.floor(n / VIN_CHARS.length);
  }
  return s;
}

export function vehicleData(
  overrides: Partial<Prisma.VehicleCreateInput> = {},
): Prisma.VehicleCreateInput {
  return {
    vin: nextVin(),
    make: 'Volkswagen',
    model: 'Golf',
    variant: '2.0 TDI',
    year: 2019,
    mileage: 60_000,
    priceCents: 1_500_000,
    fuel: 'DIESEL',
    gearbox: 'MANUAL',
    color: 'Black',
    description: 'Well maintained family hatchback',
    status: 'PUBLISHED',
    ...overrides,
  };
}

export function createVehicle(
  app: INestApplication,
  overrides: Partial<Prisma.VehicleCreateInput> = {},
) {
  return app.get(PrismaService).vehicle.create({ data: vehicleData(overrides) });
}

/** Smallest valid PNG (1x1). */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export function createLead(
  app: INestApplication,
  vehicleId: string | null,
  status: LeadStatus = 'NEW',
  overrides: Partial<Prisma.LeadUncheckedCreateInput> = {},
) {
  return app.get(PrismaService).lead.create({
    data: {
      vehicleId,
      status,
      name: 'Max Mustermann',
      email: 'max@example.com',
      message: 'Is this car still available?',
      ...overrides,
    },
  });
}
