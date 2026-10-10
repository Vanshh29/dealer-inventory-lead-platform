import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(','), credentials: true });
  await app.listen(process.env.API_PORT ?? 4000, '0.0.0.0');
}
void bootstrap();
