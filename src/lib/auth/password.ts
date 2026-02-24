import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const SALT_BYTES = 16;
const HASH_BYTES = 64;

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, HASH_BYTES).toString("hex");
  return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string) {
  if (!storedPassword.startsWith(`${HASH_PREFIX}:`)) {
    return secureEquals(password, storedPassword);
  }

  const [, salt, expectedHash] = storedPassword.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const candidateHash = scryptSync(password, salt, HASH_BYTES).toString("hex");
  return secureEquals(candidateHash, expectedHash);
}
