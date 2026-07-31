import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().optional().default('3500').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().min(32, { message: 'SESSION_SECRET must be at least 32 characters long.' }),
  OWNER_EMAIL: z.string().email().optional().or(z.literal('')),
  ALLOWED_EMAILS: z.string().optional().default(''),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  BASE_URL: z.string().url().optional().default('http://localhost:3500')
});

export function validateEnv() {
  // test 모드나 development 모드에서 SESSION_SECRET 미지정 시 안전한 32자 기본값 주입
  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[FATAL SECURITY ERROR] SESSION_SECRET environment variable is missing in production!');
      process.exit(1);
    } else {
      process.env.SESSION_SECRET = 'mytok-dev-session-secret-key-32-chars-long!';
    }
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[FATAL] Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
