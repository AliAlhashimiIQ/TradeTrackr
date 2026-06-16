/**
 * Input sanitization utilities for user-submitted content.
 * Strips HTML tags and dangerous characters from trade notes, tags, etc.
 */

/**
 * Strip HTML tags from a string.
 * This is a lightweight sanitizer — for full XSS protection, consider DOMPurify.
 */
export function stripHtml(input: string): string {
  if (!input) return input;
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
}

/**
 * Sanitize a trade note string.
 * Strips HTML, limits length, removes null bytes.
 */
export function sanitizeNote(note: string | undefined | null, maxLength = 5000): string {
  if (!note) return '';
  let cleaned = note
    .replace(/\0/g, '') // Remove null bytes
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, ''); // Remove remaining HTML tags
  
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  
  return cleaned.trim();
}

/**
 * Sanitize a tag string.
 * Strips HTML, limits length, removes special characters except basic punctuation.
 */
export function sanitizeTag(tag: string): string {
  if (!tag) return '';
  return tag
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s\-_.]/g, '') // Allow only word chars, spaces, hyphens, dots, underscores
    .trim()
    .slice(0, 50); // Max 50 chars per tag
}

/**
 * Sanitize an array of tags.
 */
export function sanitizeTags(tags: string[] | undefined | null): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map(sanitizeTag)
    .filter(t => t.length > 0)
    .slice(0, 20); // Max 20 tags per trade
}

/**
 * Sanitize a strategy name.
 */
export function sanitizeStrategy(strategy: string | undefined | null): string | null {
  if (!strategy) return null;
  return stripHtml(strategy).slice(0, 100).trim() || null;
}

/**
 * Validate and sanitize all user-editable fields on a trade object.
 * Call this before saving to the database.
 */
export function sanitizeTradeInput(trade: Record<string, any>): Record<string, any> {
  const sanitized = { ...trade };
  
  if (sanitized.notes !== undefined) {
    sanitized.notes = sanitizeNote(sanitized.notes);
  }
  
  if (sanitized.tags !== undefined) {
    sanitized.tags = sanitizeTags(sanitized.tags);
  }
  
  if (sanitized.strategy !== undefined) {
    sanitized.strategy = sanitizeStrategy(sanitized.strategy);
  }
  
  if (sanitized.mistakes !== undefined && Array.isArray(sanitized.mistakes)) {
    sanitized.mistakes = sanitized.mistakes
      .map((m: string) => stripHtml(m).slice(0, 200))
      .filter((m: string) => m.length > 0)
      .slice(0, 10);
  }
  
  if (sanitized.emotional_state !== undefined) {
    sanitized.emotional_state = stripHtml(sanitized.emotional_state || '').slice(0, 50) || null;
  }
  
  return sanitized;
}
