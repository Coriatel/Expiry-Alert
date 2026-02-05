import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(secret: string, encoded: string | null | undefined): boolean {
  if (!encoded) return false;
  const [salt, expected] = encoded.split(':');
  if (!salt || !expected) return false;

  const actual = pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function randomToken(length = 24): string {
  return randomBytes(length).toString('hex');
}
