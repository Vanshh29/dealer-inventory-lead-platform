/** Fail fast at boot instead of failing on the first request. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = ['DATABASE_URL', 'JWT_ACCESS_SECRET'].filter((k) => !config[k]);
  if (missing.length > 0) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  if (String(config.JWT_ACCESS_SECRET).length < 16) {
    throw new Error('JWT_ACCESS_SECRET must be at least 16 characters');
  }
  return config;
}
