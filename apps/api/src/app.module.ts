import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { PrismaModule } from './common/prisma.module';
import { RolesGuard } from './common/roles.guard';
import { validateEnv } from './common/env';
import { AppThrottlerGuard } from './graphql/gql-throttler.guard';
import { CatalogGraphqlModule } from './graphql/graphql-api.module';
import { HealthController } from './health/health.controller';
import { MetricsModule } from './observability/metrics.module';
import { loggerParams } from './observability/logger';
import { LeadsModule } from './leads/leads.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './common/storage/storage.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Generous global default; auth endpoints tighten it with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    LoggerModule.forRoot(loggerParams()),
    MetricsModule,
    PrismaModule,
    StorageModule,
    AuditModule,
    VehiclesModule,
    SearchModule,
    CatalogGraphqlModule,
    LeadsModule,
    StatsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: throttle -> authenticate -> authorize.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
