import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Roles } from '../src/common/decorators';
import { PrismaService } from '../src/common/prisma.service';
import { configureApp } from '../src/setup';

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

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [RbacProbeController],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export async function resetDb(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
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
