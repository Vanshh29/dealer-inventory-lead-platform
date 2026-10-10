export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://dealer:dealer_dev_password@localhost:5432/dealer_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'test-secret-test-secret-test-secret';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.LEAD_RATE_LIMIT = '1000';
process.env.CORS_ORIGIN = 'http://localhost:3000';

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'dealer-uploads-'));
