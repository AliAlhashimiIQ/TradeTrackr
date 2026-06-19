// Cryptographic utility using the Web Crypto API, compatible with both browser and Node.js

const ENCRYPTION_KEY_RAW = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'tradetrackr-aes-256-encryption-key-32chars!';

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(ENCRYPTION_KEY_RAW);
  
  // Use SHA-256 to derive a consistent 256-bit key from the raw secret
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial);
  
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Returns a base64 encoded string containing the IV and ciphertext.
 */
export async function encryptPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    const enc = new TextEncoder();
    const key = await getKey();
    
    // Generate a cryptographically strong 12-byte initialization vector (IV)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(password)
    );
    
    // Package IV and encrypted data together
    const exported = new Uint8Array(iv.length + encrypted.byteLength);
    exported.set(iv, 0);
    exported.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to a base64 string safely
    return btoa(String.fromCharCode(...exported));
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts a base64 encoded ciphertext using AES-256-GCM.
 * If decryption fails (e.g. if the input is legacy plaintext), it returns the input string as a fallback.
 */
export async function decryptPassword(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return '';
  try {
    const key = await getKey();
    
    // Convert base64 back to Uint8Array
    const rawData = new Uint8Array(
      atob(encryptedBase64)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    if (rawData.length <= 12) {
      return encryptedBase64; // Fallback for legacy short plaintexts
    }
    
    const iv = rawData.slice(0, 12);
    const data = rawData.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    // Graceful fallback: return the original string if it is legacy plain-text
    return encryptedBase64;
  }
}
