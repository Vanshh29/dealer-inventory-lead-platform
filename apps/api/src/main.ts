import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { initSentry } from './observability/sentry';
import { configureApp } from './setup';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  initSentry();
  // bufferLogs: startup messages wait for pino instead of printing in Nest's default format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  setupSwagger(app);
  await app.listen(process.env.API_PORT ?? 4000, '0.0.0.0');
}
void bootstrap();
