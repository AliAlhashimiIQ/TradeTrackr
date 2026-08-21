import { describe, it, expect, beforeEach } from 'vitest';
import { resolveTradingViewUrl } from '@/lib/utils';
import { checkRateLimit } from '@/lib/apiAuth';
import { encryptPassword, decryptPassword } from '@/lib/crypto';

describe('Security Verification & Sanitization Suite', () => {
  describe('TradingView & Media URL Sanitization', () => {
    it('does not append raw JWT token in query strings for Supabase storage URLs', () => {
      const storageUrl = 'https://gfodubbocdhjckgiualw.supabase.co/storage/v1/object/public/trade-screenshots/user123/chart.png';
      const resolved = resolveTradingViewUrl(storageUrl);

      expect(resolved).not.toContain('token=');
      expect(resolved).toBe(`/api/media?url=${encodeURIComponent(storageUrl)}`);
    });

    it('transforms TradingView snapshot links safely into s3 images', () => {
      const tvLink = 'https://www.tradingview.com/x/aBcDeFg1/';
      const resolved = resolveTradingViewUrl(tvLink);
      expect(resolved).toBe('https://s3.tradingview.com/snapshots/a/aBcDeFg1.png');
    });

    it('handles empty or malformed URLs gracefully without crashing', () => {
      expect(resolveTradingViewUrl('')).toBe('');
      expect(resolveTradingViewUrl(null)).toBe('');
      expect(resolveTradingViewUrl(undefined)).toBe('');
    });
  });

  describe('Sliding-Window Rate Limiting', () => {
    it('allows requests within threshold and blocks excess requests with 429 reset window', () => {
      const testUserId = `test-user-${Date.now()}`;
      const maxRequests = 5;
      const windowMs = 5000;

      for (let i = 0; i < maxRequests; i++) {
        const status = checkRateLimit(testUserId, maxRequests, windowMs);
        expect(status.allowed).toBe(true);
        expect(status.remaining).toBe(maxRequests - 1 - i);
      }

      // Excess request must be blocked
      const blocked = checkRateLimit(testUserId, maxRequests, windowMs);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetIn).toBeGreaterThan(0);
    });
  });

  describe('AES-256 Broker Password Encryption', () => {
    beforeEach(() => {
      process.env.DB_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
    });

    it('encrypts and decrypts broker passwords correctly without plaintext leakage', async () => {
      const rawPassword = 'MetaTraderSecurePassword#2026!';
      const encrypted = await encryptPassword(rawPassword);

      // Ciphertext should not match plaintext
      expect(encrypted).not.toBe(rawPassword);
      expect(encrypted).toBeTruthy();

      const decrypted = await decryptPassword(encrypted);
      expect(decrypted).toBe(rawPassword);
    });

    it('handles empty password strings safely', async () => {
      expect(await encryptPassword('')).toBe('');
      expect(await decryptPassword('')).toBe('');
    });
  });
});
