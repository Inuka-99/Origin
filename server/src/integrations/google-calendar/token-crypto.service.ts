/**
 * token-crypto.service.ts
 *
 * AES-256-GCM at-rest encryption for Google OAuth tokens. Keeps the
 * encryption boundary inside the NestJS process so refresh tokens are
 * never readable by anyone with raw DB access.
 *
 * Storage format: base64("nonce(12) || ciphertext || authTag(16)").
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class TokenCryptoService {
  private readonly logger = new Logger(TokenCryptoService.name);
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.getOrThrow<string>('GCAL_TOKEN_ENC_KEY');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error(
        `GCAL_TOKEN_ENC_KEY must be a 32-byte base64 string (got ${key.length} bytes)`,
      );
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALGO, this.key, nonce) as CipherGCM;
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([nonce, ct, tag]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < NONCE_BYTES + TAG_BYTES) {
      throw new Error('ciphertext too short');
    }
    const nonce = buf.subarray(0, NONCE_BYTES);
    const tag = buf.subarray(buf.length - TAG_BYTES);
    const ct = buf.subarray(NONCE_BYTES, buf.length - TAG_BYTES);
    const decipher = createDecipheriv(ALGO, this.key, nonce) as DecipherGCM;
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}
