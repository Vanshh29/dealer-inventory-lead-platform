import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Dealer Inventory & Lead Platform API')
    .setDescription('Auth uses httpOnly cookies set by POST /auth/login.')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, buildOpenApi(app), { jsonDocumentUrl: 'api/docs-json' });
}
