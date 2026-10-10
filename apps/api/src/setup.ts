import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { uploadsDir } from './common/storage/local-storage.service';
import { AllExceptionsFilter } from './common/http-exception.filter';

/** Shared by main.ts and the integration tests so tests exercise the real pipeline. */
export function configureApp(app: INestApplication): void {
  const express = app as NestExpressApplication;
  express.useBodyParser('json', { limit: '100kb' });
  // Images are loaded by the web app from another origin; Swagger UI needs inline scripts.
  const strict = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } });
  const docs = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api/docs') ? docs : strict)(req, res, next),
  );
  express.useStaticAssets(uploadsDir(), { prefix: '/uploads' });
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
