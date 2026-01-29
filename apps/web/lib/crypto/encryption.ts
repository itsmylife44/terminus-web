/**
 * AES-256-GCM Encryption Utilities
 *
 * Provides secure encryption/decryption for storing API keys and provider credentials.
 * Uses Node.js built-in crypto module with AES-256-GCM (authenticated encryption).
 *
 * Security features:
 * - AES-256-GCM: Symmetric authenticated encryption
 * - Per-record IV: Random 16-byte IV for each encryption (prevents pattern analysis)
 * - HKDF key derivation: Derives encryption key from master secret
 * - Auth tag: Ensures data integrity and authenticity (16 bytes)
 * - Master key: Retrieved from TERMINUS_MASTER_KEY environment variable (base64, 32 bytes)
 */

import { createCipheriv, createDecipheriv, randomBytes, hkdfSync } from 'crypto';

/**
 * Encrypted data structure containing all components needed for decryption
 */
export interface EncryptedData {
  /** AES-256-GCM encrypted ciphertext */
  cipherText: Buffer;
  /** Random 16-byte initialization vector (IV) */
  iv: Buffer;
  /** 16-byte authentication tag for integrity verification */
  authTag: Buffer;
}

/**
 * Get the master encryption key from environment
 * @throws Error if TERMINUS_MASTER_KEY is not set or invalid
 */
function getMasterKey(): Buffer {
  const masterKeyEnv = process.env.TERMINUS_MASTER_KEY;

  if (!masterKeyEnv) {
    throw new Error(
      'TERMINUS_MASTER_KEY environment variable not set. ' +
        'Provider credentials cannot be encrypted. ' +
        'Set TERMINUS_MASTER_KEY to a base64-encoded 32-byte key.'
    );
  }

  try {
    const masterKey = Buffer.from(masterKeyEnv, 'base64');
    if (masterKey.length !== 32) {
      throw new Error(
        `TERMINUS_MASTER_KEY must be exactly 32 bytes, got ${masterKey.length} bytes`
      );
    }
    return masterKey;
  } catch (error) {
    throw new Error(
      `Failed to decode TERMINUS_MASTER_KEY: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Derive encryption key from master key using HKDF
 * @param masterKey The master encryption key
 * @returns 32-byte derived key for AES-256-GCM
 */
function deriveKey(masterKey: Buffer): Buffer {
  // HKDF provides key material derivation
  // We use SHA-256 with empty salt (derive from master key only)
  // NOTE: hkdfSync returns ArrayBuffer | Buffer, but in Node.js environment
  // it always returns Buffer. Type assertion is safe and required due to
  // TypeScript's conservative typing of the crypto API.
  const derivedKey = hkdfSync(
    'sha256',
    masterKey,
    Buffer.alloc(0), // No salt (master key is the source)
    Buffer.from('TERMINUS_PROVIDER_CREDENTIALS'), // Domain separation context
    32 // 32 bytes for AES-256
  ) as unknown as Buffer;
  return derivedKey;
}

/**
 * Encrypt plaintext credential data
 *
 * @param plaintext The credential data to encrypt (API key, token, etc.)
 * @returns EncryptedData containing ciphertext, IV, and auth tag
 * @throws Error if TERMINUS_MASTER_KEY is not configured
 *
 * Example:
 * ```typescript
 * const encrypted = encryptCredential('sk-1234567890abcdef');
 * // Store encrypted.cipherText, encrypted.iv, encrypted.authTag in DB
 * ```
 */
export function encryptCredential(plaintext: string): EncryptedData {
  const masterKey = getMasterKey();
  const key = deriveKey(masterKey);

  // Generate random IV for this record (prevents pattern analysis)
  const iv = randomBytes(16);

  // Create cipher with AES-256-GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt the plaintext
  const part1 = cipher.update(plaintext, 'utf8');
  const part2 = cipher.final();
  const cipherText = Buffer.concat([part1, part2]);

  // Get authentication tag (16 bytes)
  const authTag = cipher.getAuthTag();

  return {
    cipherText,
    iv,
    authTag,
  };
}

/**
 * Decrypt an EncryptedData object back to plaintext
 *
 * @param encrypted The encrypted data containing ciphertext, IV, and auth tag
 * @returns The decrypted plaintext credential
 * @throws Error if TERMINUS_MASTER_KEY is not configured or authentication fails
 *
 * Example:
 * ```typescript
 * const decrypted = decryptCredential({
 *   cipherText: Buffer.from(...),
 *   iv: Buffer.from(...),
 *   authTag: Buffer.from(...)
 * });
 * // Use decrypted credential
 * ```
 */
export function decryptCredential(encrypted: EncryptedData): string {
  const masterKey = getMasterKey();
  const key = deriveKey(masterKey);

  // Create decipher with AES-256-GCM using the same IV
  const decipher = createDecipheriv('aes-256-gcm', key, encrypted.iv);

  // Set the authentication tag for verification
  decipher.setAuthTag(encrypted.authTag);

  try {
    // Decrypt the ciphertext
    const part1 = decipher.update(encrypted.cipherText);
    const part2 = decipher.final();
    const plaintext = Buffer.concat([part1, part2]).toString('utf8');

    return plaintext;
  } catch (error) {
    throw new Error(
      `Failed to decrypt credential: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'This may indicate data corruption or an incorrect master key.'
    );
  }
}
